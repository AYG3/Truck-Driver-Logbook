# Truck Driver Logbook - Backend

FMCSA-compliant Hours of Service (HOS) logbook system built with Django.

## Overview

This backend generates legal truck driver logs based on FMCSA (Federal Motor Carrier Safety Administration) regulations. It enforces:

- 11-hour driving limit (§395.3(a)(1))
- 14-hour on-duty window (§395.3(a)(2))
- 30-minute break requirements (§395.3(a)(3)(ii))
- 70-hour/8-day cycle limits (§395.3(b))
- 10-hour rest requirements (§395.3(a)(1))

## Architecture

```
POST /trips/plan
     │
     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Trip       │───▶│   Celery     │───▶│   LogDay     │
│  (PENDING)   │    │   Worker     │    │  DutySegment │
└──────────────┘    └──────────────┘    └──────────────┘
     │                     │
     ▼                     ▼
GET /trips/{id}/status    HOS Engine
     │                     │
     ▼                     ▼
{status: "COMPLETED"}     Validation
```

### Key Design Principles

1. **Backend-First Compliance**: Rules are enforced server-side, not client-side
2. **Deterministic Generation**: Same input always produces same output
3. **Atomic Persistence**: Logs are saved transactionally (all or nothing)
4. **Async Processing**: Long-running generation via Celery with status polling
5. **Three-Layer Validation**: Input → Engine → Database

### Project Structure

```
django-tdlogbook/
├── config/              # Django settings and configuration
│   ├── settings/
│   │   ├── base.py     # Shared settings + logging
│   │   ├── local.py    # Development settings
│   │   └── production.py
│   ├── celery.py       # Celery configuration
│   └── urls.py
│
├── core/
│   ├── drivers/        # Driver management
│   ├── trips/          # Trip planning + status tracking
│   │   ├── models.py   # Trip with status (PENDING/PROCESSING/COMPLETED/FAILED)
│   │   ├── tasks.py    # Celery task with lifecycle management
│   │   ├── services.py # Orchestration layer
│   │   └── views.py    # REST endpoints + status polling
│   ├── logs/           # Log storage and retrieval
│   └── hos/            # HOS engine (pure business logic)
│       ├── engine.py   # Core log generation algorithm
│       ├── rules.py    # FMCSA constants (env-configurable)
│       ├── types.py    # Data structures
│       ├── validators.py  # Input validation
│       ├── event_validators.py  # Output validation
│       └── exceptions.py  # Domain exceptions
│
├── tests/
│   └── test_hos_rules.py  # Comprehensive HOS compliance tests
│
├── .env.example        # Environment configuration template
├── manage.py
└── requirements.txt
```

## Assessment Assumptions

This implementation explicitly assumes:

| Assumption | Value | Reference |
|------------|-------|-----------|
| Driver Type | Property-carrying | FMCSA Part 395 |
| Cycle Type | 70 hours / 8 days | §395.3(b) |
| Driving Conditions | Normal (no adverse) | §395.1(b)(1) |
| Pickup Duration | 1 hour | Fixed assumption |
| Dropoff Duration | 1 hour | Fixed assumption |
| Fuel Stop Interval | Every 1,000 miles | Fixed assumption |

These are configurable via environment variables (see `.env.example`).

## Setup

### Prerequisites

- Python 3.10+
- PostgreSQL
- Redis (for Celery)

### Installation

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up PostgreSQL database:
```bash
createdb tdlogbook
```

4. Run migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

5. Create superuser (optional):
```bash
python manage.py createsuperuser
```

### Running the Application

1. Start Django server:
```bash
python manage.py runserver
```

2. Start Celery worker (in another terminal):
```bash
celery -A config worker --loglevel=info
```

3. Start Redis (if not running):
```bash
redis-server
```

## API Endpoints

### Drivers

- `GET /api/drivers/` - List all drivers
- `POST /api/drivers/` - Create a driver
- `GET /api/drivers/{id}/` - Get driver details

### Trip Planning

- `POST /api/trips/plan/` - Plan a trip and generate logs
- `GET /api/trips/{id}/status/` - Poll processing status

Example request:
```json
{
  "driver_id": 1,
  "current_location": "Richmond, VA",
  "pickup_location": "Richmond, VA",
  "dropoff_location": "Philadelphia, PA",
  "planned_start_time": "2026-01-27T06:00:00Z",
  "current_cycle_used_hours": 42.5,
  "total_miles": 280,
  "average_speed_mph": 55
}
```

Status response:
```json
{
  "trip_id": 1,
  "status": "COMPLETED",
  "error": null
}
```

### Logs

- `GET /api/logs/trip/{trip_id}/` - Get all logs for a trip
- `GET /api/logs/days/` - List all log days
- `GET /api/logs/days/{id}/` - Get specific log day with segments

## Testing

### HOS Rules Compliance Test Suite

```bash
cd django-tdlogbook
python3 tests/test_hos_rules.py
```

Expected output:
```
======================================================================
FMCSA HOS RULES COMPLIANCE TEST SUITE
======================================================================
✅ 11-Hour Driving Limit
✅ 14-Hour On-Duty Window
✅ 30-Minute Break Validation
✅ 70-Hour Cycle Validation
✅ Midnight Boundary Splitting
✅ Zero-Driving Validation
✅ Trip Planning
✅ Event Validators
✅ Comprehensive Validation Pipeline

TEST RESULTS: 9 passed, 0 failed out of 9 total
✅ ALL TESTS PASSED - HOS rules are correctly enforced!
```

### API Integration Test

Create a test driver and plan a trip:

```bash
# Create a driver
curl -X POST http://localhost:8000/api/drivers/ \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "cycle_type": "70_8"}'

# Plan a trip
curl -X POST http://localhost:8000/api/trips/plan/ \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": 1,
    "current_location": "Richmond, VA",
    "pickup_location": "Richmond, VA",
    "dropoff_location": "Philadelphia, PA",
    "planned_start_time": "2026-01-27T06:00:00Z",
    "current_cycle_used_hours": 42.5,
    "total_miles": 280,
    "average_speed_mph": 55
  }'

# Get generated logs
curl http://localhost:8000/api/logs/trip/1/
```

## HOS Engine Details

The HOS engine (`core/hos/engine.py`) implements the following algorithm:

1. **Pickup Phase**: 1-hour ON_DUTY for loading
2. **Driving Phase**: 
   - Drive in blocks (max 2 hours continuous)
   - Add fuel stops every 1000 miles
   - Add 30-minute break after 8 hours driving
   - Enforce 11-hour driving limit
   - Enforce 14-hour on-duty window
   - Force 10-hour rest when limits are hit
3. **Dropoff Phase**: 1-hour ON_DUTY for unloading
4. **Split by Calendar Day**: Logs are split at midnight
5. **Fill Gaps**: Any unaccounted time is marked OFF_DUTY

## Database Schema

```
Driver (1) → (N) Trip (1) → (N) LogDay (1) → (N) DutySegment
```

- **Driver**: Name and cycle type
- **Trip**: Planning input (locations, times, cycle hours used)
- **LogDay**: One 24-hour log sheet with daily totals
- **DutySegment**: Individual duty status periods (OFF_DUTY, SLEEPER, DRIVING, ON_DUTY)

## Compliance Notes

This system enforces FMCSA Part 395 Hours of Service regulations:

- **§395.3**: Maximum driving time (11 hours)
- **§395.3(a)(2)**: 30-minute break requirement
- **§395.3(a)(3)(ii)**: 14-hour on-duty window
- **§395.3(b)**: 70-hour/8-day cycle limit
- **§395.3(c)**: 10-hour minimum off-duty time

## Future Enhancements

- [ ] Authentication and authorization
- [ ] 60-hour/7-day cycle support
- [ ] Split sleeper berth provisions
- [ ] ELD (Electronic Logging Device) integration
- [ ] Real route planning with APIs (Google Maps, etc.)
- [ ] Violation detection and warnings
- [ ] Export to PDF (official log format)

## Error Handling

Professional error messages are returned for compliance violations:

| Scenario | Error Message |
|----------|---------------|
| Cycle limit | "Cycle limit exceeded: 72.5 hours exceeds 70-hour maximum" |
| Driving limit | "Daily driving limit exceeded: 11.5 hours on 2026-01-27" |
| Invalid sequence | "Events overlap: DRIVING ends at 14:00, but ON_DUTY starts at 13:30" |

## Logging

All HOS compliance decisions are logged for traceability:

```
[HOS] INFO 2026-01-27 | Starting log generation for trip 12 (driver: John Doe, Richmond → Philadelphia)
[HOS] INFO 2026-01-27 | Generated 6 duty events for trip 12
[HOS] WARNING 2026-01-27 | Forcing rest due to 14-hour window exceeded
[HOS] INFO 2026-01-27 | HOS validation passed for trip 12
[HOS] INFO 2026-01-27 | Successfully generated 1 log days for trip 12
```

## License

Proprietary - All Rights Reserved
