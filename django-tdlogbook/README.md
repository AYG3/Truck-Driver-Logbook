# Truck Driver Logbook

FMCSA-compliant Hours of Service (HOS) logbook system with intelligent route planning built with Django REST Framework and React.

## Overview

This system generates legal truck driver logs based on FMCSA (Federal Motor Carrier Safety Administration) regulations and provides HOS-compliant route planning with required stops. It enforces:

- 11-hour driving limit (§395.3(a)(1))
- 14-hour on-duty window (§395.3(a)(2))
- 30-minute break requirements (§395.3(a)(3)(ii))
- 70-hour/8-day cycle limits (§395.3(b))
- 10-hour rest requirements (§395.3(a)(1))

### Key Features

- **HOS-Compliant Route Planning**: Automatically calculates required rest stops and breaks
- **Interactive Map Visualization**: View routes with pickup, break, rest, and dropoff stops
- **Real-time Route Preview**: See your planned route on the map before submitting
- **Smart Location Input**: Combobox with 40+ common US trucking cities, or type custom locations
- **Mobile-Responsive UI**: Full mobile support with hamburger menu navigation

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      React Frontend                          │
│  (Vite + React Query + Leaflet Maps + TailwindCSS)          │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐       │
│  │ Trip Planner│  │  Route Map  │  │   Logbook    │       │
│  └─────────────┘  └─────────────┘  └──────────────┘       │
└──────────────────────┬───────────────────────────────────────┘
                       │ REST API
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                   Django REST Framework                       │
│                                                              │
│  POST /api/routes/plan/  →  Route Planning Service          │
│  POST /api/trips/plan/   →  Trip Creation + HOS Engine      │
│  GET  /api/trips/{id}/route/ → Route with Stops             │
│                                                              │
│  ┌────────────┐    ┌────────────┐    ┌─────────────┐       │
│  │  OpenRoute │───▶│ HOS Engine │───▶│  LogDay     │       │
│  │  Service   │    │  + Rules   │    │  Segments   │       │
│  └────────────┘    └────────────┘    └─────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Backend-First Business Logic**: HOS rules enforced at the backend to ensure compliance
2. **Service Layer Architecture**: Clean separation between API, business logic, and data layers
3. **Type Safety**: Comprehensive dataclasses for type checking and validation
4. **Testability**: Pure functions in HOS engine enable thorough unit testing
5. **Extensibility**: Plugin architecture for different cycle types and regulations

## Project Structure

```
django-tdlogbook/              # Backend (Django REST Framework)
├── config/                    # Django settings and configuration
│   ├── settings/
│   │   ├── base.py           # Shared settings + logging
│   │   ├── local.py          # Development settings
│   │   └── production.py     # Production settings
│   └── urls.py               # URL routing
│
├── core/
│   ├── drivers/              # Driver management
│   │   ├── models.py         # Driver model
│   │   ├── serializers.py    # API serializers
│   │   └── views.py          # REST endpoints
│   ├── trips/                # Trip planning + status tracking
│   │   ├── models.py         # Trip model with route data
│   │   ├── services.py       # Trip orchestration
│   │   └── views.py          # REST endpoints
│   ├── logs/                 # Log storage and retrieval
│   │   ├── models.py         # LogDay and DutySegment models
│   │   ├── selectors.py      # Query logic
│   │   └── views.py          # Log viewing endpoints
│   ├── routes/               # Route planning service
│   │   ├── services.py       # OpenRouteService integration
│   │   ├── logbook_generator.py  # Convert routes to HOS logs
│   │   ├── route_planner.py  # Stop insertion algorithm
│   │   └── views.py          # Route planning API
│   └── hos/                  # HOS engine (pure business logic)
│       ├── engine.py         # Core log generation algorithm
│       ├── rules.py          # FMCSA constants and limits
│       ├── types.py          # Data structures (dataclasses)
│       ├── validators.py     # Input validation
│       ├── event_validators.py  # Output validation
│       └── exceptions.py     # Domain exceptions
│
├── tests/
│   └── test_hos_rules.py     # Comprehensive HOS compliance tests
│
├── manage.py
└── requirements.txt
```

## Prerequisites

- Python 3.13+
- Node.js 18+ and npm (for frontend)
- SQLite (default) or PostgreSQL

### Backend Setup

1. Navigate to backend directory:
```bash
cd django-tdlogbook
```

2. Create virtual environment:
```bash
python -m venv logbook-venv
source logbook-venv/bin/activate  # On Windows: logbook-venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run migrations:
```bash
python manage.py migrate
```

5. Create a test driver:
```bash
python manage.py shell -c "
from core.drivers.models import Driver
Driver.objects.get_or_create(name='John Doe', defaults={'cycle_type': '70_8'})
print('✓ Test driver created')
"
```

6. Start Django server:
```bash
python manage.py runserver
```

Backend will run on `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory (in a new terminal):
```bash
cd react-tdlogbook
```

2. Install dependencies:
```bash
npm install
```

3. Start dev server:
```bash
npm run dev
```

Frontend will run on `http://localhost:5173` (or 5174 if 5173 is taken)

### Quick Start

1. Open `http://localhost:5173` in your browser
2. Navigate to **Trip Planner**
3. Fill in the form:
   - Current Location: Type or select a city (e.g., "Dallas, TX")
   - Pickup Location: Type or select (e.g., "Dallas, TX" or "Same as current")
   - Dropoff Location: Type or select (e.g., "Atlanta, GA")
   - Planned Start Time: Choose date/time for trip start
   - Total Miles: Enter distance
   - Average Speed: Default 55 mph
   - Current Cycle Hours: Hours already used in 70-hour cycle
4. Click **Generate HOS-Compliant Route**
5. View your route with automatic stops on the interactive map

## API Endpoints

### Route Planning

- `POST /api/routes/plan/` - Calculate HOS-compliant route with stops

Example request:
```json
{
  "origin": "Dallas, TX",
  "destination": "Atlanta, GA",
  "current_cycle_hours": 0,
  "average_speed_mph": 55
}
```

Example response:
```json
{
  "success": true,
  "distance_miles": 782.7,
  "duration_hours": 14.23,
  "stops": [
    {"type": "PICKUP", "location": "Dallas, TX", "reason": "Load pickup"},
    {"type": "BREAK", "location": "Texarkana, TX", "reason": "30-min break after 8h driving"},
    {"type": "REST", "location": "Monroe, LA", "reason": "10-hour rest (14h window)"},
    {"type": "DROPOFF", "location": "Atlanta, GA", "reason": "Delivery dropoff"}
  ],
  "geometry": [[lat, lng], [lat, lng], ...],  // 8000+ points for map
  "route_data": {
    "total_driving_hours": 14.23,
    "breaks_count": 1,
    "rest_count": 1
  }
}
```

### Drivers

- `GET /api/drivers/` - List all drivers
- `POST /api/drivers/` - Create a driver
- `GET /api/drivers/{id}/` - Get driver details

### Trip Planning

- `POST /api/trips/plan/` - Plan a trip and generate logs
- `GET /api/trips/{id}/` - Get trip details
- `GET /api/trips/{id}/route/` - Get trip route with geometry and stops

Example request:
```json
{
  "driver_id": 1,
  "current_location": "Dallas, TX",
  "pickup_location": "Dallas, TX",
  "dropoff_location": "Atlanta, GA",
  "planned_start_time": "2026-01-29T06:00:00Z",
  "current_cycle_used_hours": 0,
  "total_miles": 782,
  "average_speed_mph": 55
}
```

Response includes `trip_id`, `status`, and route data with stops.

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

The HOS engine ([core/hos/engine.py](core/hos/engine.py)) implements the following algorithm:

1. **Pickup Phase**: 1-hour ON_DUTY for loading
2. **Driving Phase**: 
   - Drive in blocks (max 2 hours continuous)
   - Add fuel stops every 1000 miles
   - Insert 30-minute breaks after 8 hours of driving
   - Insert 10-hour rest when limits are reached (11-hour drive or 14-hour window)
3. **Dropoff Phase**: 1-hour ON_DUTY for unloading
4. **Validation**: Comprehensive checks for all FMCSA regulations

## Technology Stack

### Backend
- Django 4.2 + Django REST Framework
- OpenRouteService API (route planning)
- SQLite (default) / PostgreSQL
- Python 3.13

### Frontend
- React 18 with TypeScript
- Vite (build tool)
- React Query (data fetching)
- Leaflet + react-leaflet (maps)
- TailwindCSS (styling)
- Heroicons (icons)

## Route Planning Features

The route planning system calculates HOS-compliant routes by:

1. **Fetching Real Routes**: Uses OpenRouteService to get actual driving routes with distance and geometry
2. **Calculating Drive Time**: Based on distance and average speed
3. **Inserting Required Stops**:
   - **30-minute break** after 8 hours of driving (§395.3(a)(3)(ii))
   - **10-hour rest** when 11-hour drive limit or 14-hour window is reached
   - **Fuel stops** every 1000 miles (configurable)
4. **Map Visualization**: Displays route polyline with color-coded stop markers

### Stop Types

| Type | Icon Color | Purpose |
|------|-----------|---------|
| PICKUP | 🟢 Green | Load pickup location |
| BREAK | 🟡 Yellow | 30-minute rest break |
| REST | 🟣 Purple | 10-hour sleeper berth rest |
| DROPOFF | 🔴 Red | Delivery dropoff location |

## Data Model

```
Driver (1) → (N) Trip (1) → (N) LogDay (1) → (N) DutySegment
```

- **Driver**: Name and cycle type
- **Trip**: Planning input (locations, times, cycle hours used)
- **LogDay**: One 24-hour log sheet with daily totals
- **DutySegment**: Individual duty status periods (OFF_DUTY, SLEEPER, DRIVING, ON_DUTY)

## Future Enhancements

- [x] Real route planning with APIs ✅
- [x] Interactive map visualization ✅
- [x] Mobile-responsive design ✅
- [ ] Authentication and authorization
- [ ] 60-hour/7-day cycle support
- [ ] Split sleeper berth provisions
- [ ] ELD (Electronic Logging Device) integration
- [ ] Violation detection and warnings
- [ ] Export to PDF (official log format)
- [ ] Multi-day trip planning
- [ ] Driver dashboard with current HOS status

## Compliance Notes

This system enforces FMCSA Part 395 Hours of Service regulations:

- **§395.3(a)(1)**: Maximum driving time (11 hours)
- **§395.3(a)(2)**: 14-hour on-duty window
- **§395.3(a)(3)(ii)**: 30-minute break requirement
- **§395.3(b)**: 70-hour/8-day cycle limit
- **§395.3(c)**: 10-hour minimum off-duty time

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
