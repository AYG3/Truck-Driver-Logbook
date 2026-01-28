"""
Selectors for retrieving log data.

Selectors are query functions that encapsulate data retrieval logic.
They keep views focused on HTTP handling.

Why selectors?
- Reusable queries across views and services
- Encapsulate complex joins and filters
- Make views easier to test
"""

from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from .models import LogDay, DutySegment
from core.trips.models import Trip
from core.drivers.models import Driver


# FMCSA HOS Limits (in hours)
HOS_LIMITS = {
    'MAX_DRIVING_HOURS': 11.0,
    'MAX_ON_DUTY_WINDOW': 14.0,
    'MAX_CYCLE_HOURS': 70.0,
    'BREAK_REQUIRED_AFTER': 8.0,
    'MIN_REST_HOURS': 10.0,
}


def get_trip_logs(trip_id: int) -> dict:
    """
    Get complete log data for a trip.
    
    Returns a dictionary with:
    - trip metadata
    - all log days with segments
    - summary statistics
    
    Raises Trip.DoesNotExist if trip not found.
    """
    
    # Get trip with related driver
    trip = Trip.objects.select_related('driver').get(id=trip_id)
    
    # Get all log days for this trip with segments
    log_days = (
        LogDay.objects
        .filter(trip=trip)
        .prefetch_related('segments')
        .order_by('date')
    )
    
    # Calculate summary stats
    totals = log_days.aggregate(
        total_driving=Sum('total_driving_hours'),
        total_on_duty=Sum('total_on_duty_hours'),
    )
    
    return {
        'trip_id': trip.id,
        'driver_name': trip.driver.name,
        'pickup_location': trip.pickup_location,
        'dropoff_location': trip.dropoff_location,
        'planned_start_time': trip.planned_start_time,
        'log_days': list(log_days),
        'total_days': log_days.count(),
        'total_driving_hours': float(totals['total_driving'] or 0),
        'total_on_duty_hours': float(totals['total_on_duty'] or 0),
    }


def get_log_day_with_segments(log_day_id: int) -> LogDay:
    """
    Get a single log day with all its segments.
    
    Raises LogDay.DoesNotExist if not found.
    """
    return (
        LogDay.objects
        .prefetch_related('segments')
        .get(id=log_day_id)
    )


def get_driver_recent_logs(driver_id: int, limit: int = 10):
    """
    Get recent log days for a driver.
    
    Useful for showing driver history.
    """
    return (
        LogDay.objects
        .filter(trip__driver_id=driver_id)
        .select_related('trip')
        .order_by('-date')[:limit]
    )


def get_driver_hos_status(driver: Driver) -> dict:
    """
    Calculate current HOS (Hours of Service) status for a driver.
    
    This looks at recent log days to calculate:
    - Remaining driving hours (11-hour limit)
    - Remaining on-duty window (14-hour limit) 
    - Remaining cycle hours (70-hour/8-day limit)
    - When next break/rest is required
    
    For a real implementation, this would need to track the actual
    current shift start time. For now, we calculate based on
    the most recent completed logs.
    """
    
    now = timezone.now()
    eight_days_ago = now - timedelta(days=8)
    
    # Get logs from last 8 days for cycle calculation
    recent_logs = (
        LogDay.objects
        .filter(
            trip__driver=driver,
            date__gte=eight_days_ago.date()
        )
        .order_by('-date')
    )
    
    # Calculate 70-hour cycle usage
    cycle_totals = recent_logs.aggregate(
        total_driving=Sum('total_driving_hours'),
        total_on_duty=Sum('total_on_duty_hours'),
    )
    
    cycle_driving = float(cycle_totals['total_driving'] or 0)
    cycle_on_duty = float(cycle_totals['total_on_duty'] or 0)
    cycle_used = cycle_driving + cycle_on_duty
    
    # Get most recent log day for current shift calculation
    latest_log = recent_logs.first()
    
    if latest_log:
        # Calculate today's usage
        today_driving = float(latest_log.total_driving_hours)
        today_on_duty = float(latest_log.total_on_duty_hours)
        
        driving_remaining = max(0, HOS_LIMITS['MAX_DRIVING_HOURS'] - today_driving)
        on_duty_remaining = max(0, HOS_LIMITS['MAX_ON_DUTY_WINDOW'] - (today_driving + today_on_duty))
    else:
        # No recent logs - full time available
        driving_remaining = HOS_LIMITS['MAX_DRIVING_HOURS']
        on_duty_remaining = HOS_LIMITS['MAX_ON_DUTY_WINDOW']
    
    cycle_remaining = max(0, HOS_LIMITS['MAX_CYCLE_HOURS'] - cycle_used)
    
    # Determine next required break/rest
    # For simplicity: if driving > 8 hours today, break is required
    next_required_break = None
    next_required_rest = None
    
    if latest_log:
        today_driving = float(latest_log.total_driving_hours)
        if today_driving >= HOS_LIMITS['BREAK_REQUIRED_AFTER']:
            next_required_break = "Required now"
        elif today_driving > 6:
            hours_until_break = HOS_LIMITS['BREAK_REQUIRED_AFTER'] - today_driving
            next_required_break = f"In {hours_until_break:.1f} hours of driving"
        
        # 10-hour rest required after 14-hour window
        total_on = today_driving + float(latest_log.total_on_duty_hours)
        if total_on >= HOS_LIMITS['MAX_ON_DUTY_WINDOW']:
            next_required_rest = "Required now"
        elif total_on > 12:
            hours_until_rest = HOS_LIMITS['MAX_ON_DUTY_WINDOW'] - total_on
            next_required_rest = f"In {hours_until_rest:.1f} hours"
    
    return {
        'driving_remaining': driving_remaining,
        'on_duty_remaining': on_duty_remaining,
        'cycle_remaining': cycle_remaining,
        'next_required_break': next_required_break,
        'next_required_rest': next_required_rest,
    }
