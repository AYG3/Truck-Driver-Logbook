"""
Route Planner Service - Orchestrates Route Planning and Logbook Generation

This is the main service layer that:
1. Takes trip input (origin, destination, start time, etc.)
2. Calculates route with OSRM
3. Generates HOS-compliant stops
4. Transforms route data into logbook records
5. Persists to database

This replaces the simple distance-based HOS engine with route-aware planning.
"""

import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

from django.utils import timezone

from core.routes.services import (
    plan_route,
    RouteResult,
    GeocodingError,
    RoutingError,
)
from core.routes.logbook_generator import (
    generate_logbook_from_route,
    persist_logbook_to_database,
    LogDayRecord,
)
from core.trips.models import Trip

logger = logging.getLogger("hos")


class RoutePlannerError(Exception):
    """Raised when route planning fails."""
    pass


def plan_trip_with_route(
    trip_id: int,
    origin: str,
    pickup_location: str,
    dropoff_location: str,
    start_time: datetime,
    current_cycle_hours: float = 0,
    average_speed_mph: int = 55,
) -> Dict[str, Any]:
    """
    Plan a complete trip with route-aware HOS compliance.
    
    This is the main entry point for trip planning.
    
    Workflow:
    1. Calculate route from origin → pickup → destination
    2. Generate HOS-compliant stops (breaks, rests, fuel)
    3. Transform route data into logbook records
    4. Persist LogDay and DutySegment records to database
    5. Update Trip status
    
    Args:
        trip_id: ID of the Trip record
        origin: Starting location (current_location)
        pickup_location: Where to pick up load
        dropoff_location: Where to deliver load
        start_time: Trip start time
        current_cycle_hours: Hours already used in 70-hour cycle
        average_speed_mph: Average driving speed
        
    Returns:
        Dict with route data and logbook summary
        
    Raises:
        RoutePlannerError: If planning fails
    """
    logger.info(f"Planning trip {trip_id}: {origin} → {pickup_location} → {dropoff_location}")
    
    try:
        trip = Trip.objects.get(pk=trip_id)
        trip.mark_processing()
    except Trip.DoesNotExist:
        raise RoutePlannerError(f"Trip {trip_id} not found")
    
    try:
        # ====================================================================
        # STEP 1: Calculate route with HOS stops
        # ====================================================================
        
        # If pickup is same as origin, route is just origin → destination
        # If pickup is different, route is origin → pickup → destination
        if pickup_location.lower().strip() == origin.lower().strip():
            # Direct route
            route_result = plan_route(
                origin=origin,
                destination=dropoff_location,
                current_cycle_hours=current_cycle_hours,
                average_speed_mph=average_speed_mph,
                start_time=start_time,
                include_pickup=True,
                include_dropoff=True,
            )
        else:
            # Multi-leg route: origin → pickup → destination
            # First leg: origin → pickup (no pickup/dropoff activities)
            leg1 = plan_route(
                origin=origin,
                destination=pickup_location,
                current_cycle_hours=current_cycle_hours,
                average_speed_mph=average_speed_mph,
                start_time=start_time,
                include_pickup=False,
                include_dropoff=False,
            )
            
            # Calculate end time of first leg
            leg1_end_time = start_time
            for stop in leg1.stops:
                if stop.get("scheduled_departure"):
                    leg1_end_time = datetime.fromisoformat(stop["scheduled_departure"])
            
            # Second leg: pickup → destination (with pickup and dropoff)
            route_result = plan_route(
                origin=pickup_location,
                destination=dropoff_location,
                current_cycle_hours=current_cycle_hours,
                average_speed_mph=average_speed_mph,
                start_time=leg1_end_time,
                include_pickup=True,
                include_dropoff=True,
            )
            
            # Merge legs for complete picture
            # (In a more sophisticated implementation, we'd merge geometries too)
            route_result = RouteResult(
                distance_miles=leg1.distance_miles + route_result.distance_miles,
                duration_hours=leg1.duration_hours + route_result.duration_hours,
                geometry=leg1.geometry + route_result.geometry,
                origin=leg1.origin,
                destination=route_result.destination,
                stops=leg1.stops + route_result.stops,
                segments=leg1.segments + route_result.segments,
                total_trip_hours=leg1.total_trip_hours + route_result.total_trip_hours,
                pickup_location=pickup_location,
                dropoff_location=dropoff_location,
            )
        
        logger.info(
            f"Route calculated for trip {trip_id}: "
            f"{route_result.distance_miles} mi, "
            f"{route_result.duration_hours} hrs driving, "
            f"{route_result.total_trip_hours} hrs total, "
            f"{len(route_result.stops)} stops"
        )
        
        # ====================================================================
        # STEP 2: Generate logbook records from route
        # ====================================================================
        
        log_days = generate_logbook_from_route(
            route_stops=route_result.stops,
            route_segments=route_result.segments,
            start_time=start_time,
            origin_city=_extract_city(origin),
            origin_state=_extract_state(origin),
            destination_city=_extract_city(dropoff_location),
            destination_state=_extract_state(dropoff_location),
        )
        
        logger.info(f"Generated {len(log_days)} log days for trip {trip_id}")
        
        # ====================================================================
        # STEP 3: Persist to database
        # ====================================================================
        
        persist_logbook_to_database(trip_id, log_days)
        
        # Update trip with cached route data
        trip.total_miles = int(route_result.distance_miles)
        trip.average_speed_mph = average_speed_mph
        trip.mark_completed()
        
        logger.info(f"Trip {trip_id} planning completed successfully")
        
        # Return summary
        return {
            "trip_id": trip_id,
            "status": "COMPLETED",
            "route": {
                "distance_miles": route_result.distance_miles,
                "duration_hours": route_result.duration_hours,
                "total_trip_hours": route_result.total_trip_hours,
                "stops_count": len(route_result.stops),
            },
            "logbook": {
                "log_days_count": len(log_days),
                "days": [
                    {
                        "date": str(ld.date),
                        "driving_hours": ld.total_driving_hours,
                        "on_duty_hours": ld.total_on_duty_hours,
                        "off_duty_hours": ld.total_off_duty_hours,
                        "sleeper_hours": ld.total_sleeper_hours,
                    }
                    for ld in log_days
                ]
            },
            "stops": route_result.stops,
        }
        
    except GeocodingError as e:
        error_msg = f"Failed to geocode location: {e}"
        logger.error(f"Trip {trip_id} failed: {error_msg}")
        trip.mark_failed(error_msg)
        raise RoutePlannerError(error_msg) from e
        
    except RoutingError as e:
        error_msg = f"Failed to calculate route: {e}"
        logger.error(f"Trip {trip_id} failed: {error_msg}")
        trip.mark_failed(error_msg)
        raise RoutePlannerError(error_msg) from e
        
    except Exception as e:
        error_msg = f"Unexpected error during trip planning: {e}"
        logger.exception(f"Trip {trip_id} failed: {error_msg}")
        trip.mark_failed(error_msg)
        raise RoutePlannerError(error_msg) from e


def preview_route(
    origin: str,
    destination: str,
    start_time: Optional[datetime] = None,
    current_cycle_hours: float = 0,
    average_speed_mph: int = 55,
) -> Dict[str, Any]:
    """
    Preview a route without persisting to database.
    
    Used for the frontend route preview feature.
    
    Args:
        origin: Starting location
        destination: Final destination
        start_time: Trip start time (defaults to now)
        current_cycle_hours: Hours already used in 70-hour cycle
        average_speed_mph: Average driving speed
        
    Returns:
        Dict with route data and HOS stops
    """
    if start_time is None:
        start_time = timezone.now()
    
    route_result = plan_route(
        origin=origin,
        destination=destination,
        current_cycle_hours=current_cycle_hours,
        average_speed_mph=average_speed_mph,
        start_time=start_time,
        include_pickup=True,
        include_dropoff=True,
    )
    
    return {
        "success": True,
        "route": {
            "distance_miles": route_result.distance_miles,
            "duration_hours": route_result.duration_hours,
            "total_trip_hours": route_result.total_trip_hours,
            "geometry": route_result.geometry,
            "origin": route_result.origin,
            "destination": route_result.destination,
            "stops": route_result.stops,
        }
    }


def _extract_city(location: str) -> str:
    """Extract city from a location string like 'Dallas, TX'."""
    parts = [p.strip() for p in location.split(',')]
    return parts[0] if parts else "Unknown"


def _extract_state(location: str) -> str:
    """Extract state from a location string like 'Dallas, TX'."""
    parts = [p.strip() for p in location.split(',')]
    return parts[1] if len(parts) > 1 else ""
