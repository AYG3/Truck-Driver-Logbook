import { apiClient } from "./client";
import type {
  TripPlanPayload,
  TripPlanResponse,
  TripStatusResponse,
  Trip,
  TripListResponse,
} from "../types/trip";

/**
 * Trip API functions
 * These functions handle all trip-related API calls
 */

/**
 * Plan a new trip
 * @param payload - Trip planning details
 * @returns Trip plan response with trip ID
 */
export async function planTrip(payload: TripPlanPayload): Promise<TripPlanResponse> {
  const { data } = await apiClient.post<TripPlanResponse>("/trips/plan/", payload);
  return data;
}

/**
 * Get the status of a trip
 * @param tripId - The trip ID to check
 * @returns Current trip status
 */
export async function getTripStatus(tripId: number): Promise<TripStatusResponse> {
  const { data } = await apiClient.get<TripStatusResponse>(`/trips/${tripId}/status/`);
  return data;
}

/**
 * Get a specific trip by ID
 * @param tripId - The trip ID
 * @returns Trip details
 */
export async function getTrip(tripId: number): Promise<Trip> {
  const { data } = await apiClient.get<Trip>(`/trips/${tripId}/`);
  return data;
}

/**
 * Get a list of all trips
 * @param page - Page number for pagination
 * @returns Paginated list of trips
 */
export async function getTrips(page: number = 1): Promise<TripListResponse> {
  const { data } = await apiClient.get<TripListResponse>("/trips/", {
    params: { page },
  });
  return data;
}

/**
 * Cancel a trip
 * @param tripId - The trip ID to cancel
 */
export async function cancelTrip(tripId: number): Promise<void> {
  await apiClient.post(`/trips/${tripId}/cancel/`);
}

/**
 * Delete all trips
 * @returns Response with deletion count
 */
export async function deleteAllTrips(): Promise<{ status: string; message: string; deleted_count: number }> {
  const { data } = await apiClient.delete<{ status: string; message: string; deleted_count: number }>("/trips/clear-all/");
  return data;
}
