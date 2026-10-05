from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('auth/register', views.register_view, name='register'),
    path('auth/login', views.login_view, name='login'),
    path('auth/token/refresh', views.refresh_token_view, name='token_refresh'),
    path('auth/profile', views.profile_view, name='profile'),

    # Calculators
    path('finance/calculate/compound', views.compound_calc_view, name='calculate_compound'),
    path('finance/calculate/sip', views.sip_calc_view, name='calculate_sip'),
    path('finance/calculate/goal', views.goal_calc_view, name='calculate_goal'),
    path('finance/calculate/inflation', views.inflation_calc_view, name='calculate_inflation'),
    path('finance/calculate/stepup', views.stepup_calc_view, name='calculate_stepup'),

    # Plans
    path('plans', views.plans_list_create_view, name='plans_list_create'),
    path('plans/<str:plan_id>', views.plan_detail_view, name='plan_detail'),

    # Expenses
    path('expenses', views.expenses_list_create_view, name='expenses_list_create'),
    path('expenses/<str:expense_id>', views.expense_detail_view, name='expense_detail'),

    # Budgets
    path('budgets', views.budgets_list_create_view, name='budgets_list_create'),

    # Assets & Liabilities
    path('assets', views.assets_list_create_view, name='assets_list_create'),
    path('assets/<str:asset_id>', views.asset_detail_view, name='asset_detail'),
    path('liabilities', views.liabilities_list_create_view, name='liabilities_list_create'),
    path('liabilities/<str:liability_id>', views.liability_detail_view, name='liability_detail'),

    # AI Insights
    path('ai/insights', views.ai_insights_view, name='ai_insights'),

    # Admin Portal
    path('admin/overview', views.admin_overview_view, name='admin_overview'),
    path('admin/users', views.admin_users_view, name='admin_users'),
    path('admin/users/<str:user_id>/status', views.admin_user_status_view, name='admin_user_status'),
    path('admin/users/<str:user_id>/role', views.admin_user_role_view, name='admin_user_role'),
    path('admin/users/<str:user_id>', views.admin_user_delete_view, name='admin_user_delete'),
    path('admin/plans', views.admin_plans_view, name='admin_plans'),
]
