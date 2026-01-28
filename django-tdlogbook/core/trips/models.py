"""
Trip models.

A Trip represents the input data for the HOS planner:
- Where the driver is
- Where they're picking up
- Where they're delivering
- When they plan to start
- How much of their 70-hour cycle they've already used

The Trip itself does NOT contain logs - those are in LogDay and DutySegment.
This separation keeps input (planning) separate from output (logs).
"""

from django.db import models
from core.drivers.models import Driver


class Trip(models.Model):
    """
    Represents a single trip planning request.
    
    Design principles:
    - This is INPUT data for the HOS engine
    - Logs are generated FROM a trip, not stored IN a trip
    - Immutable once logs are generated (for audit trail)
    - Status tracking for async processing
    
    The HOS engine will use this data plus route calculations
    to generate compliant LogDay and DutySegment records.
    """
    
    # =========================================================================
    # STATUS TRACKING (for Celery workflow)
    # =========================================================================
    
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("PROCESSING", "Processing"),
        ("COMPLETED", "Completed"),
        ("FAILED", "Failed"),
        ("CANCELLED", "Cancelled"),
    ]
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING",
        db_index=True,
        help_text="Current processing status of the trip"
    )
    
    error_message = models.TextField(
        blank=True,
        null=True,
        help_text="Error details if status is FAILED"
    )
    
    # =========================================================================
    # TRIP DATA
    # =========================================================================
    
    driver = models.ForeignKey(
        Driver,
        on_delete=models.CASCADE,
        related_name='trips',
        help_text="Driver making this trip"
    )
    
    current_location = models.CharField(
        max_length=255,
        help_text="Where the driver is starting from (city, state)"
    )
    
    pickup_location = models.CharField(
        max_length=255,
        help_text="Where to pick up the load"
    )
    
    dropoff_location = models.CharField(
        max_length=255,
        help_text="Where to deliver the load"
    )
    
    current_cycle_used_hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Hours already used in current 70-hour/8-day cycle"
    )
    
    planned_start_time = models.DateTimeField(
        help_text="When the driver plans to start this trip (UTC)"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this trip was planned"
    )
    
    # =========================================================================
    # CACHED PLANNING DATA (for regeneration)
    # =========================================================================
    
    total_miles = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Total trip distance in miles (cached for regeneration)"
    )
    
    average_speed_mph = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Average speed used for planning (cached for regeneration)"
    )
    
    class Meta:
        db_table = 'trips'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Trip {self.id}: {self.driver.name} - {self.pickup_location} to {self.dropoff_location}"
    
    def mark_processing(self):
        """Mark trip as currently being processed."""
        self.status = "PROCESSING"
        self.error_message = None
        self.save(update_fields=["status", "error_message"])
    
    def mark_completed(self):
        """Mark trip as successfully completed."""
        self.status = "COMPLETED"
        self.error_message = None
        self.save(update_fields=["status", "error_message"])
    
    def mark_failed(self, error_message: str):
        """Mark trip as failed with error details."""
        self.status = "FAILED"
        self.error_message = error_message
        self.save(update_fields=["status", "error_message"])
    
    @property
    def is_processing(self) -> bool:
        return self.status == "PROCESSING"
    
    @property
    def is_completed(self) -> bool:
        return self.status == "COMPLETED"
    
    @property
    def is_failed(self) -> bool:
        return self.status == "FAILED"
