"""
Logbook Generator - Route to LogDay/DutySegment Transformation

This module transforms route planning data into FMCSA-compliant logbook entries.

The transformation follows this mapping:
- Driving segments → DRIVING status
- 30-min breaks → OFF_DUTY status
- 10-hr rests → SLEEPER status
- Fuel stops → ON_DUTY status
- Pickup/Dropoff → ON_DUTY status

Critical Requirements:
1. Segments must be split at midnight (each LogDay = one calendar day)
2. Each LogDay must have exactly 24 hours of segments (no gaps)
3. Each segment must have location and remark for FMCSA compliance
4. Timestamps must be properly handled for timezone awareness

This is the bridge between route planning (distance-based) and
logbook records (time-based).
"""

import logging
from datetime import datetime, timedelta, date
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from collections import defaultdict

logger = logging.getLogger("hos")

# Duty status constants (matching DutySegment.STATUS_CHOICES)
STATUS_OFF_DUTY = "OFF_DUTY"
STATUS_SLEEPER = "SLEEPER"
STATUS_DRIVING = "DRIVING"
STATUS_ON_DUTY = "ON_DUTY"


@dataclass
class LogbookSegment:
    """
    A single duty segment for logbook generation.
    
    This is the intermediate format before creating DutySegment models.
    Represents one horizontal line on the FMCSA log graph.
    """
    start_time: datetime
    end_time: datetime
    status: str
    city: str
    state: str
    remark: str
    
    @property
    def duration_hours(self) -> float:
        """Calculate duration in hours."""
        delta = self.end_time - self.start_time
        return delta.total_seconds() / 3600


@dataclass
class LogDayRecord:
    """
    Represents one calendar day of duty records.
    
    This is the intermediate format before creating LogDay models.
    """
    date: date
    segments: List[LogbookSegment]
    total_driving_hours: float = 0.0
    total_on_duty_hours: float = 0.0
    total_off_duty_hours: float = 0.0
    total_sleeper_hours: float = 0.0


def generate_logbook_from_route(
    route_stops: List[dict],
    route_segments: List[dict],
    start_time: datetime,
    origin_city: str = "",
    origin_state: str = "",
    destination_city: str = "",
    destination_state: str = "",
) -> List[LogDayRecord]:
    """
    Transform route planning data into logbook records.
    
    This is THE CORE TRANSFORMATION function.
    
    Args:
        route_stops: List of stops from route planning (breaks, rests, fuel, etc.)
        route_segments: List of driving segments from route planning
        start_time: Trip start time
        origin_city/state: Origin location
        destination_city/state: Destination location
        
    Returns:
        List of LogDayRecord objects, one per calendar day
    """
    logger.info(f"Generating logbook from {len(route_segments)} segments and {len(route_stops)} stops")
    
    # Build timeline of all events in chronological order
    timeline: List[LogbookSegment] = []
    
    # Track current location
    current_city = origin_city or "Unknown"
    current_state = origin_state or ""
    
    # Sort stops by scheduled_arrival to get chronological order
    sorted_stops = sorted(
        [s for s in route_stops if s.get("scheduled_arrival")],
        key=lambda s: s["scheduled_arrival"]
    )
    
    # Create a merged timeline
    # We'll iterate through stops and fill in driving between them
    last_time = start_time
    
    for stop in sorted_stops:
        stop_arrival = datetime.fromisoformat(stop["scheduled_arrival"])
        stop_departure = datetime.fromisoformat(stop["scheduled_departure"])
        stop_city = stop.get("city", "Unknown")
        stop_state = stop.get("state", "")
        stop_type = stop["type"]
        
        # If there's a gap between last_time and stop_arrival, it's driving
        if stop_arrival > last_time:
            timeline.append(LogbookSegment(
                start_time=last_time,
                end_time=stop_arrival,
                status=STATUS_DRIVING,
                city=current_city,
                state=current_state,
                remark=f"Driving to {stop_city}, {stop_state}" if stop_city else "Driving"
            ))
        
        # Map stop type to duty status and remark
        status, remark = _map_stop_to_duty_status(stop_type, stop_city, stop_state, stop.get("label", ""))
        
        timeline.append(LogbookSegment(
            start_time=stop_arrival,
            end_time=stop_departure,
            status=status,
            city=stop_city,
            state=stop_state,
            remark=remark
        ))
        
        # Update tracking
        last_time = stop_departure
        if stop_city and stop_city != "Unknown":
            current_city = stop_city
            current_state = stop_state
    
    # Sort timeline by start time (should already be sorted but ensure it)
    timeline.sort(key=lambda s: s.start_time)
    
    if not timeline:
        logger.warning("No timeline generated from route data")
        return []
    
    # Split segments at midnight boundaries
    split_segments = _split_segments_at_midnight(timeline)
    
    # Group segments by date
    log_days = _group_segments_by_date(split_segments)
    
    # Fill gaps with OFF_DUTY and calculate totals
    for log_day in log_days:
        _fill_day_gaps(log_day)
        _calculate_day_totals(log_day)
    
    logger.info(f"Generated {len(log_days)} log days")
    return log_days


def _map_stop_to_duty_status(stop_type: str, city: str, state: str, label: str) -> Tuple[str, str]:
    """
    Map a stop type to FMCSA duty status and remark.
    
    Returns:
        Tuple of (status, remark)
    """
    location_suffix = f" - {city}, {state}" if city else ""
    
    if stop_type == "PICKUP":
        return STATUS_ON_DUTY, f"Pickup - Loading & Inspection{location_suffix}"
    elif stop_type == "DROPOFF":
        return STATUS_ON_DUTY, f"Dropoff - Unloading & Paperwork{location_suffix}"
    elif stop_type == "BREAK":
        return STATUS_OFF_DUTY, f"30-minute Break{location_suffix}"
    elif stop_type == "REST":
        return STATUS_SLEEPER, f"10-hour Rest Period{location_suffix}"
    elif stop_type == "FUEL":
        return STATUS_ON_DUTY, f"Fuel Stop{location_suffix}"
    else:
        return STATUS_OFF_DUTY, f"{label or stop_type}{location_suffix}"


def _split_segments_at_midnight(segments: List[LogbookSegment]) -> List[LogbookSegment]:
    """
    Split segments that span midnight into two separate segments.
    
    FMCSA logs are organized by calendar day (midnight to midnight).
    If a segment spans midnight, it must be split.
    
    Industry-correct logic:
    if segment.end_time.date() != segment.start_time.date():
        split_at_midnight()
    """
    result = []
    
    for segment in segments:
        start_date = segment.start_time.date()
        end_date = segment.end_time.date()
        
        if start_date == end_date:
            # Segment is within a single day
            result.append(segment)
        else:
            # Segment spans midnight - need to split
            current_start = segment.start_time
            current_date = start_date
            
            while current_date < end_date:
                # Calculate midnight of the next day
                next_date = current_date + timedelta(days=1)
                midnight = datetime.combine(next_date, datetime.min.time())
                
                # Preserve timezone if present
                if current_start.tzinfo:
                    midnight = midnight.replace(tzinfo=current_start.tzinfo)
                
                # Create segment from current_start to midnight
                result.append(LogbookSegment(
                    start_time=current_start,
                    end_time=midnight,
                    status=segment.status,
                    city=segment.city,
                    state=segment.state,
                    remark=segment.remark + " (cont'd)"
                ))
                
                # Move to next day
                current_start = midnight
                current_date = next_date
            
            # Create final segment from last midnight to actual end
            if current_start < segment.end_time:
                result.append(LogbookSegment(
                    start_time=current_start,
                    end_time=segment.end_time,
                    status=segment.status,
                    city=segment.city,
                    state=segment.state,
                    remark=segment.remark + " (cont'd from prev day)"
                ))
    
    return result


def _group_segments_by_date(segments: List[LogbookSegment]) -> List[LogDayRecord]:
    """
    Group segments by calendar date.
    """
    days_dict: Dict[date, List[LogbookSegment]] = defaultdict(list)
    
    for segment in segments:
        segment_date = segment.start_time.date()
        days_dict[segment_date].append(segment)
    
    # Convert to LogDayRecord objects, sorted by date
    log_days = []
    for day_date in sorted(days_dict.keys()):
        day_segments = sorted(days_dict[day_date], key=lambda s: s.start_time)
        log_days.append(LogDayRecord(
            date=day_date,
            segments=day_segments
        ))
    
    return log_days


def _fill_day_gaps(log_day: LogDayRecord) -> None:
    """
    Fill gaps in a log day with OFF_DUTY segments.
    
    FMCSA requires every minute of every day to be accounted for.
    Gaps are filled with OFF_DUTY status.
    """
    if not log_day.segments:
        return
    
    # Get timezone from existing segments
    tz = log_day.segments[0].start_time.tzinfo
    
    # Calculate day boundaries
    day_start = datetime.combine(log_day.date, datetime.min.time())
    day_end = datetime.combine(log_day.date + timedelta(days=1), datetime.min.time())
    
    if tz:
        day_start = day_start.replace(tzinfo=tz)
        day_end = day_end.replace(tzinfo=tz)
    
    filled_segments = []
    
    # Sort segments by start time
    sorted_segments = sorted(log_day.segments, key=lambda s: s.start_time)
    
    # Fill gap at start of day if needed
    first_segment = sorted_segments[0]
    if first_segment.start_time > day_start:
        filled_segments.append(LogbookSegment(
            start_time=day_start,
            end_time=first_segment.start_time,
            status=STATUS_OFF_DUTY,
            city=first_segment.city,
            state=first_segment.state,
            remark="Off duty"
        ))
    
    # Add existing segments and fill gaps between them
    for i, segment in enumerate(sorted_segments):
        filled_segments.append(segment)
        
        # Check for gap to next segment
        if i < len(sorted_segments) - 1:
            next_segment = sorted_segments[i + 1]
            if segment.end_time < next_segment.start_time:
                # Gap exists - fill with OFF_DUTY
                filled_segments.append(LogbookSegment(
                    start_time=segment.end_time,
                    end_time=next_segment.start_time,
                    status=STATUS_OFF_DUTY,
                    city=segment.city,
                    state=segment.state,
                    remark="Off duty"
                ))
    
    # Fill gap at end of day if needed
    last_segment = filled_segments[-1]
    if last_segment.end_time < day_end:
        filled_segments.append(LogbookSegment(
            start_time=last_segment.end_time,
            end_time=day_end,
            status=STATUS_OFF_DUTY,
            city=last_segment.city,
            state=last_segment.state,
            remark="Off duty"
        ))
    
    log_day.segments = filled_segments


def _calculate_day_totals(log_day: LogDayRecord) -> None:
    """
    Calculate total hours for each duty status in a log day.
    """
    totals = {
        STATUS_DRIVING: 0.0,
        STATUS_ON_DUTY: 0.0,
        STATUS_OFF_DUTY: 0.0,
        STATUS_SLEEPER: 0.0,
    }
    
    for segment in log_day.segments:
        if segment.status in totals:
            totals[segment.status] += segment.duration_hours
    
    log_day.total_driving_hours = round(totals[STATUS_DRIVING], 2)
    log_day.total_on_duty_hours = round(totals[STATUS_ON_DUTY], 2)
    log_day.total_off_duty_hours = round(totals[STATUS_OFF_DUTY], 2)
    log_day.total_sleeper_hours = round(totals[STATUS_SLEEPER], 2)


def generate_remarks(log_day: LogDayRecord) -> List[Dict[str, str]]:
    """
    Generate FMCSA-correct remarks for a log day.
    
    Remarks document each status change with:
    - Time of change
    - New status
    - Location
    
    Example:
        06:00 – Driving – Dallas, TX
        10:00 – Break – Little Rock, AR
        15:00 – Sleeper – Nashville, TN
    
    This powers:
    - Remarks table in UI
    - Tooltip on log canvas
    - DOT inspection readiness
    """
    remarks = []
    
    for segment in log_day.segments:
        # Format time (24-hour format as per FMCSA)
        time_str = segment.start_time.strftime("%H:%M")
        
        # Map status to display name
        status_names = {
            STATUS_DRIVING: "Driving",
            STATUS_ON_DUTY: "On Duty",
            STATUS_OFF_DUTY: "Off Duty",
            STATUS_SLEEPER: "Sleeper",
        }
        status_name = status_names.get(segment.status, segment.status)
        
        # Format location
        location = f"{segment.city}, {segment.state}" if segment.city else "Unknown location"
        
        remarks.append({
            "time": time_str,
            "status": status_name,
            "location": location,
            "remark": segment.remark
        })
    
    return remarks


def persist_logbook_to_database(
    trip_id: int,
    log_days: List[LogDayRecord]
) -> None:
    """
    Persist logbook records to the database.
    
    Creates LogDay and DutySegment records for a trip.
    
    Args:
        trip_id: ID of the Trip these logs belong to
        log_days: List of LogDayRecord objects to persist
    """
    from core.logs.models import LogDay, DutySegment
    from core.trips.models import Trip
    from decimal import Decimal
    
    trip = Trip.objects.get(pk=trip_id)
    
    logger.info(f"Persisting {len(log_days)} log days for trip {trip_id}")
    
    for log_day_record in log_days:
        # Create LogDay
        log_day = LogDay.objects.create(
            trip=trip,
            date=log_day_record.date,
            total_driving_hours=Decimal(str(log_day_record.total_driving_hours)),
            total_on_duty_hours=Decimal(str(log_day_record.total_on_duty_hours)),
            total_off_duty_hours=Decimal(str(log_day_record.total_off_duty_hours)),
            total_sleeper_hours=Decimal(str(log_day_record.total_sleeper_hours)),
        )
        
        # Create DutySegments
        for segment in log_day_record.segments:
            DutySegment.objects.create(
                log_day=log_day,
                start_time=segment.start_time,
                end_time=segment.end_time,
                status=segment.status,
                city=segment.city,
                state=segment.state,
                remark=segment.remark,
            )
        
        logger.debug(
            f"Created LogDay {log_day.date} with {len(log_day_record.segments)} segments: "
            f"Driving={log_day.total_driving_hours}h, "
            f"On-Duty={log_day.total_on_duty_hours}h, "
            f"Off-Duty={log_day.total_off_duty_hours}h, "
            f"Sleeper={log_day.total_sleeper_hours}h"
        )
    
    logger.info(f"Successfully persisted logbook for trip {trip_id}")
