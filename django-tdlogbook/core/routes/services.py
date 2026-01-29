"""
Route Planning Services - HOS-Aware Route & Stop Generation

This module provides:
1. Geocoding via Nominatim (OpenStreetMap)
2. Reverse geocoding for stop location names
3. Route calculation via OSRM (Open Source Routing Machine)
4. HOS-compliant stop placement with scheduled times
5. Route-to-logbook transformation support

All services are free and require no API keys.

HOS Rules Applied (FMCSA Part 395):
- 30-minute break required after 8 hours of driving
- 10-hour rest required after 11 hours of driving
- 14-hour on-duty window limit
- Fuel stops every 1000 miles
- 1-hour pickup/dropoff activities
"""

import logging
import requests
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from django.core.cache import cache

logger = logging.getLogger("hos")

# API endpoints
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
OSRM_URL = "https://router.project-osrm.org/route/v1/driving"

# Request headers (Nominatim requires a User-Agent)
HEADERS = {
    "User-Agent": "TruckDriverLogbook/1.0 (contact@tdlogbook.com)"
}

# Cache timeouts (in seconds)
GEOCODE_CACHE_TIMEOUT = 86400 * 7  # 1 week
ROUTE_CACHE_TIMEOUT = 3600  # 1 hour

# ============================================================================
# HOS CONSTANTS (FMCSA Part 395)
# ============================================================================
HOS_MAX_DRIVING_BEFORE_BREAK = 8.0  # hours - then 30-min break required
HOS_BREAK_DURATION = 30  # minutes
HOS_MAX_DRIVING_DAILY = 11.0  # hours - then 10-hour rest required
HOS_MAX_ON_DUTY_WINDOW = 14.0  # hours - total on-duty window
HOS_REST_DURATION = 10 * 60  # 10 hours in minutes
HOS_FUEL_INTERVAL_MILES = 1000  # miles between fuel stops
HOS_FUEL_STOP_DURATION = 30  # minutes
HOS_PICKUP_DURATION = 60  # minutes
HOS_DROPOFF_DURATION = 60  # minutes


@dataclass
class GeocodingResult:
    """Result from geocoding a location string."""
    lat: float
    lng: float
    display_name: str
    city: str = ""
    state: str = ""


@dataclass
class RouteStop:
    """
    A stop along the route (break, rest, fuel, pickup, dropoff).
    
    This is the contract between backend and frontend.
    Frontend uses this to render markers on the map.
    """
    type: str  # BREAK, REST, FUEL, PICKUP, DROPOFF
    lat: float
    lng: float
    label: str
    duration_minutes: int
    distance_from_start_miles: float
    driving_hours_from_start: float
    scheduled_arrival: Optional[str] = None  # ISO 8601 timestamp
    scheduled_departure: Optional[str] = None  # ISO 8601 timestamp
    city: str = ""
    state: str = ""


@dataclass
class DrivingSegment:
    """
    A segment of driving between stops.
    
    This represents actual driving time - maps directly to DRIVING status
    in the logbook.
    """
    start_miles: float
    end_miles: float
    start_time: datetime
    end_time: datetime
    hours: float
    start_city: str = ""
    start_state: str = ""
    end_city: str = ""
    end_state: str = ""


@dataclass
class RouteResult:
    """Complete route calculation result with HOS-compliant stops."""
    distance_miles: float
    duration_hours: float
    geometry: list  # List of [lng, lat] coordinates
    origin: str
    destination: str
    stops: list  # List of RouteStop
    segments: list = field(default_factory=list)  # List of DrivingSegment
    total_trip_hours: float = 0.0  # Including all stops
    pickup_location: Optional[str] = None
    dropoff_location: Optional[str] = None


class GeocodingError(Exception):
    """Raised when geocoding fails."""
    pass


class RoutingError(Exception):
    """Raised when route calculation fails."""
    pass


def _parse_address_components(result: dict) -> tuple[str, str]:
    """Extract city and state from Nominatim result."""
    address = result.get("address", {})
    
    # City can be in various fields
    city = (
        address.get("city") or 
        address.get("town") or 
        address.get("village") or 
        address.get("hamlet") or
        address.get("municipality") or
        address.get("county", "").replace(" County", "") or
        "Unknown"
    )
    
    # State
    state = address.get("state", address.get("region", ""))
    
    # Abbreviate common US states
    state_abbrevs = {
        "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
        "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
        "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
        "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
        "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
        "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
        "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
        "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
        "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
        "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
        "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
        "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
        "Wisconsin": "WI", "Wyoming": "WY", "District of Columbia": "DC"
    }
    state = state_abbrevs.get(state, state)
    
    return city, state


def reverse_geocode(lat: float, lng: float) -> GeocodingResult:
    """
    Convert coordinates to a location name using Nominatim reverse geocoding.
    
    Args:
        lat: Latitude
        lng: Longitude
        
    Returns:
        GeocodingResult with city, state, and display_name
        
    Raises:
        GeocodingError: If reverse geocoding fails
    """
    # Check cache first
    cache_key = f"reverse_geocode:{lat:.4f},{lng:.4f}"
    cached = cache.get(cache_key)
    if cached:
        logger.debug(f"Reverse geocode cache hit for: ({lat}, {lng})")
        return GeocodingResult(**cached)
    
    try:
        params = {
            "lat": lat,
            "lon": lng,
            "format": "json",
            "addressdetails": 1,
            "zoom": 10,  # City level
        }
        
        response = requests.get(
            NOMINATIM_REVERSE_URL,
            params=params,
            headers=HEADERS,
            timeout=10
        )
        response.raise_for_status()
        
        result = response.json()
        
        if "error" in result:
            # Return fallback for unknown locations
            return GeocodingResult(
                lat=lat,
                lng=lng,
                display_name=f"{lat:.4f}, {lng:.4f}",
                city="Unknown",
                state=""
            )
        
        city, state = _parse_address_components(result)
        
        geocoded = GeocodingResult(
            lat=lat,
            lng=lng,
            display_name=result.get("display_name", f"{lat}, {lng}"),
            city=city,
            state=state
        )
        
        # Cache the result
        cache.set(cache_key, {
            "lat": geocoded.lat,
            "lng": geocoded.lng,
            "display_name": geocoded.display_name,
            "city": geocoded.city,
            "state": geocoded.state
        }, GEOCODE_CACHE_TIMEOUT)
        
        logger.debug(f"Reverse geocoded ({lat}, {lng}) to {city}, {state}")
        return geocoded
        
    except requests.RequestException as e:
        logger.warning(f"Reverse geocoding failed for ({lat}, {lng}): {e}")
        # Return fallback instead of raising
        return GeocodingResult(
            lat=lat,
            lng=lng,
            display_name=f"{lat:.4f}, {lng:.4f}",
            city="Unknown",
            state=""
        )


def geocode_location(location: str) -> GeocodingResult:
    """
    Convert a location string to coordinates using Nominatim.
    
    Args:
        location: Address or place name (e.g., "Chicago, IL")
        
    Returns:
        GeocodingResult with lat, lng, city, state, and display_name
        
    Raises:
        GeocodingError: If geocoding fails or no results found
    """
    # Check cache first
    cache_key = f"geocode:{location.lower().strip()}"
    cached = cache.get(cache_key)
    if cached:
        logger.debug(f"Geocode cache hit for: {location}")
        return GeocodingResult(**cached)
    
    try:
        params = {
            "q": location,
            "format": "json",
            "limit": 1,
            "countrycodes": "us",  # Focus on US for trucking
            "addressdetails": 1,  # Include address breakdown
        }
        
        response = requests.get(
            NOMINATIM_URL,
            params=params,
            headers=HEADERS,
            timeout=10
        )
        response.raise_for_status()
        
        results = response.json()
        
        if not results:
            raise GeocodingError(f"No results found for location: {location}")
        
        result = results[0]
        city, state = _parse_address_components(result)
        
        geocoded = GeocodingResult(
            lat=float(result["lat"]),
            lng=float(result["lon"]),
            display_name=result.get("display_name", location),
            city=city,
            state=state
        )
        
        # Cache the result
        cache.set(cache_key, {
            "lat": geocoded.lat,
            "lng": geocoded.lng,
            "display_name": geocoded.display_name,
            "city": geocoded.city,
            "state": geocoded.state
        }, GEOCODE_CACHE_TIMEOUT)
        
        logger.info(f"Geocoded '{location}' to ({geocoded.lat}, {geocoded.lng}) - {city}, {state}")
        return geocoded
        
    except requests.RequestException as e:
        logger.error(f"Geocoding request failed for '{location}': {e}")
        raise GeocodingError(f"Failed to geocode location: {location}") from e


def calculate_route(
    origin_coords: tuple[float, float],
    destination_coords: tuple[float, float],
    waypoints: Optional[list[tuple[float, float]]] = None
) -> dict:
    """
    Calculate a route using OSRM.
    
    Args:
        origin_coords: (lat, lng) of origin
        destination_coords: (lat, lng) of destination
        waypoints: Optional list of intermediate (lat, lng) points
        
    Returns:
        OSRM route response with distance, duration, and geometry
        
    Raises:
        RoutingError: If route calculation fails
    """
    # Build coordinate string (OSRM uses lng,lat order)
    coords = [f"{origin_coords[1]},{origin_coords[0]}"]
    
    if waypoints:
        for wp in waypoints:
            coords.append(f"{wp[1]},{wp[0]}")
    
    coords.append(f"{destination_coords[1]},{destination_coords[0]}")
    
    coord_string = ";".join(coords)
    
    # Check cache
    cache_key = f"route:{coord_string}"
    cached = cache.get(cache_key)
    if cached:
        logger.debug("Route cache hit")
        return cached
    
    try:
        url = f"{OSRM_URL}/{coord_string}"
        params = {
            "overview": "full",
            "geometries": "geojson",
            "steps": "false",  # We don't need turn-by-turn
        }
        
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        if data.get("code") != "Ok":
            raise RoutingError(f"OSRM error: {data.get('message', 'Unknown error')}")
        
        if not data.get("routes"):
            raise RoutingError("No route found between the specified locations")
        
        route = data["routes"][0]
        result = {
            "distance_meters": route["distance"],
            "duration_seconds": route["duration"],
            "geometry": route["geometry"]["coordinates"],
        }
        
        # Cache the result
        cache.set(cache_key, result, ROUTE_CACHE_TIMEOUT)
        
        logger.info(
            f"Route calculated: {route['distance']/1609.34:.1f} mi, "
            f"{route['duration']/3600:.1f} hrs"
        )
        
        return result
        
    except requests.RequestException as e:
        logger.error(f"Route calculation failed: {e}")
        raise RoutingError("Failed to calculate route") from e


def interpolate_point_along_route(
    geometry: list,
    target_distance_meters: float
) -> tuple[float, float]:
    """
    Find a point along the route at a specific distance.
    
    Args:
        geometry: List of [lng, lat] coordinates from OSRM
        target_distance_meters: Distance from start in meters
        
    Returns:
        (lat, lng) tuple of the interpolated point
    """
    if not geometry:
        raise ValueError("Empty geometry")
    
    cumulative_distance = 0.0
    
    for i in range(len(geometry) - 1):
        p1 = geometry[i]
        p2 = geometry[i + 1]
        
        # Calculate segment distance using Haversine
        segment_distance = haversine_distance(p1[1], p1[0], p2[1], p2[0])
        
        if cumulative_distance + segment_distance >= target_distance_meters:
            # Target is within this segment - interpolate
            remaining = target_distance_meters - cumulative_distance
            ratio = remaining / segment_distance if segment_distance > 0 else 0
            
            lat = p1[1] + (p2[1] - p1[1]) * ratio
            lng = p1[0] + (p2[0] - p1[0]) * ratio
            
            return (lat, lng)
        
        cumulative_distance += segment_distance
    
    # If we've gone past the end, return the last point
    return (geometry[-1][1], geometry[-1][0])


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points in meters.
    """
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371000  # Earth's radius in meters
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c


def calculate_hos_stops(
    distance_miles: float,
    duration_hours: float,
    geometry: list,
    start_time: datetime,
    current_cycle_hours: float = 0,
    average_speed_mph: float = 55,
    include_pickup: bool = True,
    include_dropoff: bool = True,
    origin_city: str = "",
    origin_state: str = "",
    destination_city: str = "",
    destination_state: str = "",
    skip_reverse_geocoding: bool = False,
) -> tuple[List[RouteStop], List[DrivingSegment], float]:
    """
    Calculate required HOS compliance stops along the route.
    
    This is the CORE ALGORITHM for industry-correct stop generation.
    
    HOS Rules Applied:
    - 30-minute break required after 8 hours of driving
    - 10-hour rest required after 11 hours of driving
    - 14-hour on-duty window limit
    - Fuel stops every 1000 miles
    - 1-hour pickup/dropoff activities
    
    Args:
        distance_miles: Total route distance
        duration_hours: Estimated driving duration
        geometry: Route geometry from OSRM [lng, lat] coordinates
        start_time: Trip start time
        current_cycle_hours: Hours already used in 70-hour cycle
        average_speed_mph: Average driving speed for calculations
        include_pickup: Add pickup stop at start
        include_dropoff: Add dropoff stop at end
        origin_city/state: Origin location info
        destination_city/state: Destination location info
        skip_reverse_geocoding: Skip reverse geocoding for stops (faster)
        
    Returns:
        Tuple of (stops, driving_segments, total_trip_hours)
    """
    stops: List[RouteStop] = []
    segments: List[DrivingSegment] = []
    meters_per_mile = 1609.34
    
    # State tracking (the HOS engine state machine)
    driving_since_break = 0.0  # Hours driving since last 30-min break
    driving_today = 0.0  # Hours driving in current 11-hour window
    duty_window_start = start_time  # Start of 14-hour on-duty window
    miles_since_fuel = 0.0
    total_driving = 0.0
    
    current_distance_miles = 0.0
    current_time = start_time
    
    # ========================================================================
    # PHASE 1: PICKUP (if included)
    # ========================================================================
    if include_pickup:
        pickup_arrival = current_time
        pickup_departure = current_time + timedelta(minutes=HOS_PICKUP_DURATION)
        
        stops.append(RouteStop(
            type="PICKUP",
            lat=geometry[0][1] if geometry else 0,
            lng=geometry[0][0] if geometry else 0,
            label="Pickup - Loading & Inspection",
            duration_minutes=HOS_PICKUP_DURATION,
            distance_from_start_miles=0,
            driving_hours_from_start=0,
            scheduled_arrival=pickup_arrival.isoformat(),
            scheduled_departure=pickup_departure.isoformat(),
            city=origin_city,
            state=origin_state
        ))
        
        current_time = pickup_departure
        # Pickup counts toward 14-hour window but NOT driving time
    
    # ========================================================================
    # PHASE 2: DRIVING WITH HOS ENFORCEMENT
    # ========================================================================
    segment_start_time = current_time
    segment_start_miles = 0.0
    
    while current_distance_miles < distance_miles:
        remaining_miles = distance_miles - current_distance_miles
        remaining_hours = remaining_miles / average_speed_mph
        
        # Calculate time until various limits are hit
        hours_until_break = HOS_MAX_DRIVING_BEFORE_BREAK - driving_since_break
        hours_until_daily_limit = HOS_MAX_DRIVING_DAILY - driving_today
        hours_until_window_limit = HOS_MAX_ON_DUTY_WINDOW - ((current_time - duty_window_start).total_seconds() / 3600)
        hours_until_fuel = (HOS_FUEL_INTERVAL_MILES - miles_since_fuel) / average_speed_mph
        
        # Determine next event
        drive_hours = min(
            remaining_hours,
            hours_until_break if hours_until_break > 0.01 else float('inf'),
            hours_until_daily_limit if hours_until_daily_limit > 0.01 else float('inf'),
            hours_until_window_limit if hours_until_window_limit > 0.01 else float('inf'),
            hours_until_fuel if hours_until_fuel > 0.01 else float('inf'),
            2.0  # Max continuous driving block for reasonable segments
        )
        
        if drive_hours <= 0.01:
            # Need to take a stop right now
            drive_hours = 0
        else:
            # Execute the drive
            drive_miles = drive_hours * average_speed_mph
            
            driving_since_break += drive_hours
            driving_today += drive_hours
            total_driving += drive_hours
            miles_since_fuel += drive_miles
            current_distance_miles += drive_miles
            current_time += timedelta(hours=drive_hours)
        
        # Check what kind of stop we need
        stop_needed = None
        
        # Priority 1: Check 11-hour daily driving limit
        if driving_today >= HOS_MAX_DRIVING_DAILY - 0.01:
            stop_needed = "REST"
        # Priority 2: Check 14-hour on-duty window
        elif ((current_time - duty_window_start).total_seconds() / 3600) >= HOS_MAX_ON_DUTY_WINDOW - 0.01:
            stop_needed = "REST"
        # Priority 3: Check 8-hour break requirement  
        elif driving_since_break >= HOS_MAX_DRIVING_BEFORE_BREAK - 0.01:
            stop_needed = "BREAK"
        # Priority 4: Check fuel
        elif miles_since_fuel >= HOS_FUEL_INTERVAL_MILES - 1:
            stop_needed = "FUEL"
        
        # If we need a stop and haven't reached destination
        if stop_needed and current_distance_miles < distance_miles:
            # Create driving segment up to this stop
            segments.append(DrivingSegment(
                start_miles=segment_start_miles,
                end_miles=current_distance_miles,
                start_time=segment_start_time,
                end_time=current_time,
                hours=total_driving - sum(s.hours for s in segments)
            ))
            
            # Get location for this stop
            distance_meters = current_distance_miles * meters_per_mile
            stop_lat, stop_lng = interpolate_point_along_route(geometry, distance_meters)
            
            # Get city/state via reverse geocoding (optional for performance)
            if skip_reverse_geocoding:
                stop_city = "En Route"
                stop_state = ""
            else:
                try:
                    stop_location = reverse_geocode(stop_lat, stop_lng)
                    stop_city = stop_location.city
                    stop_state = stop_location.state
                except Exception:
                    stop_city = "Unknown"
                    stop_state = ""
            
            if stop_needed == "REST":
                # 10-hour rest period
                stop_arrival = current_time
                stop_departure = current_time + timedelta(minutes=HOS_REST_DURATION)
                
                stops.append(RouteStop(
                    type="REST",
                    lat=stop_lat,
                    lng=stop_lng,
                    label="10-hour Rest Period",
                    duration_minutes=HOS_REST_DURATION,
                    distance_from_start_miles=round(current_distance_miles, 1),
                    driving_hours_from_start=round(total_driving, 2),
                    scheduled_arrival=stop_arrival.isoformat(),
                    scheduled_departure=stop_departure.isoformat(),
                    city=stop_city,
                    state=stop_state
                ))
                
                current_time = stop_departure
                # Reset counters after rest
                driving_since_break = 0
                driving_today = 0
                duty_window_start = current_time
                
            elif stop_needed == "BREAK":
                # 30-minute break
                stop_arrival = current_time
                stop_departure = current_time + timedelta(minutes=HOS_BREAK_DURATION)
                
                stops.append(RouteStop(
                    type="BREAK",
                    lat=stop_lat,
                    lng=stop_lng,
                    label="30-minute Break",
                    duration_minutes=HOS_BREAK_DURATION,
                    distance_from_start_miles=round(current_distance_miles, 1),
                    driving_hours_from_start=round(total_driving, 2),
                    scheduled_arrival=stop_arrival.isoformat(),
                    scheduled_departure=stop_departure.isoformat(),
                    city=stop_city,
                    state=stop_state
                ))
                
                current_time = stop_departure
                driving_since_break = 0
                
            elif stop_needed == "FUEL":
                # 30-minute fuel stop
                stop_arrival = current_time
                stop_departure = current_time + timedelta(minutes=HOS_FUEL_STOP_DURATION)
                
                stops.append(RouteStop(
                    type="FUEL",
                    lat=stop_lat,
                    lng=stop_lng,
                    label="Fuel Stop",
                    duration_minutes=HOS_FUEL_STOP_DURATION,
                    distance_from_start_miles=round(current_distance_miles, 1),
                    driving_hours_from_start=round(total_driving, 2),
                    scheduled_arrival=stop_arrival.isoformat(),
                    scheduled_departure=stop_departure.isoformat(),
                    city=stop_city,
                    state=stop_state
                ))
                
                current_time = stop_departure
                miles_since_fuel = 0
            
            # Start new segment
            segment_start_time = current_time
            segment_start_miles = current_distance_miles
    
    # Final driving segment to destination
    if segment_start_miles < distance_miles:
        segments.append(DrivingSegment(
            start_miles=segment_start_miles,
            end_miles=distance_miles,
            start_time=segment_start_time,
            end_time=current_time,
            hours=total_driving - sum(s.hours for s in segments)
        ))
    
    # ========================================================================
    # PHASE 3: DROPOFF (if included)
    # ========================================================================
    if include_dropoff:
        dropoff_arrival = current_time
        dropoff_departure = current_time + timedelta(minutes=HOS_DROPOFF_DURATION)
        
        stops.append(RouteStop(
            type="DROPOFF",
            lat=geometry[-1][1] if geometry else 0,
            lng=geometry[-1][0] if geometry else 0,
            label="Dropoff - Unloading & Paperwork",
            duration_minutes=HOS_DROPOFF_DURATION,
            distance_from_start_miles=round(distance_miles, 1),
            driving_hours_from_start=round(total_driving, 2),
            scheduled_arrival=dropoff_arrival.isoformat(),
            scheduled_departure=dropoff_departure.isoformat(),
            city=destination_city,
            state=destination_state
        ))
        
        current_time = dropoff_departure
    
    # Calculate total trip time
    total_trip_hours = (current_time - start_time).total_seconds() / 3600
    
    return stops, segments, total_trip_hours


def plan_route(
    origin: str,
    destination: str,
    current_cycle_hours: float = 0,
    average_speed_mph: float = 55,
    pickup_location: Optional[str] = None,
    start_time: Optional[datetime] = None,
    include_pickup: bool = True,
    include_dropoff: bool = True,
    skip_reverse_geocoding: bool = False,
) -> RouteResult:
    """
    Plan a complete route with HOS-compliant stops.
    
    This is the main entry point for route planning.
    Generates a complete trip plan with:
    - Route geometry
    - HOS-compliant stops (breaks, rests, fuel)
    - Pickup/dropoff activities
    - Scheduled times for each event
    - Driving segments for logbook generation
    
    Args:
        origin: Starting location (address or city, state)
        destination: Final destination
        current_cycle_hours: Hours already used in 70-hour cycle
        average_speed_mph: Average speed for time calculations
        pickup_location: Optional separate pickup location
        start_time: Trip start time (defaults to now)
        include_pickup: Include pickup activity at start
        include_dropoff: Include dropoff activity at end
        skip_reverse_geocoding: Skip reverse geocoding for intermediate stops (faster)
        
    Returns:
        RouteResult with complete route data, stops, and segments
        
    Raises:
        GeocodingError: If location geocoding fails
        RoutingError: If route calculation fails
    """
    logger.info(f"[HOS] INFO {datetime.now().strftime('%Y-%m-%d %H:%M:%S,%f')[:-3]} | Planning route: {origin} → {destination}")
    
    # Default start time to now
    if start_time is None:
        from django.utils import timezone
        start_time = timezone.now()
    
    # Geocode locations
    origin_geo = geocode_location(origin)
    destination_geo = geocode_location(destination)
    
    waypoints = None
    actual_pickup = pickup_location or origin
    pickup_geo = origin_geo
    
    if pickup_location and pickup_location != origin:
        pickup_geo = geocode_location(pickup_location)
        waypoints = [(pickup_geo.lat, pickup_geo.lng)]
    
    # Calculate route
    route_data = calculate_route(
        (origin_geo.lat, origin_geo.lng),
        (destination_geo.lat, destination_geo.lng),
        waypoints
    )
    
    distance_miles = route_data["distance_meters"] / 1609.34
    duration_hours = route_data["duration_seconds"] / 3600
    
    # Calculate HOS-compliant stops with full details
    stops, segments, total_trip_hours = calculate_hos_stops(
        distance_miles=distance_miles,
        duration_hours=duration_hours,
        geometry=route_data["geometry"],
        start_time=start_time,
        current_cycle_hours=current_cycle_hours,
        average_speed_mph=average_speed_mph,
        include_pickup=include_pickup,
        include_dropoff=include_dropoff,
        origin_city=pickup_geo.city,
        origin_state=pickup_geo.state,
        destination_city=destination_geo.city,
        destination_state=destination_geo.state,
        skip_reverse_geocoding=skip_reverse_geocoding,
    )
    
    # Convert stops to dicts for serialization
    stop_dicts = [
        {
            "type": stop.type,
            "lat": stop.lat,
            "lng": stop.lng,
            "label": stop.label,
            "duration_minutes": stop.duration_minutes,
            "distance_from_start_miles": stop.distance_from_start_miles,
            "driving_hours_from_start": stop.driving_hours_from_start,
            "scheduled_arrival": stop.scheduled_arrival,
            "scheduled_departure": stop.scheduled_departure,
            "city": stop.city,
            "state": stop.state,
        }
        for stop in stops
    ]
    
    # Convert segments to dicts
    segment_dicts = [
        {
            "start_miles": seg.start_miles,
            "end_miles": seg.end_miles,
            "start_time": seg.start_time.isoformat(),
            "end_time": seg.end_time.isoformat(),
            "hours": round(seg.hours, 2),
        }
        for seg in segments
    ]
    
    logger.info(
        f"Route planned: {distance_miles:.1f} mi, {duration_hours:.1f} hrs driving, "
        f"{total_trip_hours:.1f} hrs total with {len(stops)} stops"
    )
    
    return RouteResult(
        distance_miles=round(distance_miles, 1),
        duration_hours=round(duration_hours, 2),
        geometry=route_data["geometry"],
        origin=origin_geo.display_name,
        destination=destination_geo.display_name,
        stops=stop_dicts,
        segments=segment_dicts,
        total_trip_hours=round(total_trip_hours, 2),
        pickup_location=actual_pickup,
        dropoff_location=destination,
    )
