"""
Driver models.

The Driver model stores minimal information needed for HOS calculations:
- Identity (name)
- Cycle type (70-hour/8-day is the only one implemented)
- Creation timestamp for audit trail
"""

from django.db import models


class Driver(models.Model):
    """
    Represents a commercial truck driver subject to FMCSA Hours of Service regulations.
    
    Design principles:
    - Minimal data: Only what's needed for HOS calculations
    - Cycle type determines rolling hour calculations (future: 60/7 could be added)
    - Authentication/authorization handled separately (future feature)
    """
    
    CYCLE_CHOICES = [
        ('70_8', '70 hours / 8 days'),
        # Future: ('60_7', '60 hours / 7 days') for non-interstate
    ]
    
    name = models.CharField(
        max_length=255,
        help_text="Driver's full name"
    )
    
    cycle_type = models.CharField(
        max_length=10,
        choices=CYCLE_CHOICES,
        default='70_8',
        help_text="HOS cycle type - determines rolling hour limit"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this driver record was created"
    )
    
    class Meta:
        db_table = 'drivers'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_cycle_type_display()})"
