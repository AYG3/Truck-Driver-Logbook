"""
Input validation for the HOS engine.

Validates trip planning inputs before they reach the core engine.
"""

from datetime import datetime, timezone
from .types import TripPlanInput


class ValidationError(Exception):
    """Raised when input validation fails."""
    pass


def validate_trip_input(input_data: TripPlanInput) -> None:
    """
    Validate trip planning input.
    
    Raises ValidationError if any validation fails.
    """
    
    # Validate cycle hours
    if input_data.current_cycle_used_hours < 0:
        raise ValidationError("current_cycle_used_hours cannot be negative")
    
    if input_data.current_cycle_used_hours > 70:
        raise ValidationError("current_cycle_used_hours cannot exceed 70")
    
    # Validate distance (only if provided - route planner calculates it)
    if input_data.total_miles is not None:
        if input_data.total_miles <= 0:
            raise ValidationError("total_miles must be positive")
        
        if input_data.total_miles > 5000:
            raise ValidationError("total_miles seems unrealistic (max 5000 miles)")
    
    # Validate speed
    if input_data.average_speed_mph <= 0:
        raise ValidationError("average_speed_mph must be positive")
    
    if input_data.average_speed_mph > 80:
        raise ValidationError("average_speed_mph cannot exceed 80 mph")
    
    # Validate timing (only if provided - defaults to midnight)
    if input_data.planned_start_time is not None:
        now = datetime.now(timezone.utc)
        if input_data.planned_start_time < now:
            # Warning: allowing past dates for testing/demos
            pass
    
    # Validate locations
    if not input_data.current_location or not input_data.current_location.strip():
        raise ValidationError("current_location is required")
    
    if not input_data.pickup_location or not input_data.pickup_location.strip():
        raise ValidationError("pickup_location is required")
    
    if not input_data.dropoff_location or not input_data.dropoff_location.strip():
        raise ValidationError("dropoff_location is required")


def check_cycle_availability(current_cycle_hours: float, estimated_trip_hours: float) -> dict:
    """
    Check if driver has enough cycle hours remaining.
    
    Returns a dict with:
    - available: bool
    - hours_remaining: float
    - message: str
    """
    
    hours_remaining = 70 - current_cycle_hours
    
    if hours_remaining <= 0:
        return {
            "available": False,
            "hours_remaining": 0,
            "message": "Driver has exhausted 70-hour cycle. Reset required."
        }
    
    if estimated_trip_hours > hours_remaining:
        return {
            "available": False,
            "hours_remaining": hours_remaining,
            "message": f"Trip requires ~{estimated_trip_hours:.1f}hrs but only {hours_remaining:.1f}hrs remain in cycle"
        }
    
    return {
        "available": True,
        "hours_remaining": hours_remaining,
        "message": "Sufficient cycle hours available"
    }
