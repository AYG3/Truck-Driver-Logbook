from django.contrib import admin
from .models import Trip


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ('id', 'driver', 'pickup_location', 'dropoff_location', 'planned_start_time', 'created_at')
    list_filter = ('created_at', 'planned_start_time')
    search_fields = ('driver__name', 'pickup_location', 'dropoff_location')
    readonly_fields = ('created_at',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('driver')
