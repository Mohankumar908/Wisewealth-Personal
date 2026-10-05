import hashlib
import secrets
from django.db import models
from django.utils import timezone

def hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 1000, 64).hex()

def generate_salt() -> str:
    return secrets.token_hex(16)

class WealthUser(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150)
    first_name = models.CharField(max_length=150, blank=True, default='')
    last_name = models.CharField(max_length=150, blank=True, default='')
    password_hash = models.CharField(max_length=256)
    salt = models.CharField(max_length=64)
    role = models.CharField(max_length=30, default='client')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def to_dict(self, include_counts=False):
        data = {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'role': 'admin' if (self.is_staff or self.role == 'admin') else 'client',
            'is_active': self.is_active,
            'is_staff': self.is_staff,
            'created_at': self.created_at.isoformat() if hasattr(self.created_at, 'isoformat') else str(self.created_at),
            'updated_at': self.updated_at.isoformat() if hasattr(self.updated_at, 'isoformat') else str(self.updated_at),
        }
        if include_counts:
            plans_cnt = self.plans.count()
            expenses_cnt = self.expenses.count()
            assets_cnt = self.assets.count()
            liabs_cnt = self.liabilities.count()
            total_assets = sum(a.value for a in self.assets.all())
            total_liabs = sum(l.amount_remaining for l in self.liabilities.all())
            data.update({
                'planCount': plans_cnt,
                'expenseCount': expenses_cnt,
                'assetCount': assets_cnt,
                'liabilityCount': liabs_cnt,
                'netWorth': total_assets - total_liabs,
            })
        return data

class InvestmentPlan(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    user = models.ForeignKey(WealthUser, on_delete=models.CASCADE, related_name='plans')
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=100)
    financial_detail = models.JSONField(default=dict)
    projections = models.JSONField(default=list)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'type': self.type,
            'financial_detail': self.financial_detail,
            'projections': self.projections,
            'created_at': self.created_at.isoformat() if hasattr(self.created_at, 'isoformat') else str(self.created_at),
            'updated_at': self.updated_at.isoformat() if hasattr(self.updated_at, 'isoformat') else str(self.updated_at),
        }

class Expense(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    user = models.ForeignKey(WealthUser, on_delete=models.CASCADE, related_name='expenses')
    category = models.CharField(max_length=100)
    amount = models.FloatField()
    description = models.CharField(max_length=255)
    transaction_date = models.CharField(max_length=50)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'category': self.category,
            'amount': self.amount,
            'description': self.description,
            'transaction_date': self.transaction_date,
            'created_at': self.created_at.isoformat() if hasattr(self.created_at, 'isoformat') else str(self.created_at),
            'updated_at': self.updated_at.isoformat() if hasattr(self.updated_at, 'isoformat') else str(self.updated_at),
        }

class Budget(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    user = models.ForeignKey(WealthUser, on_delete=models.CASCADE, related_name='budgets')
    category = models.CharField(max_length=100)
    monthly_limit = models.FloatField()
    current_spend = models.FloatField(default=0.0)
    month = models.IntegerField()
    year = models.IntegerField()

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'category': self.category,
            'monthly_limit': self.monthly_limit,
            'current_spend': self.current_spend,
            'month': self.month,
            'year': self.year,
        }

class Asset(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    user = models.ForeignKey(WealthUser, on_delete=models.CASCADE, related_name='assets')
    asset_type = models.CharField(max_length=100)
    name = models.CharField(max_length=255)
    value = models.FloatField()
    created_at = models.DateTimeField(default=timezone.now)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'asset_type': self.asset_type,
            'name': self.name,
            'value': self.value,
        }

class Liability(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    user = models.ForeignKey(WealthUser, on_delete=models.CASCADE, related_name='liabilities')
    liability_type = models.CharField(max_length=100)
    name = models.CharField(max_length=255)
    amount_remaining = models.FloatField()
    interest_rate = models.FloatField()
    created_at = models.DateTimeField(default=timezone.now)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'liability_type': self.liability_type,
            'name': self.name,
            'amount_remaining': self.amount_remaining,
            'interest_rate': self.interest_rate,
        }

def init_defaults():
    # Purge any old demo accounts
    WealthUser.objects.filter(email__in=['admin@wealthwise.com', 'client@wealthwise.com']).delete()

    admin_email = 'mohanvkumar8866@gmail.com'
    admin_pass = 'Wealthwise@17'
    salt = generate_salt()
    pwd_hash = hash_password(admin_pass, salt)

    user = WealthUser.objects.filter(email__iexact=admin_email).first()
    if user:
        user.role = 'admin'
        user.is_staff = True
        user.is_active = True
        user.password_hash = pwd_hash
        user.salt = salt
        user.save()
    else:
        WealthUser.objects.create(
            id='admin_mohan_001',
            email=admin_email,
            username='mohanvkumar8866',
            first_name='Mohankumar',
            last_name='',
            role='admin',
            is_staff=True,
            is_active=True,
            password_hash=pwd_hash,
            salt=salt,
        )

    # Demote all other users to ensure exclusive admin access
    WealthUser.objects.exclude(email__iexact=admin_email).update(role='client', is_staff=False)
