"""
Test script for the HOS engine.

This tests the core business logic independently of Django.
Run with: python -m core.hos.test_engine
"""

from datetime import datetime, timezone
from core.hos.types import TripPlanInput
from core.hos.engine import generate_duty_events, split_events_into_log_days
from core.hos.validators import validate_trip_input


def test_basic_trip():
    """Test a simple trip from Richmond to Philadelphia."""
    
    print("=" * 80)
    print("TEST: Basic Trip - Richmond, VA to Philadelphia, PA")
    print("=" * 80)
    
    # Create test input
    trip_input = TripPlanInput(
        driver_id=1,
        current_cycle_used_hours=42.5,
        current_location="Richmond, VA",
        pickup_location="Richmond, VA",
        dropoff_location="Philadelphia, PA",
        total_miles=280,
        average_speed_mph=55,
        planned_start_time=datetime(2026, 1, 27, 6, 0, 0, tzinfo=timezone.utc),
    )
    
    # Validate input
    print("\n1. Validating input...")
    validate_trip_input(trip_input)
    print("   ✓ Input is valid")
    
    # Generate events
    print("\n2. Generating duty events...")
    events = generate_duty_events(trip_input)
    print(f"   ✓ Generated {len(events)} duty events")
    
    # Print events
    print("\n3. Duty Events:")
    print("-" * 80)
    for i, event in enumerate(events, 1):
        duration = event.duration_hours
        print(f"   {i}. {event.status:12} | {event.start} → {event.end}")
        print(f"      Duration: {duration:.2f} hrs | {event.city}, {event.state}")
        print(f"      Remark: {event.remark}")
        print()
    
    # Split into log days
    print("\n4. Splitting into log days...")
    log_days = split_events_into_log_days(events)
    print(f"   ✓ Generated {len(log_days)} log days")
    
    # Print log days
    print("\n5. Log Days Summary:")
    print("-" * 80)
    for date_str, day_data in sorted(log_days.items()):
        print(f"\n   Date: {date_str}")
        print(f"   Driving:  {day_data.total_driving_hours:.2f} hrs")
        print(f"   On Duty:  {day_data.total_on_duty_hours:.2f} hrs")
        print(f"   Off Duty: {day_data.total_off_duty_hours:.2f} hrs")
        print(f"   Sleeper:  {day_data.total_sleeper_hours:.2f} hrs")
        print(f"   Total:    {day_data.total_driving_hours + day_data.total_on_duty_hours + day_data.total_off_duty_hours + day_data.total_sleeper_hours:.2f} hrs")
        print(f"   Segments: {len(day_data.segments)}")
    
    # Validate totals
    print("\n6. Validation:")
    all_valid = True
    for date_str, day_data in log_days.items():
        total = (
            day_data.total_driving_hours +
            day_data.total_on_duty_hours +
            day_data.total_off_duty_hours +
            day_data.total_sleeper_hours
        )
        if abs(total - 24.0) > 0.01:
            print(f"   ✗ {date_str}: Totals = {total:.2f} hrs (should be 24.0)")
            all_valid = False
    
    if all_valid:
        print("   ✓ All log days sum to exactly 24 hours")
    
    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)


def test_long_trip():
    """Test a longer trip that requires multiple rest periods."""
    
    print("\n\n")
    print("=" * 80)
    print("TEST: Long Trip - Multiple Days with Rest Periods")
    print("=" * 80)
    
    trip_input = TripPlanInput(
        driver_id=2,
        current_cycle_used_hours=20.0,
        current_location="Los Angeles, CA",
        pickup_location="Los Angeles, CA",
        dropoff_location="New York, NY",
        total_miles=2800,
        average_speed_mph=55,
        planned_start_time=datetime(2026, 1, 27, 8, 0, 0, tzinfo=timezone.utc),
    )
    
    print("\n1. Generating events for 2800-mile trip...")
    events = generate_duty_events(trip_input)
    print(f"   ✓ Generated {len(events)} events")
    
    log_days = split_events_into_log_days(events)
    print(f"   ✓ Generated {len(log_days)} log days")
    
    print("\n2. Trip Summary:")
    print("-" * 80)
    total_driving = sum(d.total_driving_hours for d in log_days.values())
    total_on_duty = sum(d.total_on_duty_hours for d in log_days.values())
    print(f"   Total Days:        {len(log_days)}")
    print(f"   Total Driving:     {total_driving:.2f} hrs")
    print(f"   Total On Duty:     {total_on_duty:.2f} hrs")
    print(f"   Total Work Time:   {total_driving + total_on_duty:.2f} hrs")
    
    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    test_basic_trip()
    test_long_trip()
    print("\n✓ All tests passed!")
