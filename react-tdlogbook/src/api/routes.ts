/**
 * Route API Functions
 * 
 * Handles all route-related API calls:
 * - Route planning with OSRM
 * - Geocoding locations
 */

import { apiClient } from "./client";
import type { RoutePlanResponse, GeocodingResult } from "../types/route";

/**
 * Request payload for planning a route
 */
export interface RoutePlanRequest {
  origin: string;
  destination: string;
  pickup_location?: string;
  current_cycle_hours?: number;
  average_speed_mph?: number;
}

/**
 * Plan a route with HOS-compliant stops
 * 
 * @param request - Route planning parameters
 * @returns Route data with geometry and stops
 */
export async function planRoute(request: RoutePlanRequest): Promise<RoutePlanResponse> {
  // Use longer timeout for route planning as it can take time for long routes
  const { data } = await apiClient.post<RoutePlanResponse>("/routes/plan/", request, {
    timeout: 120000, // 2 minute timeout for long route calculations
  });
  return data;
}

/**
 * Geocode a location string to coordinates
 * 
 * @param location - Address or city/state string
 * @returns Geocoding result with lat, lng, and display name
 */
export async function geocodeLocation(location: string): Promise<{
  success: boolean;
  result?: GeocodingResult;
  error?: string;
}> {
  const { data } = await apiClient.get("/routes/geocode/", {
    params: { location },
  });
  return data;
}
