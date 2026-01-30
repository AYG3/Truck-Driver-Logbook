"""
Trip planning service layer.

This layer orchestrates the trip planning workflow:
1. Validate input
2. Create Trip record (with status PENDING)
3. Trigger async log generation
4. Return trip ID to client

Why a service layer?
- Keeps views thin
- Makes business logic testable
- Separates orchestration from HTTP handling

Note: Miles are calculated from route via OSRM, not provided by user.
Average speed defaults to 55 mph.
"""

import logging
from datetime import datetime, time
from django.utils import timezone
from core.hos.types import TripPlanInput
from core.hos.validators import validate_trip_input
from .models import Trip
from .tasks import generate_logs_for_trip


logger = logging.getLogger("hos")

# Default values
DEFAULT_AVERAGE_SPEED_MPH = 55


def get_default_start_time() -> datetime:
    """
    Get default start time: midnight of the next day.
    """
    tomorrow = timezone.now().date() + timezone.timedelta(days=1)
    return timezone.make_aware(datetime.combine(tomorrow, time.min))


def create_and_plan_trip(validated_data: dict) -> Trip:
    """
    Create a trip and trigger log generation.
    
    Args:
        validated_data: Validated data from TripPlanSerializer
        
    Returns:
        Created Trip instance (status=PENDING)
        
    Side effects:
        Enqueues a Celery task to generate logs asynchronously
        
    Note:
        - Miles will be calculated from route via OSRM
        - Average speed defaults to 55 mph
        - Planned start time defaults to midnight if not provided
    """
    
    # Get planned start time or default to midnight tomorrow
    planned_start_time = validated_data.get('planned_start_time') or get_default_start_time()
    
    # Average speed is always 55 mph (industry standard for trucking)
    average_speed_mph = DEFAULT_AVERAGE_SPEED_MPH
    
    # Create the Trip record with PENDING status
    # total_miles will be populated after route calculation
    trip = Trip.objects.create(
        driver_id=validated_data['driver_id'],
        current_location=validated_data['current_location'],
        pickup_location=validated_data['pickup_location'],
        dropoff_location=validated_data['dropoff_location'],
        current_cycle_used_hours=validated_data['current_cycle_used_hours'],
        planned_start_time=planned_start_time,
        total_miles=0,  # Will be calculated from route
        average_speed_mph=average_speed_mph,
        status="PENDING",
    )
    
    logger.info(
        "Created trip %s for driver %s: %s → %s (miles will be calculated from route)",
        trip.id,
        validated_data['driver_id'],
        validated_data['pickup_location'],
        validated_data['dropoff_location'],
    )
    
    # Trigger async log generation
    # The task will calculate miles from route via OSRM
    celery_data = {
        'driver_id': validated_data['driver_id'],
        'current_cycle_used_hours': float(validated_data['current_cycle_used_hours']),
        'current_location': validated_data['current_location'],
        'pickup_location': validated_data['pickup_location'],
        'dropoff_location': validated_data['dropoff_location'],
        'average_speed_mph': average_speed_mph,
        'planned_start_time': planned_start_time.isoformat(),
    }
    
    generate_logs_for_trip.delay(trip.id, celery_data)
    logger.info("Enqueued log generation task for trip %s", trip.id)
    
    return trip
