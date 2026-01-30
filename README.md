# Truck Driver Logbook System

> **FMCSA-compliant Hours of Service (HOS) logbook system with intelligent route planning**

A full-stack web application for truck drivers that automatically generates legal logbooks based on FMCSA regulations, with real-time route planning, interactive map visualization, and mobile-responsive design.

![Architecture](https://img.shields.io/badge/Backend-Django%20REST-green) ![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-blue) ![Status](https://img.shields.io/badge/Status-Active-success)

## 🚀 Overview

This system helps truck drivers plan trips while automatically calculating required breaks and rest stops according to federal Hours of Service (HOS) regulations. It combines real-world routing data with FMCSA compliance rules to generate legally compliant logbooks.

### Key Capabilities

✅ **HOS-Compliant Route Planning** - Automatically inserts required breaks and rest stops  
✅ **Interactive Map Visualization** - View routes with color-coded stop markers on Leaflet maps  
✅ **Real-time Route Preview** - See your planned route as you type (debounced)  
✅ **Smart Location Input** - 40+ pre-configured US trucking cities with autocomplete  
✅ **Mobile-Responsive UI** - Full mobile support with touch-friendly controls  
✅ **FMCSA Regulations Enforced** - 11-hour drive limit, 14-hour window, 30-min breaks, 70-hour cycle

### Regulations Enforced

This system implements FMCSA Part 395 Hours of Service regulations:

| Regulation | Description |
|------------|-------------|
| **§395.3(a)(1)** | 11-hour driving limit per shift |
| **§395.3(a)(2)** | 14-hour on-duty window |
| **§395.3(a)(3)(ii)** | 30-minute break after 8 hours of driving |
| **§395.3(b)** | 70-hour/8-day cycle limit |
| **§395.3(c)** | 10-hour minimum off-duty rest |

## 📐 Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     React + TypeScript Frontend                   │
│           (Vite, React Query, Leaflet, TailwindCSS)              │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐         │
│  │ Trip Planner │  │  Route Map   │  │   Logbook     │         │
│  │   + Form     │  │  + Markers   │  │   Viewer      │         │
│  └──────────────┘  └──────────────┘  └───────────────┘         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API (JSON)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                 Django REST Framework Backend                     │
│                                                                   │
│  POST /api/routes/plan/  →  Route Planning Service               │
│  POST /api/trips/plan/   →  Trip Creation + HOS Engine           │
│  GET  /api/trips/{id}/route/ → Route with Geometry + Stops       │
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────┐        │
│  │ OpenRoute   │───▶│ HOS Engine  │───▶│ LogDay +     │        │
│  │ Service API │    │ + Validators│    │ DutySegments │        │
│  └─────────────┘    └─────────────┘    └──────────────┘        │
└──────────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Backend (Django)
- **Django 4.2** + **Django REST Framework** - API server
- **OpenRouteService API** - Real-world routing and distance calculations
- **SQLite** (default) or **PostgreSQL** - Database
- **Python 3.13** - Runtime

#### Frontend (React)
- **React 18** + **TypeScript** - UI framework
- **Vite** - Lightning-fast build tool
- **React Query (TanStack Query)** - Data fetching and caching
- **React Router** - Client-side routing
- **Leaflet** + **react-leaflet** - Interactive maps
- **TailwindCSS** - Utility-first styling
- **Heroicons** - Icon library
- **Sonner** - Toast notifications

## 🗂️ Project Structure

```
Truck Driver Logbook/
│
├── django-tdlogbook/          # Backend API
│   ├── core/
│   │   ├── drivers/           # Driver management
│   │   ├── trips/             # Trip planning + orchestration
│   │   ├── logs/              # Log storage and retrieval
│   │   ├── routes/            # Route planning service
│   │   │   ├── services.py    # OpenRouteService integration
│   │   │   ├── route_planner.py  # Stop insertion algorithm
│   │   │   └── logbook_generator.py  # Route → HOS logs
│   │   └── hos/               # HOS compliance engine
│   │       ├── engine.py      # Core log generation
│   │       ├── rules.py       # FMCSA constants
│   │       ├── validators.py  # Input validation
│   │       └── event_validators.py  # Output validation
│   ├── config/                # Django settings
│   ├── tests/                 # Test suite
│   └── requirements.txt
│
├── react-tdlogbook/           # Frontend UI
│   ├── src/
│   │   ├── api/               # API client (axios)
│   │   ├── components/
│   │   │   ├── layout/        # Header, Layout (responsive)
│   │   │   └── ui/            # Reusable components
│   │   ├── features/
│   │   │   ├── dashboard/     # Dashboard page
│   │   │   ├── logbook/       # Log viewing
│   │   │   ├── map/           # RouteMap with Leaflet
│   │   │   └── trip-planner/  # Trip planning form + status
│   │   ├── hooks/             # React Query hooks
│   │   ├── types/             # TypeScript type definitions
│   │   └── utils/             # Utility functions
│   ├── package.json
│   └── vite.config.ts
│
└── README.md                  # This file
```

## 🚦 Getting Started

### Prerequisites

- **Python 3.13+** (for backend)
- **Node.js 18+** and **npm** (for frontend)
- **OpenRouteService API key** (free tier available)

### 1️⃣ Backend Setup

```bash
# Navigate to backend directory
cd django-tdlogbook

# Create and activate virtual environment
python -m venv logbook-venv
source logbook-venv/bin/activate  # On Windows: logbook-venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create a test driver
python manage.py shell -c "
from core.drivers.models import Driver
Driver.objects.get_or_create(name='John Doe', defaults={'cycle_type': '70_8'})
print('✓ Test driver created (ID: 1)')
"

# Start Django development server
python manage.py runserver
```

Backend will run on **http://localhost:8000**

### 2️⃣ Frontend Setup

Open a **new terminal** window:

```bash
# Navigate to frontend directory
cd react-tdlogbook

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on **http://localhost:5173** (or 5174 if 5173 is taken)

### 3️⃣ Access the Application

Open your browser to **http://localhost:5173**

## 🎯 Quick Start Guide

### Planning Your First Trip

1. **Navigate to Trip Planner** (`/trips/new`)

2. **Fill in the form**:
   - **Current Location**: Type or select from dropdown (e.g., "Dallas, TX")
   - **Pickup Location**: Type, select, or use "Same as current"
   - **Dropoff Location**: Type or select destination (e.g., "Atlanta, GA")
   - **Planned Start Time**: Choose your departure date/time
   - **Total Miles**: Enter trip distance (or use route preview to auto-calculate)
   - **Average Speed**: Default 55 mph (adjustable)
   - **Current Cycle Hours**: How many hours you've already used in your 70-hour cycle

3. **Preview your route** (optional):
   - As you type locations, the map updates automatically
   - Shows pickup, required breaks, rest stops, and dropoff

4. **Generate HOS-Compliant Route**:
   - Click the submit button
   - System calculates required stops based on HOS rules
   - View your complete route with all stops on the map

### Understanding the Map

The interactive map displays your route with color-coded markers:

| Marker Color | Stop Type | Purpose |
|-------------|-----------|---------|
| 🟢 **Green** | PICKUP | Load pickup location |
| 🟡 **Yellow** | BREAK | 30-minute rest break (after 8h driving) |
| 🟣 **Purple** | REST | 10-hour sleeper berth rest |
| 🔴 **Red** | DROPOFF | Delivery dropoff location |

## 🔌 API Endpoints

### Route Planning
```http
POST /api/routes/plan/
Content-Type: application/json

{
  "origin": "Dallas, TX",
  "destination": "Atlanta, GA",
  "current_cycle_hours": 0,
  "average_speed_mph": 55
}
```

### Trip Planning
```http
POST /api/trips/plan/
Content-Type: application/json

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

### Get Trip Route
```http
GET /api/trips/{id}/route/
```

Returns:
- Route geometry (8000+ coordinate points for smooth polyline)
- All stops with types, locations, and reasons
- Distance and duration information

## 🧪 Testing

### Run HOS Compliance Test Suite

```bash
cd django-tdlogbook
python tests/test_hos_rules.py
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

### Manual API Testing

```bash
# Create a driver
curl -X POST http://localhost:8000/api/drivers/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Smith", "cycle_type": "70_8"}'

# Plan a route
curl -X POST http://localhost:8000/api/routes/plan/ \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "Dallas, TX",
    "destination": "Atlanta, GA",
    "current_cycle_hours": 0,
    "average_speed_mph": 55
  }'

# Plan a trip
curl -X POST http://localhost:8000/api/trips/plan/ \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": 1,
    "current_location": "Dallas, TX",
    "pickup_location": "Dallas, TX",
    "dropoff_location": "Atlanta, GA",
    "planned_start_time": "2026-01-29T06:00:00Z",
    "current_cycle_used_hours": 0,
    "total_miles": 782,
    "average_speed_mph": 55
  }'
```

## 📚 Documentation

Detailed documentation for each component:

- **[Backend README](django-tdlogbook/README.md)** - Django REST Framework API, HOS engine, route planning
- **[Frontend README](react-tdlogbook/README.md)** - React components, hooks, map integration

## 🛠️ How It Works

### Route Planning Algorithm

1. **Fetch Real Route**: Uses OpenRouteService to get actual driving route with distance and geometry
2. **Calculate Drive Time**: Based on distance and average speed (default 55 mph)
3. **Insert Required Stops**:
   - **30-minute break** after 8 hours of driving (§395.3(a)(3)(ii))
   - **10-hour rest** when 11-hour drive limit or 14-hour window is reached
   - **Fuel stops** every 1000 miles (configurable)
4. **Generate Map Visualization**: Display route polyline with color-coded markers

### HOS Engine Workflow

1. **Pickup Phase**: 1-hour ON_DUTY for loading
2. **Driving Phase**:
   - Drive in blocks (max 2 hours continuous for realism)
   - Monitor cumulative driving hours, on-duty hours, and cycle hours
   - Insert breaks and rest stops when limits are approached
3. **Dropoff Phase**: 1-hour ON_DUTY for unloading
4. **Validation**: Comprehensive checks against all FMCSA regulations
5. **Storage**: Save as LogDay objects with individual DutySegment records

### Data Model

```
Driver (1) ──→ (N) Trip (1) ──→ (N) LogDay (1) ──→ (N) DutySegment
```

- **Driver**: Name, cycle type (70/8 or 60/7)
- **Trip**: Planning inputs (locations, times, miles, cycle hours used)
- **LogDay**: One 24-hour log sheet with daily totals
- **DutySegment**: Individual duty status periods (OFF_DUTY, SLEEPER, DRIVING, ON_DUTY)

## 🎨 Key Features

### Smart Location Combobox

- Type any custom location OR select from 40+ pre-configured US cities
- Real-time filtering as you type
- Keyboard navigation (Arrow keys, Enter, Escape)
- Dropdown toggle for browsing all options
- "Same as current" option for pickup location

### Interactive Map

- **Pan and Zoom**: Click and drag to pan, scroll wheel to zoom
- **Auto-fit Bounds**: Map automatically centers on the entire route
- **Stop Information**: Hover over markers to see stop details
- **Legend**: Color-coded legend shows marker types
- **Responsive**: Touch-friendly on mobile devices

### Mobile Responsiveness

- Hamburger menu on screens < 768px
- Touch-optimized buttons and inputs
- Responsive map interactions
- Portrait and landscape support
- Optimized typography and spacing

## 🚀 Future Enhancements

- [x] Real route planning with APIs ✅
- [x] Interactive map visualization ✅
- [x] Mobile-responsive design ✅
- [ ] **Authentication & Authorization** - User accounts and permissions
- [ ] **60-hour/7-day cycle support** - Additional cycle type
- [ ] **Split sleeper berth provisions** - Advanced rest splitting
- [ ] **ELD Integration** - Electronic Logging Device connectivity
- [ ] **Violation Detection** - Real-time HOS violation warnings
- [ ] **PDF Export** - Official log format export
- [ ] **Multi-day Trip Planning** - Trips spanning multiple days
- [ ] **Driver Dashboard** - Current HOS status and remaining hours

## 🐛 Error Handling

The system provides clear, professional error messages for compliance violations:

| Scenario | Error Message |
|----------|---------------|
| Cycle limit exceeded | `"Cycle limit exceeded: 72.5 hours exceeds 70-hour maximum"` |
| Daily driving limit | `"Daily driving limit exceeded: 11.5 hours on 2026-01-27"` |
| Invalid event sequence | `"Events overlap: DRIVING ends at 14:00, but ON_DUTY starts at 13:30"` |

## 📝 Logging

All HOS compliance decisions are logged for traceability:

```
[HOS] INFO 2026-01-27 | Starting log generation for trip 12 (driver: John Doe, Dallas → Atlanta)
[HOS] INFO 2026-01-27 | Generated 8 duty events for trip 12
[HOS] WARNING 2026-01-27 | Forcing rest due to 14-hour window exceeded
[HOS] INFO 2026-01-27 | HOS validation passed for trip 12
[HOS] INFO 2026-01-27 | Successfully generated 2 log days for trip 12
```

## 🌐 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Modern mobile browsers

## 📄 License

Proprietary - All Rights Reserved

## 👨‍💻 Development

### Backend Development

```bash
cd django-tdlogbook
source logbook-venv/bin/activate
python manage.py runserver
```

### Frontend Development

```bash
cd react-tdlogbook
npm run dev
```

### Type Checking (Frontend)

```bash
npm run type-check
```

### Linting (Frontend)

```bash
npm run lint
```

## 🙏 Acknowledgments

- **FMCSA** for establishing Hours of Service regulations
- **OpenRouteService** for routing API
- **Leaflet** for map visualization
- **React** and **Django** communities

---
