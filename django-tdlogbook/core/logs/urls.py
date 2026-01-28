from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LogDayViewSet, DutySegmentViewSet

router = DefaultRouter()
router.register(r'days', LogDayViewSet, basename='logday')
router.register(r'segments', DutySegmentViewSet, basename='dutysegment')

urlpatterns = [
    path('', include(router.urls)),
]
