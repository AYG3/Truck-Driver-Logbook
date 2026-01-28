from django.contrib import admin
from .models import Driver


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ('name', 'cycle_type', 'created_at')
    list_filter = ('cycle_type',)
    search_fields = ('name',)
    readonly_fields = ('created_at',)
