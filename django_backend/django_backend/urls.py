"""
URL Configuration for WealthWise Django Backend
"""
from django.urls import path, include

urlpatterns = [
    path('api/v1/', include('api.urls')),
]
