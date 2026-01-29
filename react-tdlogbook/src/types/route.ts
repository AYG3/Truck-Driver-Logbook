/**
 * Route-related type definitions
 * These types define the structure for route data from OSRM integration
 */

/**
 * Types of stops along a route
 */
export type StopType = "BREAK" | "REST" | "FUEL" | "PICKUP" | "DROPOFF" | "START";

/**
 * A single stop along the route
 */
export interface RouteStop {
  /** Type of stop (determines icon and styling) */
  type: StopType;
  /** Latitude coordinate */
  lat: number;
  /** Longitude coordinate */
  lng: number;
  /** Human-readable label for the stop */
  label: string;
  /** Duration of the stop in minutes */
  duration_minutes?: number;
  /** Scheduled arrival time (ISO string) */
  scheduled_arrival?: string;
  /** Distance from start in miles */
  distance_from_start_miles?: number;
  /** Driving time from start in hours */
  driving_hours_from_start?: number;
}

/**
 * Complete route data structure
 * Returned from the backend route planning API
 */
export interface RouteData {
  /** Total route distance in miles */
  distance_miles: number;
  /** Total driving duration in hours */
  duration_hours: number;
  /** Route geometry as array of [lng, lat] coordinates (OSRM format) */
  geometry: number[][];
  /** Origin location name */
  origin?: string;
  /** Destination location name */
  destination?: string;
  /** List of stops along the route */
  stops?: RouteStop[];
}

/**
 * Request payload for route planning
 */
export interface RoutePlanRequest {
  /** Starting location (address or city, state) */
  origin: string;
  /** Destination location (address or city, state) */
  destination: string;
  /** Optional waypoints */
  waypoints?: string[];
}

/**
 * Response from route planning API
 */
export interface RoutePlanResponse {
  /** Success indicator */
  success: boolean;
  /** Route data (if successful) */
  route?: RouteData;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Geocoding result from Nominatim
 */
export interface GeocodingResult {
  /** Latitude */
  lat: number;
  /** Longitude */
  lng: number;
  /** Display name */
  display_name: string;
}
