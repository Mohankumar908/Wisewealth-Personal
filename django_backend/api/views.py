import os
import json
import secrets
import time
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import (
    WealthUser, InvestmentPlan, Expense, Budget, Asset, Liability,
    hash_password, generate_salt
)
from .auth import generate_token, verify_token, authenticate_token, authenticate_admin
from .finance import (
    calculate_compound_interest, calculate_sip, calculate_goal_sip,
    calculate_inflation, calculate_stepup_sip
)

def parse_json_body(request):
    try:
        return json.loads(request.body.decode('utf-8'))
    except Exception:
        return {}

# ==========================================
# AUTHENTICATION VIEWS
# ==========================================

@csrf_exempt
@require_http_methods(["POST"])
def register_view(request):
    data = parse_json_body(request)
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    confirm_password = data.get('confirmPassword', '')

    errors = {}
    if not name:
        errors['name'] = 'Full name is required.'
    if not email:
        errors['email'] = 'Email address is required.'
    if not password:
        errors['password'] = 'Password is required.'
    if password != confirm_password:
        errors['confirmPassword'] = 'Passwords do not match.'

    if errors:
        return JsonResponse({'success': False, 'message': 'Validation failed', 'errors': errors}, status=400)

    if WealthUser.objects.filter(email__iexact=email).exists():
        return JsonResponse({'success': False, 'message': 'User with this email already exists.'}, status=400)

    names = name.split(' ')
    first_name = names[0]
    last_name = ' '.join(names[1:]) if len(names) > 1 else ''

    salt = generate_salt()
    pwd_hash = hash_password(password, salt)
    user_id = secrets.token_hex(8)

    user = WealthUser.objects.create(
        id=user_id,
        email=email,
        username=email.split('@')[0],
        first_name=first_name,
        last_name=last_name,
        password_hash=pwd_hash,
        salt=salt,
        role='client',
        is_staff=False,
        is_active=True,
    )

    token = generate_token({'id': user.id, 'email': user.email})
    return JsonResponse({
        'success': True,
        'message': 'Registration successful',
        'data': {
            'token': token,
            'user': user.to_dict(),
        }
    }, status=201)

@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    data = parse_json_body(request)
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    portal = data.get('portal', '')

    if not email or not password:
        return JsonResponse({'success': False, 'message': 'Email and password are required.'}, status=400)

    user = WealthUser.objects.filter(email__iexact=email).first()
    if not user:
        return JsonResponse({'success': False, 'message': 'Invalid email or password.'}, status=401)

    computed_hash = hash_password(password, user.salt)
    if computed_hash != user.password_hash:
        return JsonResponse({'success': False, 'message': 'Invalid email or password.'}, status=401)

    if not user.is_active:
        return JsonResponse({'success': False, 'message': 'This account has been suspended by an administrator.'}, status=403)

    is_admin = user.is_staff or user.role == 'admin'

    # Strict separate access check: if portal is 'admin', only mohanvkumar8866@gmail.com can log in
    if portal == 'admin':
        if not is_admin or user.email.lower() != 'mohanvkumar8866@gmail.com':
            return JsonResponse({
                'success': False,
                'message': 'Access Denied: Administrative privileges required. Only authorized administrator can access this portal.',
            }, status=403)

    token = generate_token({'id': user.id, 'email': user.email})
    return JsonResponse({
        'success': True,
        'message': f"{'Administrator' if is_admin else 'Client'} login successful",
        'data': {
            'token': token,
            'user': user.to_dict(),
        }
    }, status=200)

@csrf_exempt
@require_http_methods(["POST"])
def refresh_token_view(request):
    data = parse_json_body(request)
    token = data.get('token')
    if not token:
        return JsonResponse({'success': False, 'message': 'Token is required.'}, status=400)

    payload = verify_token(token)
    if not payload:
        return JsonResponse({'success': False, 'message': 'Invalid or expired token.'}, status=403)

    new_token = generate_token({'id': payload['id'], 'email': payload.get('email', '')})
    return JsonResponse({
        'success': True,
        'message': 'Token refreshed successfully',
        'data': {'token': new_token},
    }, status=200)

@csrf_exempt
@authenticate_token
def profile_view(request):
    user = request.user_obj
    if request.method == 'GET':
        return JsonResponse({
            'success': True,
            'message': 'Profile retrieved successfully',
            'data': user.to_dict(),
        }, status=200)

    if request.method == 'PUT':
        data = parse_json_body(request)
        new_email = data.get('email', '').strip().lower()
        if new_email and new_email != user.email.lower():
            if WealthUser.objects.filter(email__iexact=new_email).exclude(id=user.id).exists():
                return JsonResponse({'success': False, 'message': 'Email is already taken.'}, status=400)
            user.email = new_email

        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        user.save()

        return JsonResponse({
            'success': True,
            'message': 'Profile updated successfully',
            'data': user.to_dict(),
        }, status=200)

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

# ==========================================
# CALCULATOR VIEWS
# ==========================================

@csrf_exempt
@require_http_methods(["POST"])
def compound_calc_view(request):
    data = parse_json_body(request)
    try:
        principal = float(data.get('principal', 0))
        rate = float(data.get('rate', 0))
        duration = int(data.get('duration', 0))
        frequency = data.get('frequency', 'annually')
        inflation_rate = float(data.get('inflationRate', 0))

        result = calculate_compound_interest(principal, rate, duration, frequency, inflation_rate)
        return JsonResponse({
            'success': True,
            'message': 'Compound interest calculated successfully',
            'data': result,
        }, status=200)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def sip_calc_view(request):
    data = parse_json_body(request)
    try:
        monthly_sip = float(data.get('monthlySip', 0))
        rate = float(data.get('rate', 0))
        duration = int(data.get('duration', 0))
        inflation_rate = float(data.get('inflationRate', 0))

        result = calculate_sip(monthly_sip, rate, duration, inflation_rate)
        return JsonResponse({
            'success': True,
            'message': 'SIP calculated successfully',
            'data': result,
        }, status=200)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def goal_calc_view(request):
    data = parse_json_body(request)
    try:
        target_amount = float(data.get('targetAmount', 0))
        rate = float(data.get('rate', 0))
        duration = int(data.get('duration', 0))
        inflation_rate = float(data.get('inflationRate', 0))

        result = calculate_goal_sip(target_amount, rate, duration, inflation_rate)
        return JsonResponse({
            'success': True,
            'message': 'Goal planning completed successfully',
            'data': result,
        }, status=200)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def inflation_calc_view(request):
    data = parse_json_body(request)
    try:
        future_amount = float(data.get('futureAmount', 0))
        inflation_rate = float(data.get('inflationRate', 0))
        duration = int(data.get('duration', 0))

        result = calculate_inflation(future_amount, inflation_rate, duration)
        return JsonResponse({
            'success': True,
            'message': 'Inflation adjusted equivalent computed successfully',
            'data': result,
        }, status=200)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def stepup_calc_view(request):
    data = parse_json_body(request)
    try:
        initial_sip = float(data.get('initialSip', 0))
        annual_increment_percent = float(data.get('annualIncrementPercent', 0))
        duration = int(data.get('duration', 0))
        rate = float(data.get('rate', 0))
        inflation_rate = float(data.get('inflationRate', 0))

        result = calculate_stepup_sip(initial_sip, annual_increment_percent, duration, rate, inflation_rate)
        return JsonResponse({
            'success': True,
            'message': 'Step-up SIP calculated successfully',
            'data': result,
        }, status=200)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)

# ==========================================
# INVESTMENT PLANS CRUD
# ==========================================

@csrf_exempt
@authenticate_token
def plans_list_create_view(request):
    user = request.user_obj
    if request.method == 'GET':
        plans = InvestmentPlan.objects.filter(user=user).order_by('-created_at')
        return JsonResponse({
            'success': True,
            'message': 'Plans retrieved successfully',
            'data': [p.to_dict() for p in plans],
        }, status=200)

    if request.method == 'POST':
        data = parse_json_body(request)
        name = data.get('name')
        plan_type = data.get('type')
        financial_detail = data.get('financial_detail')
        projections = data.get('projections')

        if not name or not plan_type or financial_detail is None or projections is None:
            return JsonResponse({'success': False, 'message': 'Missing required plan properties.'}, status=400)

        plan = InvestmentPlan.objects.create(
            id=secrets.token_hex(8),
            user=user,
            name=name,
            type=plan_type,
            financial_detail=financial_detail,
            projections=projections,
        )
        return JsonResponse({
            'success': True,
            'message': 'Investment plan saved successfully',
            'data': plan.to_dict(),
        }, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

@csrf_exempt
@authenticate_token
def plan_detail_view(request, plan_id):
    user = request.user_obj
    plan = InvestmentPlan.objects.filter(id=plan_id, user=user).first()
    if not plan:
        return JsonResponse({'success': False, 'message': 'Investment plan not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({
            'success': True,
            'message': 'Plan retrieved successfully',
            'data': plan.to_dict(),
        }, status=200)

    if request.method == 'PUT':
        data = parse_json_body(request)
        if 'name' in data:
            plan.name = data['name']
        if 'type' in data:
            plan.type = data['type']
        if 'financial_detail' in data:
            plan.financial_detail = data['financial_detail']
        if 'projections' in data:
            plan.projections = data['projections']
        plan.save()

        return JsonResponse({
            'success': True,
            'message': 'Investment plan updated successfully',
            'data': plan.to_dict(),
        }, status=200)

    if request.method == 'DELETE':
        plan.delete()
        return JsonResponse({
            'success': True,
            'message': 'Investment plan deleted successfully',
        }, status=200)

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

# ==========================================
# EXPENSES & BUDGETS
# ==========================================

def recalculate_budget_spend(user, category, date_str):
    try:
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except Exception:
        dt = datetime.now()
    month = dt.month
    year = dt.year

    budget = Budget.objects.filter(user=user, category__iexact=category, month=month, year=year).first()
    if not budget:
        return

    # Sum all matching expenses for this month/year
    all_expenses = Expense.objects.filter(user=user, category__iexact=category)
    total = 0.0
    for e in all_expenses:
        try:
            edt = datetime.fromisoformat(e.transaction_date.replace('Z', '+00:00'))
            if edt.month == month and edt.year == year:
                total += e.amount
        except Exception:
            pass
    budget.current_spend = total
    budget.save()

@csrf_exempt
@authenticate_token
def expenses_list_create_view(request):
    user = request.user_obj
    if request.method == 'GET':
        expenses = Expense.objects.filter(user=user).order_by('-transaction_date')
        return JsonResponse({
            'success': True,
            'message': 'Expenses retrieved successfully',
            'data': [e.to_dict() for e in expenses],
        }, status=200)

    if request.method == 'POST':
        data = parse_json_body(request)
        category = data.get('category')
        amount = data.get('amount')
        description = data.get('description', '')
        transaction_date = data.get('transaction_date')

        if not category or amount is None or not description or not transaction_date:
            return JsonResponse({'success': False, 'message': 'Missing required expense fields.'}, status=400)

        expense = Expense.objects.create(
            id=secrets.token_hex(8),
            user=user,
            category=category,
            amount=float(amount),
            description=description,
            transaction_date=transaction_date,
        )
        recalculate_budget_spend(user, category, transaction_date)

        return JsonResponse({
            'success': True,
            'message': 'Expense added successfully',
            'data': expense.to_dict(),
        }, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

@csrf_exempt
@authenticate_token
def expense_detail_view(request, expense_id):
    user = request.user_obj
    expense = Expense.objects.filter(id=expense_id, user=user).first()
    if not expense:
        return JsonResponse({'success': False, 'message': 'Expense not found or unauthorized.'}, status=404)

    if request.method == 'PUT':
        data = parse_json_body(request)
        orig_cat = expense.category
        orig_date = expense.transaction_date

        if 'category' in data:
            expense.category = data['category']
        if 'amount' in data:
            expense.amount = float(data['amount'])
        if 'description' in data:
            expense.description = data['description']
        if 'transaction_date' in data:
            expense.transaction_date = data['transaction_date']
        expense.save()

        recalculate_budget_spend(user, orig_cat, orig_date)
        if expense.category != orig_cat or expense.transaction_date != orig_date:
            recalculate_budget_spend(user, expense.category, expense.transaction_date)

        return JsonResponse({
            'success': True,
            'message': 'Expense updated successfully',
            'data': expense.to_dict(),
        }, status=200)

    if request.method == 'DELETE':
        orig_cat = expense.category
        orig_date = expense.transaction_date
        expense.delete()
        recalculate_budget_spend(user, orig_cat, orig_date)
        return JsonResponse({
            'success': True,
            'message': 'Expense deleted successfully',
        }, status=200)

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

@csrf_exempt
@authenticate_token
def budgets_list_create_view(request):
    user = request.user_obj
    if request.method == 'GET':
        budgets = Budget.objects.filter(user=user)
        return JsonResponse({
            'success': True,
            'message': 'Budgets retrieved successfully',
            'data': [b.to_dict() for b in budgets],
        }, status=200)

    if request.method == 'POST':
        data = parse_json_body(request)
        category = data.get('category')
        monthly_limit = data.get('monthly_limit')
        month = data.get('month')
        year = data.get('year')

        if not category or monthly_limit is None or month is None or year is None:
            return JsonResponse({'success': False, 'message': 'Missing required budget fields.'}, status=400)

        budget, created = Budget.objects.get_or_create(
            user=user,
            category__iexact=category,
            month=int(month),
            year=int(year),
            defaults={
                'id': secrets.token_hex(8),
                'category': category,
                'monthly_limit': float(monthly_limit),
                'current_spend': 0.0,
            }
        )
        if not created:
            budget.monthly_limit = float(monthly_limit)
            budget.save()

        recalculate_budget_spend(user, category, f"{year}-{int(month):02d}-15")
        budget.refresh_from_db()

        return JsonResponse({
            'success': True,
            'message': 'Budget standard secured successfully',
            'data': budget.to_dict(),
        }, status=200)

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

# ==========================================
# ASSETS & LIABILITIES
# ==========================================

@csrf_exempt
@authenticate_token
def assets_list_create_view(request):
    user = request.user_obj
    if request.method == 'GET':
        assets = Asset.objects.filter(user=user)
        return JsonResponse({
            'success': True,
            'message': 'Assets retrieved successfully',
            'data': [a.to_dict() for a in assets],
        }, status=200)

    if request.method == 'POST':
        data = parse_json_body(request)
        asset_type = data.get('asset_type')
        name = data.get('name')
        value = data.get('value')

        if not asset_type or not name or value is None:
            return JsonResponse({'success': False, 'message': 'Missing required asset fields.'}, status=400)

        asset = Asset.objects.create(
            id=secrets.token_hex(8),
            user=user,
            asset_type=asset_type,
            name=name,
            value=float(value),
        )
        return JsonResponse({
            'success': True,
            'message': 'Asset recorded successfully',
            'data': asset.to_dict(),
        }, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

@csrf_exempt
@authenticate_token
def asset_detail_view(request, asset_id):
    user = request.user_obj
    asset = Asset.objects.filter(id=asset_id, user=user).first()
    if not asset:
        return JsonResponse({'success': False, 'message': 'Asset not found or unauthorized.'}, status=404)

    if request.method == 'DELETE':
        asset.delete()
        return JsonResponse({
            'success': True,
            'message': 'Asset deleted successfully',
        }, status=200)

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

@csrf_exempt
@authenticate_token
def liabilities_list_create_view(request):
    user = request.user_obj
    if request.method == 'GET':
        liabs = Liability.objects.filter(user=user)
        return JsonResponse({
            'success': True,
            'message': 'Liabilities retrieved successfully',
            'data': [l.to_dict() for l in liabs],
        }, status=200)

    if request.method == 'POST':
        data = parse_json_body(request)
        liab_type = data.get('liability_type')
        name = data.get('name')
        amount_remaining = data.get('amount_remaining')
        interest_rate = data.get('interest_rate')

        if not liab_type or not name or amount_remaining is None or interest_rate is None:
            return JsonResponse({'success': False, 'message': 'Missing required liability fields.'}, status=400)

        liab = Liability.objects.create(
            id=secrets.token_hex(8),
            user=user,
            liability_type=liab_type,
            name=name,
            amount_remaining=float(amount_remaining),
            interest_rate=float(interest_rate),
        )
        return JsonResponse({
            'success': True,
            'message': 'Liability recorded successfully',
            'data': liab.to_dict(),
        }, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

@csrf_exempt
@authenticate_token
def liability_detail_view(request, liability_id):
    user = request.user_obj
    liab = Liability.objects.filter(id=liability_id, user=user).first()
    if not liab:
        return JsonResponse({'success': False, 'message': 'Liability not found or unauthorized.'}, status=404)

    if request.method == 'DELETE':
        liab.delete()
        return JsonResponse({
            'success': True,
            'message': 'Liability deleted successfully',
        }, status=200)

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

# ==========================================
# AI INSIGHTS
# ==========================================

_ai_cache = {}

@csrf_exempt
@authenticate_token
@require_http_methods(["POST"])
def ai_insights_view(request):
    user = request.user_obj
    user_id = user.id
    now = time.time()

    cached = _ai_cache.get(user_id)
    if cached and (now - cached['timestamp'] < 180):
        return JsonResponse({
            'success': True,
            'message': 'Retrieved intelligent AI insights (cached)',
            'data': cached['data'],
        }, status=200)

    assets = list(Asset.objects.filter(user=user))
    liabs = list(Liability.objects.filter(user=user))
    plans = list(InvestmentPlan.objects.filter(user=user))

    total_assets = sum(a.value for a in assets)
    total_liab = sum(l.amount_remaining for l in liabs)
    net_worth = total_assets - total_liab

    fallbacks = [
        {
            "title": "Liquidity Ratio Standard",
            "message": f"Your current liquid assets total ${total_assets:,.0f}. Keeping 3-6 months of expenses in high-interest accounts is recommended for emergency protection.",
            "type": "info",
            "impact": "High Impact"
        },
        {
            "title": "Asset-Liability Alignment",
            "message": f"Positive net worth of ${net_worth:,.0f}. Your assets exceed liabilities by {(total_assets / max(1.0, total_liab)):.1f}x. Consider prepaying any high APR loans." if net_worth >= 0 else f"Attention required: Net worth is currently negative at ${net_worth:,.0f}. Prioritize credit card or short-term debt repayments.",
            "type": "success" if net_worth >= 0 else "alert",
            "impact": "High Impact"
        },
        {
            "title": "Compounding Growth Velocity",
            "message": f"You have {len(plans)} active wealth plans. Your compounding velocity is active. Review step-up increments annually to accelerate target dates." if plans else "No wealth projection plans saved yet. Navigate to Interactive Calculators to set up your first retirement, education, or house planning compounding models.",
            "type": "tip",
            "impact": "Medium Impact"
        }
    ]

    _ai_cache[user_id] = {'timestamp': now, 'data': fallbacks}
    return JsonResponse({
        'success': True,
        'message': 'Retrieved personalized analytical insights',
        'data': fallbacks,
    }, status=200)

# ==========================================
# ADMIN MANAGEMENT VIEWS
# ==========================================

_start_time = time.time()

@csrf_exempt
@authenticate_admin
@require_http_methods(["GET"])
def admin_overview_view(request):
    total_users = WealthUser.objects.count()
    total_admins = WealthUser.objects.filter(role='admin').count() + WealthUser.objects.filter(is_staff=True).exclude(role='admin').count()
    total_clients = total_users - total_admins
    total_plans = InvestmentPlan.objects.count()
    total_expenses = Expense.objects.count()
    total_assets_tracked = sum(a.value for a in Asset.objects.all())
    total_liabilities_tracked = sum(l.amount_remaining for l in Liability.objects.all())
    active_users = WealthUser.objects.filter(is_active=True).count()
    active_rate = round((active_users / total_users) * 100) if total_users > 0 else 100

    overview = {
        'totalUsers': total_users,
        'totalClients': total_clients,
        'totalAdmins': total_admins,
        'totalPlans': total_plans,
        'totalExpenses': total_expenses,
        'totalAssetsTracked': total_assets_tracked,
        'totalLiabilitiesTracked': total_liabilities_tracked,
        'systemUptime': int(time.time() - _start_time),
        'activeRate': active_rate,
    }
    return JsonResponse({
        'success': True,
        'message': 'System overview retrieved successfully',
        'data': overview,
    }, status=200)

@csrf_exempt
@authenticate_admin
@require_http_methods(["GET"])
def admin_users_view(request):
    users = WealthUser.objects.all().order_by('-created_at')
    result = [u.to_dict(include_counts=True) for u in users]
    return JsonResponse({
        'success': True,
        'message': 'Client and admin directory retrieved successfully',
        'data': result,
    }, status=200)

@csrf_exempt
@authenticate_admin
@require_http_methods(["PATCH"])
def admin_user_status_view(request, user_id):
    if user_id == request.user_obj.id:
        return JsonResponse({'success': False, 'message': 'Administrators cannot modify their own active status.'}, status=400)

    target_user = WealthUser.objects.filter(id=user_id).first()
    if not target_user:
        return JsonResponse({'success': False, 'message': 'User not found.'}, status=404)

    data = parse_json_body(request)
    is_active = bool(data.get('is_active', True))
    target_user.is_active = is_active
    target_user.save()

    return JsonResponse({
        'success': True,
        'message': f"User status updated to {'Active' if is_active else 'Suspended'}.",
    }, status=200)

@csrf_exempt
@authenticate_admin
@require_http_methods(["PATCH"])
def admin_user_role_view(request, user_id):
    if user_id == request.user_obj.id:
        return JsonResponse({'success': False, 'message': 'Administrators cannot modify their own role.'}, status=400)

    target_user = WealthUser.objects.filter(id=user_id).first()
    if not target_user:
        return JsonResponse({'success': False, 'message': 'User not found.'}, status=404)

    data = parse_json_body(request)
    role = data.get('role')
    if role not in ['admin', 'client']:
        return JsonResponse({'success': False, 'message': 'Invalid role. Must be "admin" or "client".'}, status=400)

    target_user.role = role
    target_user.is_staff = (role == 'admin')
    target_user.save()

    return JsonResponse({
        'success': True,
        'message': f"User role successfully updated to {role}.",
    }, status=200)

@csrf_exempt
@authenticate_admin
@require_http_methods(["DELETE"])
def admin_user_delete_view(request, user_id):
    if user_id == request.user_obj.id:
        return JsonResponse({'success': False, 'message': 'Administrators cannot delete their own account.'}, status=400)

    target_user = WealthUser.objects.filter(id=user_id).first()
    if not target_user:
        return JsonResponse({'success': False, 'message': 'User not found.'}, status=404)

    target_user.delete()
    return JsonResponse({
        'success': True,
        'message': 'User and all associated portfolios removed successfully.',
    }, status=200)

@csrf_exempt
@authenticate_admin
@require_http_methods(["GET"])
def admin_plans_view(request):
    plans = InvestmentPlan.objects.select_related('user').all().order_by('-created_at')
    result = []
    for p in plans:
        u = p.user
        author_name = f"{u.first_name} {u.last_name}".strip() if u else 'Unknown Client'
        if not author_name and u:
            author_name = u.username
        result.append({
            **p.to_dict(),
            'author_name': author_name or 'Unknown Client',
            'author_email': u.email if u else 'Unknown Email',
        })

    return JsonResponse({
        'success': True,
        'message': 'All client investment plans retrieved successfully',
        'data': result,
    }, status=200)
