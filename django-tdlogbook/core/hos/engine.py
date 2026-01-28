"""
HOS Engine - Core Business Logic

This is the heart of the system.
It converts trip parameters into FMCSA-compliant duty logs.

The engine:
1. Takes trip input (start time, distance, current cycle usage)
2. Generates a chronological sequence of duty events
3. Enforces all FMCSA rules (11-hr driving, 14-hr window, 30-min breaks, etc.)
4. Splits events into calendar days
5. Calculates daily totals

Design principles:
- Deterministic: same input = same output
- Pure functions: no side effects
- No Django dependencies: can be tested independently
- Single responsibility: only generates logs, doesn't persist them
"""

from datetime import datetime, timedelta
from typing import List, Dict
from collections import defaultdict

from .types import TripPlanInput, DutyEvent, HOSState, LogDayData
from .rules import (
    MAX_DRIVING_HOURS,
    MAX_ON_DUTY_WINDOW,
    BREAK_REQUIRED_AFTER_HOURS,
    BREAK_DURATION_MINUTES,
    MINIMUM_REST_HOURS,
    PICKUP_DURATION_HOURS,
    DROPOFF_DURATION_HOURS,
    FUEL_INTERVAL_MILES,
    FUEL_STOP_DURATION_MINUTES,
    MAX_CONTINUOUS_DRIVING_HOURS,
    STATUS_OFF_DUTY,
    STATUS_SLEEPER,
    STATUS_DRIVING,
    STATUS_ON_DUTY,
    DEFAULT_CITY,
    DEFAULT_STATE,
)


def generate_duty_events(trip_input: TripPlanInput) -> List[DutyEvent]:
    """
    Generate a complete sequence of duty events for a trip.
    
    This is the main entry point for the HOS engine.
    
    Args:
        trip_input: Trip planning parameters
        
    Returns:
        List of DutyEvent objects in chronological order
        
    The algorithm:
    1. Start with OFF_DUTY until trip start
    2. Add ON_DUTY for pickup (1 hour)
    3. Loop through driving blocks:
       - Respect 11-hour driving limit
       - Respect 14-hour on-duty window
       - Add fuel stops every 1000 miles
       - Add 30-min break after 8 hours
       - Force 10-hour rest when limits hit
    4. Add ON_DUTY for dropoff (1 hour)
    5. End with OFF_DUTY/SLEEPER
    """
    
    events = []
    state = HOSState(
        current_time=trip_input.planned_start_time,
        miles_remaining=trip_input.total_miles,
        cycle_hours_used=trip_input.current_cycle_used_hours,
    )
    
    # Helper function to parse location
    def parse_location(location_str: str) -> tuple:
        """Extract city and state from location string."""
        parts = [p.strip() for p in location_str.split(',')]
        if len(parts) >= 2:
            return parts[0], parts[1]
        return location_str, DEFAULT_STATE
    
    # Parse locations
    pickup_city, pickup_state = parse_location(trip_input.pickup_location)
    dropoff_city, dropoff_state = parse_location(trip_input.dropoff_location)
    
    # ========================================================================
    # PHASE 1: PICKUP
    # ========================================================================
    
    # Pickup activity (loading, inspection, paperwork)
    pickup_start = state.current_time
    pickup_end = pickup_start + timedelta(hours=PICKUP_DURATION_HOURS)
    
    events.append(DutyEvent(
        start=pickup_start,
        end=pickup_end,
        status=STATUS_ON_DUTY,
        city=pickup_city,
        state=pickup_state,
        remark="Pickup - loading and inspection"
    ))
    
    state.current_time = pickup_end
    state.on_duty_window_start = pickup_start
    state.add_on_duty_hours(PICKUP_DURATION_HOURS)
    
    # ========================================================================
    # PHASE 2: DRIVING WITH HOS ENFORCEMENT
    # ========================================================================
    
    miles_driven_since_fuel = 0
    hours_driving_since_break = 0
    
    while state.miles_remaining > 0:
        
        # CHECK 1: Have we hit the 11-hour driving limit?
        if state.driving_hours_today >= MAX_DRIVING_HOURS:
            # FORCE 10-HOUR REST
            rest_start = state.current_time
            rest_end = rest_start + timedelta(hours=MINIMUM_REST_HOURS)
            
            events.append(DutyEvent(
                start=rest_start,
                end=rest_end,
                status=STATUS_SLEEPER,
                city=pickup_city,  # Assume resting near last location
                state=pickup_state,
                remark=f"10-hour rest (hit {MAX_DRIVING_HOURS}-hr driving limit)"
            ))
            
            state.current_time = rest_end
            state.reset_daily_limits()
            state.on_duty_window_start = rest_end
            hours_driving_since_break = 0
            continue
        
        # CHECK 2: Have we hit the 14-hour on-duty window?
        if state.hours_since_window_start() >= MAX_ON_DUTY_WINDOW:
            # FORCE 10-HOUR OFF DUTY
            rest_start = state.current_time
            rest_end = rest_start + timedelta(hours=MINIMUM_REST_HOURS)
            
            events.append(DutyEvent(
                start=rest_start,
                end=rest_end,
                status=STATUS_OFF_DUTY,
                city=pickup_city,
                state=pickup_state,
                remark=f"10-hour rest (hit {MAX_ON_DUTY_WINDOW}-hr on-duty window)"
            ))
            
            state.current_time = rest_end
            state.reset_daily_limits()
            state.on_duty_window_start = rest_end
            hours_driving_since_break = 0
            continue
        
        # CHECK 3: Do we need a fuel stop?
        if miles_driven_since_fuel >= FUEL_INTERVAL_MILES:
            fuel_start = state.current_time
            fuel_duration_hours = FUEL_STOP_DURATION_MINUTES / 60
            fuel_end = fuel_start + timedelta(hours=fuel_duration_hours)
            
            events.append(DutyEvent(
                start=fuel_start,
                end=fuel_end,
                status=STATUS_ON_DUTY,
                city=pickup_city,
                state=pickup_state,
                remark="Fuel stop"
            ))
            
            state.current_time = fuel_end
            state.add_on_duty_hours(fuel_duration_hours)
            miles_driven_since_fuel = 0
            continue
        
        # CHECK 4: Do we need a 30-minute break?
        if hours_driving_since_break >= BREAK_REQUIRED_AFTER_HOURS:
            break_start = state.current_time
            break_duration_hours = BREAK_DURATION_MINUTES / 60
            break_end = break_start + timedelta(hours=break_duration_hours)
            
            events.append(DutyEvent(
                start=break_start,
                end=break_end,
                status=STATUS_OFF_DUTY,
                city=pickup_city,
                state=pickup_state,
                remark="30-minute break (required after 8 hrs driving)"
            ))
            
            state.current_time = break_end
            hours_driving_since_break = 0
            continue
        
        # DRIVE A BLOCK
        # Calculate how much we can drive
        hours_until_driving_limit = MAX_DRIVING_HOURS - state.driving_hours_today
        hours_until_window_limit = MAX_ON_DUTY_WINDOW - state.hours_since_window_start()
        hours_until_break = BREAK_REQUIRED_AFTER_HOURS - hours_driving_since_break
        hours_for_remaining_miles = state.miles_remaining / trip_input.average_speed_mph
        
        # Drive for up to MAX_CONTINUOUS_DRIVING_HOURS or until we hit a limit
        drive_hours = min(
            MAX_CONTINUOUS_DRIVING_HOURS,
            hours_until_driving_limit,
            hours_until_window_limit,
            hours_until_break,
            hours_for_remaining_miles
        )
        
        if drive_hours <= 0.01:  # Less than 1 minute
            # Edge case: can't drive anymore, force rest
            break
        
        drive_start = state.current_time
        drive_end = drive_start + timedelta(hours=drive_hours)
        miles_this_block = drive_hours * trip_input.average_speed_mph
        
        events.append(DutyEvent(
            start=drive_start,
            end=drive_end,
            status=STATUS_DRIVING,
            city=pickup_city,  # In real system, would interpolate route
            state=pickup_state,
            remark=f"Driving ({miles_this_block:.0f} miles)"
        ))
        
        state.current_time = drive_end
        state.add_driving_hours(drive_hours)
        state.miles_remaining -= miles_this_block
        miles_driven_since_fuel += miles_this_block
        hours_driving_since_break += drive_hours
    
    # ========================================================================
    # PHASE 3: DROPOFF
    # ========================================================================
    
    dropoff_start = state.current_time
    dropoff_end = dropoff_start + timedelta(hours=DROPOFF_DURATION_HOURS)
    
    events.append(DutyEvent(
        start=dropoff_start,
        end=dropoff_end,
        status=STATUS_ON_DUTY,
        city=dropoff_city,
        state=dropoff_state,
        remark="Dropoff - unloading and paperwork"
    ))
    
    state.current_time = dropoff_end
    
    # ========================================================================
    # PHASE 4: FINAL OFF-DUTY
    # ========================================================================
    
    # Add a final OFF_DUTY segment to close the trip
    final_rest_start = state.current_time
    final_rest_end = final_rest_start + timedelta(hours=10)
    
    events.append(DutyEvent(
        start=final_rest_start,
        end=final_rest_end,
        status=STATUS_OFF_DUTY,
        city=dropoff_city,
        state=dropoff_state,
        remark="Trip complete - off duty"
    ))
    
    return events


def split_events_into_log_days(events: List[DutyEvent]) -> Dict[str, LogDayData]:
    """
    Split duty events into calendar days and calculate daily totals.
    
    FMCSA logs are organized by calendar day (midnight to midnight).
    If an event spans midnight, it must be split into two segments.
    
    Args:
        events: List of DutyEvent objects
        
    Returns:
        Dict mapping date string (YYYY-MM-DD) to LogDayData
    """
    
    log_days = {}
    
    for event in events:
        start_date = event.start.date()
        end_date = event.end.date()
        
        if start_date == end_date:
            # Event is entirely within one day
            _add_event_to_day(log_days, start_date, event)
        else:
            # Event spans midnight - split it
            # Part 1: From start to midnight of the next day
            from datetime import datetime
            
            # Calculate midnight in UTC
            next_day = start_date + timedelta(days=1)
            midnight = datetime.combine(next_day, datetime.min.time())
            midnight = midnight.replace(tzinfo=event.start.tzinfo)
            
            # Only split if the end is actually after midnight
            if event.end > midnight:
                part1 = DutyEvent(
                    start=event.start,
                    end=midnight,
                    status=event.status,
                    city=event.city,
                    state=event.state,
                    remark=event.remark + " (cont'd)"
                )
                _add_event_to_day(log_days, start_date, part1)
                
                # Part 2: From midnight to end
                part2 = DutyEvent(
                    start=midnight,
                    end=event.end,
                    status=event.status,
                    city=event.city,
                    state=event.state,
                    remark=event.remark + " (cont'd from prev day)"
                )
                _add_event_to_day(log_days, end_date, part2)
            else:
                # Edge case: event ends exactly at midnight or just after
                _add_event_to_day(log_days, start_date, event)
    
    # Fill gaps and calculate totals for each day
    for date_str, day_data in log_days.items():
        _fill_gaps_with_off_duty(day_data)
        _calculate_daily_totals(day_data)
    
    return log_days


def _add_event_to_day(log_days: dict, date, event: DutyEvent):
    """Add an event to a specific day's log."""
    date_str = date.isoformat()
    
    if date_str not in log_days:
        log_days[date_str] = LogDayData(
            date=date_str,
            total_driving_hours=0,
            total_on_duty_hours=0,
            total_off_duty_hours=0,
            total_sleeper_hours=0,
            segments=[]
        )
    
    log_days[date_str].segments.append(event)


def _fill_gaps_with_off_duty(day_data: LogDayData):
    """
    Ensure a LogDay has no gaps - fill gaps with OFF_DUTY.
    
    FMCSA requires every minute of every day to be accounted for.
    """
    if not day_data.segments:
        return
    
    # Sort segments by start time
    day_data.segments.sort(key=lambda e: e.start)
    
    filled_segments = []
    day_start = datetime.fromisoformat(day_data.date).replace(
        tzinfo=day_data.segments[0].start.tzinfo
    )
    day_end = day_start + timedelta(days=1)
    
    # Fill gap at start of day if needed
    first_segment = day_data.segments[0]
    if first_segment.start > day_start:
        gap = DutyEvent(
            start=day_start,
            end=first_segment.start,
            status=STATUS_OFF_DUTY,
            city=first_segment.city,
            state=first_segment.state,
            remark="Off duty (auto-filled)"
        )
        filled_segments.append(gap)
    
    # Add all existing segments and fill gaps between them
    for i, segment in enumerate(day_data.segments):
        filled_segments.append(segment)
        
        # Fill gap to next segment
        if i < len(day_data.segments) - 1:
            next_segment = day_data.segments[i + 1]
            if segment.end < next_segment.start:
                gap = DutyEvent(
                    start=segment.end,
                    end=next_segment.start,
                    status=STATUS_OFF_DUTY,
                    city=segment.city,
                    state=segment.state,
                    remark="Off duty (auto-filled)"
                )
                filled_segments.append(gap)
    
    # Fill gap at end of day if needed
    last_segment = filled_segments[-1]
    if last_segment.end < day_end:
        gap = DutyEvent(
            start=last_segment.end,
            end=day_end,
            status=STATUS_OFF_DUTY,
            city=last_segment.city,
            state=last_segment.state,
            remark="Off duty (auto-filled)"
        )
        filled_segments.append(gap)
    
    day_data.segments = filled_segments


def _calculate_daily_totals(day_data: LogDayData):
    """Calculate total hours for each duty status."""
    totals = defaultdict(float)
    
    for segment in day_data.segments:
        totals[segment.status] += segment.duration_hours
    
    day_data.total_driving_hours = round(totals[STATUS_DRIVING], 2)
    day_data.total_on_duty_hours = round(totals[STATUS_ON_DUTY], 2)
    day_data.total_off_duty_hours = round(totals[STATUS_OFF_DUTY], 2)
    day_data.total_sleeper_hours = round(totals[STATUS_SLEEPER], 2)
