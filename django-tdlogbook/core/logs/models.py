"""
Log models - the core legal records.

LogDay: One calendar day worth of duty status
DutySegment: Individual periods of continuous duty status

CRITICAL INVARIANTS (enforced by HOS engine):
1. All segments in a LogDay must be contiguous (no gaps)
2. All segments in a LogDay must not overlap
3. All segments in a LogDay must sum to exactly 24 hours
4. end_time must always be > start_time
5. Segments cannot span multiple LogDays (split at midnight)
"""

from django.db import models
from django.db.models import Q, F
from django.core.exceptions import ValidationError
from core.trips.models import Trip


class LogDay(models.Model):
    """
    Represents one 24-hour log sheet (one calendar day).
    
    This matches FMCSA paper logs which are organized by calendar day.
    Each LogDay belongs to a Trip and contains multiple DutySegments.
    
    Totals are calculated and stored once after generation for:
    - Performance (avoid repeated calculations)
    - Audit trail (what totals were shown at generation time)
    - FMCSA compliance (logs show daily totals)
    """
    
    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name='log_days',
        help_text="Trip this log day belongs to"
    )
    
    date = models.DateField(
        help_text="Calendar date for this log (local time zone aware)"
    )
    
    # Daily totals - calculated once after log generation
    total_driving_hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Total hours in DRIVING status"
    )
    
    total_on_duty_hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Total hours in ON_DUTY status (not including driving)"
    )
    
    total_off_duty_hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Total hours in OFF_DUTY status"
    )
    
    total_sleeper_hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Total hours in SLEEPER status"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this log was generated"
    )
    
    class Meta:
        db_table = 'log_days'
        ordering = ['date']
        unique_together = [['trip', 'date']]
        indexes = [
            models.Index(fields=['trip', 'date']),
        ]
    
    def __str__(self):
        return f"Log {self.date} - Trip {self.trip_id}"
    
    def validate_totals(self):
        """Verify that daily totals sum to 24 hours."""
        total = (
            self.total_driving_hours + 
            self.total_on_duty_hours + 
            self.total_off_duty_hours + 
            self.total_sleeper_hours
        )
        if abs(float(total) - 24.0) > 0.01:  # Allow tiny floating point errors
            raise ValidationError(
                f"Daily totals must sum to 24 hours, got {total}"
            )


class DutySegment(models.Model):
    """
    Represents one continuous period of a single duty status.
    
    This is THE CORE LEGAL RECORD.
    Each segment is a horizontal line on the FMCSA graph.
    
    FMCSA defines 4 duty statuses:
    - OFF_DUTY: Not working, not responsible for vehicle
    - SLEEPER: In sleeper berth (can count as rest)
    - DRIVING: Actually driving
    - ON_DUTY: Working but not driving (loading, fueling, inspections, etc.)
    
    Critical rules enforced by HOS engine:
    - No overlaps within a LogDay
    - No gaps within a LogDay
    - Segments are ordered by start_time
    - Each segment has a location and remark for legal compliance
    """
    
    STATUS_CHOICES = [
        ('OFF_DUTY', 'Off Duty'),
        ('SLEEPER', 'Sleeper Berth'),
        ('DRIVING', 'Driving'),
        ('ON_DUTY', 'On Duty Not Driving'),
    ]
    
    log_day = models.ForeignKey(
        LogDay,
        on_delete=models.CASCADE,
        related_name='segments',
        help_text="LogDay this segment belongs to"
    )
    
    start_time = models.DateTimeField(
        help_text="When this duty status began (UTC)"
    )
    
    end_time = models.DateTimeField(
        help_text="When this duty status ended (UTC)"
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        help_text="FMCSA duty status"
    )
    
    # Location information required by FMCSA
    city = models.CharField(
        max_length=100,
        blank=True,
        help_text="City where status change occurred"
    )
    
    state = models.CharField(
        max_length=50,
        blank=True,
        help_text="State where status change occurred"
    )
    
    remark = models.CharField(
        max_length=255,
        blank=True,
        help_text="Description of activity (e.g., 'Pickup', 'Fuel stop', '30-min break')"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this segment was created"
    )
    
    class Meta:
        db_table = 'duty_segments'
        ordering = ['start_time']
        indexes = [
            models.Index(fields=['log_day', 'start_time']),
            models.Index(fields=['status']),
        ]
        # Database-level constraints for defense in depth
        constraints = [
            # Ensure end_time is always after start_time
            models.CheckConstraint(
                check=Q(end_time__gt=F('start_time')),
                name='end_after_start'
            ),
        ]
    
    def __str__(self):
        return f"{self.status}: {self.start_time} to {self.end_time}"
    
    def clean(self):
        """Validate segment data."""
        if self.end_time <= self.start_time:
            raise ValidationError("end_time must be after start_time")
    
    def save(self, *args, **kwargs):
        """Validate before saving."""
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def duration_hours(self):
        """Calculate duration in hours (for display/validation only, not stored)."""
        delta = self.end_time - self.start_time
        return delta.total_seconds() / 3600
