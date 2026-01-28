from django.contrib import admin
from .models import LogDay, DutySegment


class DutySegmentInline(admin.TabularInline):
    model = DutySegment
    extra = 0
    readonly_fields = ('created_at',)


@admin.register(LogDay)
class LogDayAdmin(admin.ModelAdmin):
    list_display = ('date', 'trip', 'total_driving_hours', 'total_on_duty_hours', 'total_off_duty_hours', 'total_sleeper_hours')
    list_filter = ('date', 'created_at')
    search_fields = ('trip__driver__name',)
    readonly_fields = ('created_at',)
    inlines = [DutySegmentInline]
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('trip', 'trip__driver')


@admin.register(DutySegment)
class DutySegmentAdmin(admin.ModelAdmin):
    list_display = ('log_day', 'start_time', 'end_time', 'status', 'city', 'state', 'remark')
    list_filter = ('status', 'created_at')
    search_fields = ('city', 'state', 'remark')
    readonly_fields = ('created_at', 'duration_hours')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('log_day', 'log_day__trip')
