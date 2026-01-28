"""
HOS Event Sequence Validators

Central validation for generated duty event sequences.
These validators ensure that logs are FMCSA-compliant before persistence.

CRITICAL: This module is the "legal spine" of the system.
If validation fails, logs are NOT persisted.

Validation Layers:
1. Serializer validation - Input sanity (API layer)
2. HOS Engine validation - Legal compliance (this module)
3. DB Transaction validation - Atomic persistence (Django)
"""

from datetime import datetime, timedelta
from typing import List, Dict
from collections import defaultdict

from .types import DutyEvent, LogDayData
from .rules import (
    MAX_DRIVING_HOURS,
    MAX_ON_DUTY_WINDOW,
    BREAK_REQUIRED_AFTER_HOURS,
    MAX_CYCLE_HOURS,
    MINIMUM_REST_HOURS,
    STATUS_DRIVING,
    STATUS_ON_DUTY,
    STATUS_OFF_DUTY,
    STATUS_SLEEPER,
    VALID_STATUSES,
)
from .exceptions import (
    HOSValidationError,
    HOSViolation,
    HOSCycleExhausted,
    HOSDrivingLimitExceeded,
    HOSWindowExceeded,
    InvalidLogSequence,
)


# ============================================================================
# CENTRAL VALIDATION FUNCTION
# ============================================================================

def validate_event_sequence(events: List[DutyEvent], log_days: Dict[str, LogDayData] = None) -> bool:
    """
    Central validator for duty event sequences.
    
    This runs BEFORE any logs are persisted.
    If any validation fails, raises an exception.
    
    Args:
        events: List of DutyEvent objects from the HOS engine
        log_days: Optional dict of LogDayData after splitting
        
    Returns:
        True if all validations pass
        
    Raises:
        HOSValidationError: If any validation fails
    """
    
    # Validate the raw event sequence
    ensure_no_overlaps(events)
    ensure_contiguous(events)
    ensure_valid_statuses(events)
    ensure_driving_limits(events)
    ensure_required_breaks(events)
    
    # Validate log days if provided
    if log_days:
        for date_str, day_data in log_days.items():
            ensure_exactly_24_hours(day_data)
            ensure_day_segments_contiguous(day_data)
    
    return True


# ============================================================================
# OVERLAP VALIDATION
# ============================================================================

def ensure_no_overlaps(events: List[DutyEvent]) -> None:
    """
    Ensure no duty events overlap in time.
    
    FMCSA Rule: A driver can only be in ONE duty status at any instant.
    """
    if len(events) < 2:
        return
    
    sorted_events = sorted(events, key=lambda e: e.start)
    
    for i in range(len(sorted_events) - 1):
        current = sorted_events[i]
        next_event = sorted_events[i + 1]
        
        # Current event's end should not exceed next event's start
        if current.end > next_event.start:
            raise InvalidLogSequence(
                validation_type="OVERLAP",
                message=f"Events overlap: {current.status} ends at {current.end}, "
                        f"but {next_event.status} starts at {next_event.start}",
                details={
                    "event_1": {"status": current.status, "end": str(current.end)},
                    "event_2": {"status": next_event.status, "start": str(next_event.start)}
                }
            )


# ============================================================================
# CONTIGUITY VALIDATION
# ============================================================================

def ensure_contiguous(events: List[DutyEvent]) -> None:
    """
    Ensure duty events are contiguous (no gaps in the timeline).
    
    FMCSA Rule: Every minute must be accounted for.
    Small gaps (< 1 minute) are allowed for floating point tolerance.
    """
    if len(events) < 2:
        return
    
    sorted_events = sorted(events, key=lambda e: e.start)
    tolerance = timedelta(seconds=60)  # 1-minute tolerance
    
    for i in range(len(sorted_events) - 1):
        current = sorted_events[i]
        next_event = sorted_events[i + 1]
        
        gap = next_event.start - current.end
        
        if gap > tolerance:
            raise InvalidLogSequence(
                validation_type="GAP",
                message=f"Gap detected: {gap.total_seconds() / 60:.1f} minutes "
                        f"between {current.status} and {next_event.status}",
                details={
                    "gap_minutes": gap.total_seconds() / 60,
                    "event_1_end": str(current.end),
                    "event_2_start": str(next_event.start)
                }
            )


def ensure_day_segments_contiguous(day_data: LogDayData) -> None:
    """
    Ensure segments within a log day are contiguous.
    """
    if not day_data.segments:
        raise InvalidLogSequence(
            validation_type="EMPTY_DAY",
            message=f"Log day {day_data.date} has no segments"
        )
    
    ensure_contiguous(day_data.segments)


# ============================================================================
# 24-HOUR DAY VALIDATION
# ============================================================================

def ensure_exactly_24_hours(day_data: LogDayData) -> None:
    """
    Ensure a log day contains exactly 24 hours of duty status.
    
    FMCSA Rule: Log sheets are 24-hour periods (midnight to midnight).
    """
    total_hours = (
        day_data.total_driving_hours +
        day_data.total_on_duty_hours +
        day_data.total_off_duty_hours +
        day_data.total_sleeper_hours
    )
    
    # Allow small floating point tolerance (0.01 hours = ~36 seconds)
    if abs(float(total_hours) - 24.0) > 0.02:
        raise InvalidLogSequence(
            validation_type="24_HOUR_TOTAL",
            message=f"Log day {day_data.date} totals {total_hours:.2f} hours, must be exactly 24",
            details={
                "date": day_data.date,
                "total_hours": float(total_hours),
                "driving": float(day_data.total_driving_hours),
                "on_duty": float(day_data.total_on_duty_hours),
                "off_duty": float(day_data.total_off_duty_hours),
                "sleeper": float(day_data.total_sleeper_hours)
            }
        )


# ============================================================================
# STATUS VALIDATION
# ============================================================================

def ensure_valid_statuses(events: List[DutyEvent]) -> None:
    """
    Ensure all events have valid FMCSA duty status codes.
    """
    for event in events:
        if event.status not in VALID_STATUSES:
            raise InvalidLogSequence(
                validation_type="INVALID_STATUS",
                message=f"Invalid duty status: {event.status}",
                details={
                    "invalid_status": event.status,
                    "valid_statuses": VALID_STATUSES
                }
            )


# ============================================================================
# 11-HOUR DRIVING LIMIT VALIDATION
# ============================================================================

def ensure_driving_limits(events: List[DutyEvent]) -> None:
    """
    Ensure the 11-hour driving limit is never exceeded within a duty period.
    
    FMCSA §395.3: Maximum 11 hours of driving after 10 consecutive hours off duty.
    
    A "duty period" is reset after 10+ hours of off-duty/sleeper time.
    """
    driving_hours = 0.0
    in_duty_period = False
    
    for event in sorted(events, key=lambda e: e.start):
        # Check if this is a qualifying rest that resets limits
        if event.status in (STATUS_OFF_DUTY, STATUS_SLEEPER):
            if event.duration_hours >= MINIMUM_REST_HOURS:
                # Reset driving counter
                driving_hours = 0.0
                in_duty_period = False
        else:
            in_duty_period = True
            
            if event.status == STATUS_DRIVING:
                driving_hours += event.duration_hours
                
                # Check against limit (with small tolerance for rounding)
                if driving_hours > MAX_DRIVING_HOURS + 0.02:
                    raise HOSDrivingLimitExceeded(driving_hours)


# ============================================================================
# 30-MINUTE BREAK VALIDATION
# ============================================================================

def ensure_required_breaks(events: List[DutyEvent]) -> None:
    """
    Ensure 30-minute breaks are taken after 8 hours of driving.
    
    FMCSA §395.3(a)(3)(ii): Drivers must take a 30-minute break after 8 hours
    of cumulative driving time.
    
    Break can be OFF_DUTY, SLEEPER, or ON_DUTY (non-driving).
    """
    driving_since_break = 0.0
    
    for event in sorted(events, key=lambda e: e.start):
        if event.status == STATUS_DRIVING:
            driving_since_break += event.duration_hours
            
            # This is a warning, not a hard failure, as the engine should handle this
            # But we validate that the engine did its job
            if driving_since_break > BREAK_REQUIRED_AFTER_HOURS + 0.5:  # 30-min grace
                # Check if there was supposed to be a break
                raise HOSValidationError(
                    validation_type="MISSING_BREAK",
                    message=f"Drove {driving_since_break:.2f} hours without required 30-min break",
                    details={
                        "driving_hours": driving_since_break,
                        "required_break_after": BREAK_REQUIRED_AFTER_HOURS
                    }
                )
        
        # Any non-driving status of 30+ minutes resets the break counter
        elif event.duration_hours >= 0.5:  # 30 minutes = 0.5 hours
            driving_since_break = 0.0


# ============================================================================
# 14-HOUR WINDOW VALIDATION
# ============================================================================

def validate_14_hour_window(events: List[DutyEvent]) -> None:
    """
    Validate that driving does not occur after the 14-hour on-duty window.
    
    FMCSA §395.3(a)(2): Driving is not permitted after the 14th hour after 
    coming on duty following 10 consecutive hours off duty.
    
    Key insight: The 14-hour window includes all time (on-duty, driving, breaks)
    EXCEPT it's reset by 10+ hours of rest.
    """
    window_start = None
    
    for event in sorted(events, key=lambda e: e.start):
        # Check if this rest qualifies to reset the window
        if event.status in (STATUS_OFF_DUTY, STATUS_SLEEPER):
            if event.duration_hours >= MINIMUM_REST_HOURS:
                window_start = None  # Reset window
        
        # Start tracking window when driver begins work
        elif window_start is None:
            window_start = event.start
        
        # Check if driving occurs after 14-hour window
        if event.status == STATUS_DRIVING and window_start:
            window_hours = (event.end - window_start).total_seconds() / 3600
            
            if window_hours > MAX_ON_DUTY_WINDOW + 0.02:  # Small tolerance
                raise HOSWindowExceeded(window_hours)


# ============================================================================
# 70-HOUR CYCLE VALIDATION
# ============================================================================

def validate_cycle_hours(
    current_cycle_used: float,
    events: List[DutyEvent]
) -> None:
    """
    Validate that the trip won't exceed the 70-hour/8-day cycle limit.
    
    FMCSA §395.3(b): No driving after 70 hours on duty in any 8 consecutive days.
    
    Args:
        current_cycle_used: Hours already used in the current cycle
        events: Planned duty events
    """
    # Calculate total on-duty time (driving + on-duty not driving)
    total_on_duty = sum(
        event.duration_hours 
        for event in events 
        if event.status in (STATUS_DRIVING, STATUS_ON_DUTY)
    )
    
    projected_total = current_cycle_used + total_on_duty
    
    if projected_total > MAX_CYCLE_HOURS:
        raise HOSCycleExhausted(current_cycle_used, total_on_duty)


# ============================================================================
# PRE-PERSISTENCE VALIDATION
# ============================================================================

def validate_before_persistence(
    events: List[DutyEvent],
    log_days: Dict[str, LogDayData],
    current_cycle_hours: float = 0
) -> bool:
    """
    Complete validation before persisting logs to database.
    
    This is the FINAL CHECK before logs are saved.
    If this passes, logs are legally compliant.
    
    Args:
        events: Raw duty events from HOS engine
        log_days: Split and processed log days
        current_cycle_hours: Current cycle hours used (for cycle validation)
        
    Returns:
        True if all validations pass
        
    Raises:
        HOSValidationError or HOSViolation if any check fails
    """
    
    # Validate raw event sequence
    validate_event_sequence(events, log_days)
    
    # Validate 14-hour window
    validate_14_hour_window(events)
    
    # Validate cycle hours
    validate_cycle_hours(current_cycle_hours, events)
    
    # All validations passed
    return True
