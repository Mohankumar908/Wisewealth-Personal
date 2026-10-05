import os
import hmac
import hashlib
import base64
import json
from functools import wraps
from django.http import JsonResponse
from .models import WealthUser

TOKEN_SECRET = os.environ.get('JWT_SECRET', 'wealthwise_secret_vault_987654321')

def generate_token(payload: dict) -> str:
    header = base64.urlsafe_b64encode(json.dumps({'alg': 'HS256', 'typ': 'JWT'}).encode()).rstrip(b'=').decode()
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b'=').decode()
    sig = hmac.new(TOKEN_SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest()
    signature = base64.urlsafe_b64encode(sig).rstrip(b'=').decode()
    return f"{header}.{body}.{signature}"

def verify_token(token: str):
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header, body, signature = parts
        sig = hmac.new(TOKEN_SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest()
        expected = base64.urlsafe_b64encode(sig).rstrip(b'=').decode()
        if not hmac.compare_digest(signature, expected):
            return None
        rem = len(body) % 4
        if rem > 0:
            body += '=' * (4 - rem)
        return json.loads(base64.urlsafe_b64decode(body.encode()).decode())
    except Exception:
        return None

def authenticate_token(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({'success': False, 'message': 'Authentication token required.'}, status=401)
        
        token = auth_header.split(' ', 1)[1].strip()
        payload = verify_token(token)
        if not payload or 'id' not in payload:
            return JsonResponse({'success': False, 'message': 'Invalid or expired authentication token.'}, status=403)
        
        user = WealthUser.objects.filter(id=payload['id']).first()
        if not user or not user.is_active:
            return JsonResponse({'success': False, 'message': 'User account not found or suspended.'}, status=403)
        
        request.user_obj = user
        return view_func(request, *args, **kwargs)
    return _wrapped_view

def authenticate_admin(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({'success': False, 'message': 'Authentication token required.'}, status=401)
        
        token = auth_header.split(' ', 1)[1].strip()
        payload = verify_token(token)
        if not payload or 'id' not in payload:
            return JsonResponse({'success': False, 'message': 'Invalid or expired authentication token.'}, status=403)
        
        user = WealthUser.objects.filter(id=payload['id']).first()
        if not user or (not user.is_staff and user.role != 'admin'):
            return JsonResponse({'success': False, 'message': 'Access Denied: Administrative privileges required.'}, status=403)
        
        request.user_obj = user
        return view_func(request, *args, **kwargs)
    return _wrapped_view
