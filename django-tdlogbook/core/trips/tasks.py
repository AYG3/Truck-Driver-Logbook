"""
Celery tasks for async log generation.

Why async?
- Log generation can take time for long trips
- Prevents API timeouts
- Better user experience (show "generating..." status)
- More realistic for production systems

CRITICAL: Log generation is atomic.
- If validation fails, nothing is saved
- Existing logs are deleted before regeneration
- This ensures database integrity

Workflow:
  POST /trips/plan
   └── Trip(PENDING)
         └── Celery task starts
               ├── status → PROCESSING
               ├── generate logs
               ├── validate
               ├── persist atomically
               └── status → COMPLETED or FAILED
"""

import logging
from datetime import datetime
from celery import shared_task
from django.db import transaction

from core.hos.types import TripPlanInput
from core.hos.engine import generate_duty_events, split_events_into_log_days
from core.hos.event_validators import validate_before_persistence
from core.hos.exceptions import HOSException
from core.logs.models import LogDay, DutySegment
from .models import Trip


# Logger for HOS compliance decisions
logger = logging.getLogger("hos")


# =============================================================================
# NEW: Route-Aware Log Generation (Steps 5 & 6)
# =============================================================================

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 10},
    retry_backoff=True,
    retry_backoff_max=300,
)
def generate_logs_with_route(self, trip_id: int, route_plan_data: dict):
    """
    Generate HOS logs for a trip using the new route-aware planner.
    
    This is the enhanced version that uses:
    - OSRM for actual route geometry
    - Reverse geocoding for stop location names
    - Full HOS state machine for stop placement
    - Midnight-split logbook generation
    
    Args:
        trip_id: ID of the Trip to generate logs for
        route_plan_data: Dictionary containing:
            - origin: str (starting location)
            - destination: str (final destination)
            - pickup_location: str (optional, cargo pickup)
            - start_time: str (ISO format datetime)
            - current_cycle_hours: float (default 0)
            - average_speed_mph: int (default 55)
            
    Process:
        1. Retrieve Trip from database
        2. Mark as PROCESSING
        3. Plan route with OSRM
        4. Generate HOS-compliant stops
        5. Transform to logbook records
        6. Persist LogDay and DutySegment atomically
        7. Update Trip with route data
        8. Mark as COMPLETED or FAILED
    """
    from core.routes.route_planner import plan_trip_with_route
    from core.routes.services import GeocodingError, RoutingError
    
    trip = None
    
    try:
        # Get the trip
        trip = Trip.objects.select_related('driver').get(id=trip_id)
        
        # ====================================================================
        # STEP 1: Mark as PROCESSING
        # ====================================================================
        trip.mark_processing()
        logger.info(
            "Starting route-aware log generation for trip %s (driver: %s, %s → %s)",
            trip_id, trip.driver.name, trip.pickup_location, trip.dropoff_location
        )
        
        # Parse start_time if it's a string
        start_time = route_plan_data.get('start_time')
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time)
        
        # ====================================================================
        # STEP 2: Plan route and generate logs
        # ====================================================================
        logger.info("Planning route for trip %s", trip_id)
        
        result = plan_trip_with_route(
            trip=trip,
            origin=route_plan_data.get('origin', trip.current_location),
            destination=route_plan_data.get('destination', trip.dropoff_location),
            pickup_location=route_plan_data.get('pickup_location', trip.pickup_location),
            start_time=start_time or trip.planned_start_time,
            current_cycle_hours=route_plan_data.get('current_cycle_hours', 
                                                      float(trip.current_cycle_used_hours or 0)),
            average_speed_mph=route_plan_data.get('average_speed_mph', 
                                                    trip.average_speed_mph or 55),
        )
        
        logger.info(
            "Route-aware log generation completed for trip %s: "
            "%d stops, %d segments, %d log days, %.1f total miles",
            trip_id,
            len(result['stops']),
            len(result['segments']),
            result['log_days_generated'],
            result['route'].distance_miles
        )
        
        return {
            'status': 'success',
            'trip_id': trip_id,
            'log_days_generated': result['log_days_generated'],
            'total_stops': len(result['stops']),
            'total_trip_hours': result['route'].total_trip_hours,
            'distance_miles': result['route'].distance_miles,
        }
        
    except Trip.DoesNotExist:
        logger.error("Trip %s not found", trip_id)
        return {
            'status': 'error',
            'message': f'Trip {trip_id} not found'
        }
    
    except GeocodingError as e:
        error_msg = f"Geocoding error: {str(e)}"
        logger.warning("Geocoding failed for trip %s: %s", trip_id, error_msg)
        
        if trip:
            trip.mark_failed(error_msg)
        
        return {
            'status': 'error',
            'error_type': 'geocoding_error',
            'message': str(e),
        }
    
    except RoutingError as e:
        error_msg = f"Routing error: {str(e)}"
        logger.warning("Routing failed for trip %s: %s", trip_id, error_msg)
        
        if trip:
            trip.mark_failed(error_msg)
        
        return {
            'status': 'error',
            'error_type': 'routing_error',
            'message': str(e),
        }
    
    except HOSException as e:
        error_msg = f"HOS violation: {str(e)}"
        logger.warning("HOS validation failed for trip %s: %s", trip_id, error_msg)
        
        if trip:
            trip.mark_failed(error_msg)
        
        return {
            'status': 'error',
            'error_type': 'hos_violation',
            'message': str(e),
            'details': getattr(e, 'details', {})
        }
    
    except Exception as exc:
        error_msg = f"Processing error: {str(exc)}"
        logger.error(
            "Error in route-aware log generation for trip %s: %s",
            trip_id, error_msg,
            exc_info=True
        )
        
        if trip:
            trip.mark_failed(error_msg)
        
        raise self.retry(exc=exc)


# =============================================================================
# LEGACY: Original HOS Engine Log Generation
# =============================================================================


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 10},
    retry_backoff=True,
    retry_backoff_max=300,
)
def generate_logs_for_trip(self, trip_id: int, plan_data: dict):
    """
    Generate HOS logs for a trip asynchronously.
    
    This is the bridge between the HOS engine (pure Python) and Django models.
    
    IMPORTANT: This function uses atomic transactions.
    If any step fails, no partial logs are saved.
    
    Args:
        trip_id: ID of the Trip to generate logs for
        plan_data: Dictionary containing TripPlanInput fields
        
    Process:
        1. Retrieve Trip from database
        2. Mark as PROCESSING
        3. Call HOS engine to generate duty events
        4. VALIDATE generated events (legal compliance)
        5. Split events into log days
        6. VALIDATE log days (24-hour coverage)
        7. Delete existing logs (regeneration strategy)
        8. Create LogDay and DutySegment records atomically
        9. Mark as COMPLETED or FAILED
    """
    
    trip = None
    
    try:
        # Get the trip
        trip = Trip.objects.get(id=trip_id)
        
        # ====================================================================
        # STEP 1: Mark as PROCESSING
        # ====================================================================
        trip.mark_processing()
        logger.info(
            "Starting log generation for trip %s (driver: %s, %s → %s)",
            trip_id, trip.driver.name, trip.pickup_location, trip.dropoff_location
        )
        
        # Convert ISO string back to datetime
        plan_data['planned_start_time'] = datetime.fromisoformat(
            plan_data['planned_start_time']
        )
        
        # Create TripPlanInput DTO
        trip_input = TripPlanInput(**plan_data)
        
        # ====================================================================
        # STEP 2: Generate duty events using HOS engine
        # ====================================================================
        logger.info("Generating duty events for trip %s", trip_id)
        events = generate_duty_events(trip_input)
        logger.info("Generated %d duty events for trip %s", len(events), trip_id)
        
        # ====================================================================
        # STEP 3: Split events into calendar days
        # ====================================================================
        log_days_data = split_events_into_log_days(events)
        logger.info(
            "Split events into %d log days for trip %s",
            len(log_days_data), trip_id
        )
        
        # ====================================================================
        # STEP 4: VALIDATE before persistence
        # This ensures legal compliance - if this fails, nothing is saved
        # ====================================================================
        logger.info("Validating HOS compliance for trip %s", trip_id)
        validate_before_persistence(
            events=events,
            log_days=log_days_data,
            current_cycle_hours=plan_data.get('current_cycle_used_hours', 0)
        )
        logger.info("HOS validation passed for trip %s", trip_id)
        
        # ====================================================================
        # STEP 5: Persist to database (ATOMIC TRANSACTION)
        # ====================================================================
        with transaction.atomic():
            # REGENERATION STRATEGY: Delete existing logs first
            # This ensures we never have stale or duplicate logs
            deleted_count = _delete_existing_logs(trip)
            if deleted_count > 0:
                logger.info(
                    "Deleted %d existing log days for trip %s (regeneration)",
                    deleted_count, trip_id
                )
            
            # Create new logs
            for date_str, day_data in log_days_data.items():
                # Create LogDay
                log_day = LogDay.objects.create(
                    trip=trip,
                    date=day_data.date,
                    total_driving_hours=day_data.total_driving_hours,
                    total_on_duty_hours=day_data.total_on_duty_hours,
                    total_off_duty_hours=day_data.total_off_duty_hours,
                    total_sleeper_hours=day_data.total_sleeper_hours,
                )
                
                # Create DutySegments for this day
                segments_to_create = [
                    DutySegment(
                        log_day=log_day,
                        start_time=event.start,
                        end_time=event.end,
                        status=event.status,
                        city=event.city,
                        state=event.state,
                        remark=event.remark,
                    )
                    for event in day_data.segments
                ]
                
                # Bulk create for performance
                DutySegment.objects.bulk_create(segments_to_create)
        
        # ====================================================================
        # STEP 6: Mark as COMPLETED
        # ====================================================================
        trip.mark_completed()
        logger.info(
            "Successfully generated %d log days for trip %s",
            len(log_days_data), trip_id
        )
        
        return {
            'status': 'success',
            'trip_id': trip_id,
            'log_days_generated': len(log_days_data),
        }
        
    except Trip.DoesNotExist:
        logger.error("Trip %s not found", trip_id)
        return {
            'status': 'error',
            'message': f'Trip {trip_id} not found'
        }
    
    except HOSException as e:
        # HOS validation failures are NOT retried
        # They indicate invalid input, not transient errors
        error_msg = f"HOS violation: {str(e)}"
        logger.warning(
            "HOS validation failed for trip %s: %s",
            trip_id, error_msg
        )
        
        if trip:
            trip.mark_failed(error_msg)
        
        # Don't retry HOS violations - they require user intervention
        return {
            'status': 'error',
            'error_type': 'hos_violation',
            'message': str(e),
            'details': getattr(e, 'details', {})
        }
    
    except Exception as exc:
        # Mark as failed before retry
        error_msg = f"Processing error: {str(exc)}"
        logger.error(
            "Error generating logs for trip %s: %s",
            trip_id, error_msg,
            exc_info=True
        )
        
        if trip:
            trip.mark_failed(error_msg)
        
        # Retry on transient failures (database errors, etc.)
        raise self.retry(exc=exc)


def _delete_existing_logs(trip: Trip) -> int:
    """
    Delete all existing logs for a trip.
    
    This is the regeneration strategy:
    - Never update segments in place
    - Delete everything and regenerate from scratch
    - Ensures deterministic, drift-free logs
    
    Args:
        trip: Trip instance to delete logs for
        
    Returns:
        Number of LogDays deleted
    """
    # DutySegments are deleted by CASCADE when LogDay is deleted
    deleted_count, _ = LogDay.objects.filter(trip=trip).delete()
    return deleted_count


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 10},
)
def regenerate_trip_logs(self, trip_id: int):
    """
    Regenerate logs for an existing trip.
    
    Use this when:
    - Trip parameters have changed
    - HOS engine rules have been updated
    - Logs need to be recalculated
    
    This fetches the original trip data and regenerates.
    """
    try:
        trip = Trip.objects.select_related('driver').get(id=trip_id)
        
        # Check if we have cached planning data
        if not trip.total_miles or not trip.average_speed_mph:
            error_msg = "Cannot regenerate: missing total_miles or average_speed_mph"
            logger.error("Regeneration failed for trip %s: %s", trip_id, error_msg)
            trip.mark_failed(error_msg)
            return {
                'status': 'error',
                'message': error_msg
            }
        
        # Reconstruct plan_data from trip
        plan_data = {
            'driver_id': trip.driver_id,
            'current_cycle_used_hours': float(trip.current_cycle_used_hours),
            'current_location': trip.current_location,
            'pickup_location': trip.pickup_location,
            'dropoff_location': trip.dropoff_location,
            'total_miles': trip.total_miles,
            'average_speed_mph': trip.average_speed_mph,
            'planned_start_time': trip.planned_start_time.isoformat(),
        }
        
        # Call the main task
        return generate_logs_for_trip(trip_id, plan_data)
        
    except Trip.DoesNotExist:
        logger.error("Trip %s not found for regeneration", trip_id)
        return {
            'status': 'error',
            'message': f'Trip {trip_id} not found'
        }
    
    except Exception as exc:
        logger.error(
            "Error regenerating logs for trip %s: %s",
            trip_id, str(exc),
            exc_info=True
        )
        raise self.retry(exc=exc)
