"""
Route API URL Configuration
"""

from django.urls import path
from . import views

urlpatterns = [
    path("plan/", views.plan_route_view, name="plan-route"),
    path("geocode/", views.geocode_view, name="geocode"),
]
