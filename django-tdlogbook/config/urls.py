"""
URL configuration for truck driver logbook project.
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/drivers/', include('core.drivers.urls')),
    path('api/trips/', include('core.trips.urls')),
    path('api/logs/', include('core.logs.urls')),
]
