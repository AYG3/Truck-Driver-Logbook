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
"""

import logging
from datetime import datetime
from core.hos.types import TripPlanInput
from core.hos.validators import validate_trip_input
from .models import Trip
from .tasks import generate_logs_for_trip


logger = logging.getLogger("hos")


def create_and_plan_trip(validated_data: dict) -> Trip:
    """
    Create a trip and trigger log generation.
    
    Args:
        validated_data: Validated data from TripPlanSerializer
        
    Returns:
        Created Trip instance (status=PENDING)
        
    Side effects:
        Enqueues a Celery task to generate logs asynchronously
    """
    
    # Create the Trip record with PENDING status
    # Cache total_miles and average_speed_mph for regeneration
    trip = Trip.objects.create(
        driver_id=validated_data['driver_id'],
        current_location=validated_data['current_location'],
        pickup_location=validated_data['pickup_location'],
        dropoff_location=validated_data['dropoff_location'],
        current_cycle_used_hours=validated_data['current_cycle_used_hours'],
        planned_start_time=validated_data['planned_start_time'],
        total_miles=validated_data['total_miles'],
        average_speed_mph=validated_data['average_speed_mph'],
        status="PENDING",
    )
    
    logger.info(
        "Created trip %s for driver %s: %s → %s (%d miles)",
        trip.id,
        validated_data['driver_id'],
        validated_data['pickup_location'],
        validated_data['dropoff_location'],
        validated_data['total_miles'],
    )
    
    # Prepare input for HOS engine
    trip_plan_input = TripPlanInput(
        driver_id=validated_data['driver_id'],
        current_cycle_used_hours=float(validated_data['current_cycle_used_hours']),
        current_location=validated_data['current_location'],
        pickup_location=validated_data['pickup_location'],
        dropoff_location=validated_data['dropoff_location'],
        total_miles=validated_data['total_miles'],
        average_speed_mph=validated_data['average_speed_mph'],
        planned_start_time=validated_data['planned_start_time'],
    )
    
    # Validate input for HOS engine
    validate_trip_input(trip_plan_input)
    
    # Trigger async log generation
    # Convert datetime to string for Celery JSON serialization
    celery_data = {
        'driver_id': trip_plan_input.driver_id,
        'current_cycle_used_hours': trip_plan_input.current_cycle_used_hours,
        'current_location': trip_plan_input.current_location,
        'pickup_location': trip_plan_input.pickup_location,
        'dropoff_location': trip_plan_input.dropoff_location,
        'total_miles': trip_plan_input.total_miles,
        'average_speed_mph': trip_plan_input.average_speed_mph,
        'planned_start_time': trip_plan_input.planned_start_time.isoformat(),
    }
    
    generate_logs_for_trip.delay(trip.id, celery_data)
    logger.info("Enqueued log generation task for trip %s", trip.id)
    
    return trip
