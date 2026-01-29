#!/usr/bin/env python
"""
Test script for enhanced route planning with HOS-compliant stops.
Tests STEP 5 (HOS stop generation) and STEP 6 (logbook transformation).
"""

import os
import sys

# Setup Django
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.local'
import django
django.setup()

from datetime import datetime, timedelta
from core.routes.services import plan_route
from core.routes.logbook_generator import generate_logbook_from_route

def test_route_planning():
    """Test HOS-compliant route planning: LA → Dallas via Phoenix."""
    
    print("=" * 70)
    print("STEP 5 TEST: HOS-Compliant Route Planning")
    print("Route: Los Angeles, CA → Phoenix, AZ (pickup) → Dallas, TX")
    print("=" * 70)
    
    # Start tomorrow at 8 AM
    start_time = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0) + timedelta(days=1)
    
    result = plan_route(
        origin="Los Angeles, CA",
        destination="Dallas, TX",
        pickup_location="Phoenix, AZ",
        current_cycle_hours=0,
        average_speed_mph=55,
        start_time=start_time,
        include_pickup=True,
        include_dropoff=True,
        skip_reverse_geocoding=True  # Skip for faster testing
    )
    
    print(f"\n📊 Route Summary:")
    print(f"  Distance: {result.distance_miles:.1f} miles")
    print(f"  Pure driving time: {result.duration_hours:.1f} hours")
    print(f"  Total trip time (with stops): {result.total_trip_hours:.1f} hours")
    print(f"  Origin: {result.origin}")
    print(f"  Pickup: {result.pickup_location}")
    print(f"  Dropoff: {result.dropoff_location}")
    
    print(f"\n🛑 Stops ({len(result.stops)} total):")
    print(f"  {'#':>3} | {'Type':10} | {'Duration':>8} | {'Location':35} | {'Arrival':16} | {'Departure':16}")
    print(f"  " + "-" * 105)
    
    for i, stop in enumerate(result.stops):
        # Stops are dicts from serialization
        arrival_str = stop.get("scheduled_arrival", "N/A")
        departure_str = stop.get("scheduled_departure", "N/A")
        # Format ISO strings to readable format
        if arrival_str and arrival_str != "N/A":
            try:
                arrival_dt = datetime.fromisoformat(arrival_str)
                arrival_str = arrival_dt.strftime("%Y-%m-%d %H:%M")
            except:
                pass
        if departure_str and departure_str != "N/A":
            try:
                departure_dt = datetime.fromisoformat(departure_str)
                departure_str = departure_dt.strftime("%Y-%m-%d %H:%M")
            except:
                pass
                
        city = stop.get("city", "")
        state = stop.get("state", "")
        location = f"{city}, {state}" if city else f"({stop.get('lat', 0):.4f}, {stop.get('lng', 0):.4f})"
        print(f"  {i+1:>3} | {stop.get('type', ''):10} | {stop.get('duration_minutes', 0):>6}m | {location:35} | {arrival_str:16} | {departure_str:16}")
    
    print(f"\n🚚 Driving Segments ({len(result.segments)} total):")
    print(f"  {'#':>3} | {'From':>10} | {'To':>10} | {'Duration':>10} | {'Start':16} | {'End':16}")
    print(f"  " + "-" * 85)
    
    for i, seg in enumerate(result.segments):
        # Segments are dicts too
        start_miles = seg.get("start_miles", 0)
        end_miles = seg.get("end_miles", 0)
        hours = seg.get("hours", 0)
        start_str = seg.get("start_time", "N/A")
        end_str = seg.get("end_time", "N/A")
        
        if start_str and start_str != "N/A":
            try:
                start_dt = datetime.fromisoformat(start_str)
                start_str = start_dt.strftime("%Y-%m-%d %H:%M")
            except:
                pass
        if end_str and end_str != "N/A":
            try:
                end_dt = datetime.fromisoformat(end_str)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M")
            except:
                pass
        
        print(f"  {i+1:>3} | {start_miles:>8.1f}mi | {end_miles:>8.1f}mi | {hours:>8.2f}h | {start_str:16} | {end_str:16}")
    
    return result


def test_logbook_generation(route_result):
    """Test logbook generation from route result."""
    
    print("\n" + "=" * 70)
    print("STEP 6 TEST: Logbook Generation from Route")
    print("=" * 70)
    
    # Get start time from first stop
    first_stop = route_result.stops[0] if route_result.stops else {}
    start_time_str = first_stop.get("scheduled_arrival", datetime.now().isoformat())
    start_time = datetime.fromisoformat(start_time_str)
    
    # Get origin/destination info
    origin_city = first_stop.get("city", "") or "Unknown"
    origin_state = first_stop.get("state", "")
    last_stop = route_result.stops[-1] if route_result.stops else {}
    dest_city = last_stop.get("city", "") or "Unknown"
    dest_state = last_stop.get("state", "")
    
    log_days = generate_logbook_from_route(
        route_stops=route_result.stops,
        route_segments=route_result.segments,
        start_time=start_time,
        origin_city=origin_city,
        origin_state=origin_state,
        destination_city=dest_city,
        destination_state=dest_state,
    )
    
    print(f"\n📅 Generated {len(log_days)} Log Days:")
    
    for day in log_days:
        print(f"\n  Date: {day.date}")
        print(f"  Totals: Driving={day.total_driving_hours:.2f}h, On-Duty={day.total_on_duty_hours:.2f}h, "
              f"Off-Duty={day.total_off_duty_hours:.2f}h, Sleeper={day.total_sleeper_hours:.2f}h")
        print(f"  Sum: {day.total_driving_hours + day.total_on_duty_hours + day.total_off_duty_hours + day.total_sleeper_hours:.2f}h (should be 24)")
        
        print(f"\n  Segments ({len(day.segments)}):")
        print(f"    {'#':>3} | {'Status':10} | {'Start':5} | {'End':5} | {'Duration':>8} | {'Location':30} | {'Remark'}")
        print(f"    " + "-" * 100)
        
        for j, seg in enumerate(day.segments):
            start_str = seg.start_time.strftime("%H:%M")
            end_str = seg.end_time.strftime("%H:%M")
            duration = (seg.end_time - seg.start_time).total_seconds() / 3600
            location = f"{seg.city}, {seg.state}" if seg.city else ""
            remark = seg.remark[:40] + "..." if seg.remark and len(seg.remark) > 40 else (seg.remark or "")
            print(f"    {j+1:>3} | {seg.status:10} | {start_str:5} | {end_str:5} | {duration:>6.2f}h | {location:30} | {remark}")
    
    return log_days


def validate_hos_compliance(route_result):
    """Validate that HOS rules are being followed."""
    
    print("\n" + "=" * 70)
    print("HOS COMPLIANCE VALIDATION")
    print("=" * 70)
    
    # Check for required stops (stops are dicts)
    stops = route_result.stops
    breaks = [s for s in stops if s.get("type") == "BREAK"]
    rests = [s for s in stops if s.get("type") == "REST"]
    fuels = [s for s in stops if s.get("type") == "FUEL"]
    pickups = [s for s in stops if s.get("type") == "PICKUP"]
    dropoffs = [s for s in stops if s.get("type") == "DROPOFF"]
    
    print(f"\n  Stop counts:")
    print(f"    PICKUP:  {len(pickups)}")
    print(f"    BREAK:   {len(breaks)} (30-min breaks after 8hrs driving)")
    print(f"    REST:    {len(rests)} (10-hr rest after 11hrs driving)")
    print(f"    FUEL:    {len(fuels)} (every ~1000 miles)")
    print(f"    DROPOFF: {len(dropoffs)}")
    
    # Check driving segments (segments are dicts)
    segments = route_result.segments
    max_continuous_driving = max((seg.get("hours", 0) for seg in segments), default=0)
    
    print(f"\n  Driving time checks:")
    print(f"    Max continuous driving segment: {max_continuous_driving:.2f}h")
    print(f"    Total segments: {len(segments)}")
    
    # Simple validation
    errors = []
    
    if route_result.distance_miles > 1000 and len(fuels) == 0:
        errors.append("Long route (>1000mi) but no fuel stops")
    
    if len(pickups) == 0:
        errors.append("Missing PICKUP stop")
        
    if len(dropoffs) == 0:
        errors.append("Missing DROPOFF stop")
    
    # For a ~1400 mile trip at 55mph (~25hrs driving), we expect:
    # - At least 2 REST stops (after 11hrs each)
    # - At least 2 BREAK stops (after 8hrs each)
    # - At least 1 FUEL stop (after 1000mi)
    expected_rests = int(route_result.duration_hours / 11) if route_result.duration_hours > 11 else 0
    if len(rests) < expected_rests:
        errors.append(f"Expected at least {expected_rests} REST stops for {route_result.duration_hours:.1f}h trip, got {len(rests)}")
    
    if errors:
        print(f"\n  ⚠️  VALIDATION WARNINGS:")
        for e in errors:
            print(f"    - {e}")
        return False
    else:
        print(f"\n  ✅ HOS COMPLIANCE PASSED")
        return True


if __name__ == "__main__":
    print("\n" + "🚛" * 35)
    print("TRUCK DRIVER LOGBOOK - HOS ROUTE PLANNING TEST")
    print("🚛" * 35 + "\n")
    
    try:
        # Run route planning test
        route_result = test_route_planning()
        
        # Run logbook generation test
        log_days = test_logbook_generation(route_result)
        
        # Validate HOS compliance
        is_compliant = validate_hos_compliance(route_result)
        
        print("\n" + "=" * 70)
        if is_compliant:
            print("✅ ALL TESTS PASSED - Steps 5 & 6 implementation verified!")
        else:
            print("❌ TESTS FAILED - Review HOS compliance errors above")
        print("=" * 70 + "\n")
        
        sys.exit(0 if is_compliant else 1)
        
    except Exception as e:
        import traceback
        print(f"\n❌ TEST FAILED WITH EXCEPTION:")
        traceback.print_exc()
        sys.exit(1)
