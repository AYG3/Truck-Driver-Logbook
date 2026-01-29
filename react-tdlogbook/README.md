# Truck Driver Logbook - Frontend

React + TypeScript frontend for the FMCSA-compliant Hours of Service (HOS) logbook system with interactive route planning and visualization.

## Features

- **🗺️ Interactive Route Planning**: Plan HOS-compliant trips with automatic break and rest stop calculation
- **📍 Smart Location Input**: Combobox with 40+ common US trucking cities, with autocomplete filtering and custom input support
- **🗾 Live Map Visualization**: View routes on interactive Leaflet maps with color-coded stop markers
- **⚡ Real-time Route Preview**: See your planned route on the map before submitting
- **📱 Mobile-Responsive Design**: Fully optimized for mobile devices with hamburger menu navigation
- **🔄 Optimistic Updates**: React Query for efficient data fetching and caching
- **🎨 Modern UI**: TailwindCSS with polished components and animations

## Technology Stack

- **React 18** with TypeScript
- **Vite** - Lightning-fast build tool
- **React Query** - Data fetching and state management
- **React Router** - Client-side routing
- **Leaflet + react-leaflet** - Interactive maps
- **TailwindCSS** - Utility-first CSS framework
- **Heroicons** - Beautiful SVG icons
- **Axios** - HTTP client with interceptors
- **Sonner** - Toast notifications

## Project Structure

```
src/
├── api/                    # API client and endpoints
│   ├── client.ts          # Axios instance with interceptors
│   ├── logs.ts            # Logbook API calls
│   ├── trips.ts           # Trip planning API calls
│   └── index.ts
│
├── app/                    # App configuration
│   ├── App.tsx            # Root component
│   ├── routes.tsx         # Route definitions
│   └── queryClient.ts     # React Query config
│
├── components/
│   ├── layout/            # Layout components
│   │   ├── Header.tsx     # Mobile-responsive header with nav
│   │   └── Layout.tsx     # Main layout wrapper
│   └── ui/                # Reusable UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Combobox.tsx   # Autocomplete dropdown
│       ├── LoadingSpinner.tsx
│       ├── ErrorBanner.tsx
│       └── StatusBadge.tsx
│
├── features/              # Feature modules
│   ├── dashboard/         # Dashboard page
│   ├── logbook/          # Logbook viewing
│   ├── map/              # Map components
│   │   └── RouteMap.tsx  # Leaflet map with route visualization
│   └── trip-planner/     # Trip planning feature
│       ├── TripPlannerPage.tsx
│       ├── TripForm.tsx  # Trip input form
│       └── TripStatus.tsx # Trip status + map display
│
├── hooks/                 # Custom React hooks
│   ├── useLogs.ts        # Logbook data hooks
│   └── useTrips.ts       # Trip planning hooks
│
├── types/                 # TypeScript type definitions
│   ├── log.ts
│   ├── trip.ts
│   └── index.ts
│
├── utils/                 # Utility functions
│   ├── constants.ts
│   ├── time.ts
│   └── index.ts
│
└── main.tsx              # App entry point
```

## Setup

### Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:8000` (see django-tdlogbook README)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

The app will open at `http://localhost:5173` (or 5174 if 5173 is taken)

### Build for Production

```bash
npm run build
```

Built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Usage

### Planning a Trip

1. Navigate to **Trip Planner** (`/trips/new`)
2. Fill in the form:
   - **Current Location**: Type or select from 40+ US cities
   - **Pickup Location**: Type, select, or use "Same as current"
   - **Dropoff Location**: Type or select destination
   - **Planned Start Time**: Choose date/time
   - **Total Miles**: Enter distance (or use route preview to auto-calculate)
   - **Average Speed**: Default 55 mph
   - **Current Cycle Hours**: Hours already used in 70-hour cycle
3. Click **Generate HOS-Compliant Route**
4. View your route with automatic stops on the interactive map

### Route Preview

As you type locations, the map updates in real-time (debounced) to show:
- Route polyline in blue
- Pickup location (green marker)
- Required break stops (yellow markers)
- Required rest stops (purple markers)
- Dropoff location (red marker)

### Map Features

- **Pan and Zoom**: Click and drag to pan, scroll to zoom
- **Auto-fit Bounds**: Map automatically centers on the route
- **Stop Information**: Hover over markers to see stop details
- **Legend**: Color-coded legend shows what each marker type means

## Key Components

### Combobox Component

A hybrid input/dropdown that allows both typing and selection:
- Type any custom location
- Shows filtered suggestions as you type
- Keyboard navigation (Arrow keys, Enter, Escape)
- Click dropdown arrow to see all options
- Used for all location fields

### RouteMap Component

Displays interactive maps with:
- Route polylines from GeoJSON geometry
- Custom markers for different stop types
- Automatic bounds calculation
- Responsive legend overlay

### TripForm Component

Smart form with:
- Real-time validation
- Debounced route preview
- Estimated driving time calculation
- HOS rules information display

## API Integration

The frontend communicates with the Django backend via REST API:

```typescript
// Plan a trip
POST /api/trips/plan/
{
  driver_id: 1,
  current_location: "Dallas, TX",
  pickup_location: "Dallas, TX",
  dropoff_location: "Atlanta, GA",
  planned_start_time: "2026-01-29T06:00:00Z",
  current_cycle_used_hours: 0,
  total_miles: 782,
  average_speed_mph: 55
}

// Preview route
POST /api/routes/plan/
{
  origin: "Dallas, TX",
  destination: "Atlanta, GA",
  current_cycle_hours: 0,
  average_speed_mph: 55
}

// Get trip route
GET /api/trips/{id}/route/
```

## Common Locations

Pre-configured with 40+ major US trucking cities across regions:
- **Northeast**: New York, Philadelphia, Boston, Baltimore, Pittsburgh
- **Southeast**: Atlanta, Charlotte, Richmond, Nashville, Memphis, Jacksonville, Miami
- **Midwest**: Chicago, Indianapolis, Columbus, Detroit, Kansas City, St. Louis
- **Southwest**: Dallas, Houston, Phoenix, Denver, Salt Lake City, Las Vegas
- **West Coast**: Los Angeles, San Francisco, Seattle, Portland, San Diego

## Mobile Responsiveness

- Hamburger menu on screens < 768px
- Touch-friendly buttons and inputs
- Optimized map interactions for mobile
- Responsive typography and spacing
- Portrait and landscape support

## Development

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Format Code

The project uses ESLint for code quality. Run the linter before committing:

```bash
npm run lint
```

## Environment Variables

Create a `.env` file if you need to customize the API URL:

```env
VITE_API_URL=http://localhost:8000
```

Default is `http://localhost:8000` if not specified.

## Browser Support

- Modern browsers with ES6+ support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

Proprietary - All Rights Reserved
