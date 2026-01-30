/**
 * Trip-related type definitions
 * These types mirror the backend Django models and API contracts
 */

export interface TripPlanPayload {
  driver_id: number; // Required by backend
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  planned_start_time?: string; // ISO datetime string (optional, defaults to midnight)
  current_cycle_used_hours: number; // Hours already used in current 70-hour cycle
}

export interface TripPlanResponse {
  trip_id: number;
  status: TripStatus;
  message: string;
}

export type TripStatus = 
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export interface TripStatusResponse {
  trip_id: number;
  status: TripStatus;
  progress?: number;
  error?: string;
  estimated_completion?: string;
  route_summary?: RouteSummary;
}

export interface RouteSummary {
  total_distance_miles: number;
  total_driving_hours: number;
  total_trip_hours: number;
  required_stops: number;
  estimated_arrival: string;
}

export interface Trip {
  id: number;
  driver_id: number;
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  planned_start_time: string;
  current_cycle_used_hours: number;
  total_miles: number;
  average_speed_mph: number;
  status: TripStatus;
  created_at: string;
  updated_at: string;
  route_summary?: RouteSummary;
}

export interface TripListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Trip[];
}
