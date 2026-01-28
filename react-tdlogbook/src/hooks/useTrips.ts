import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { planTrip, getTripStatus, getTrips, getTrip, cancelTrip } from "../api/trips";
import type { TripPlanPayload, TripStatus } from "../types/trip";
import { POLLING_INTERVALS } from "../utils/constants";

/**
 * React Query hooks for trip operations
 */

// Query keys for cache management
export const tripKeys = {
  all: ["trips"] as const,
  lists: () => [...tripKeys.all, "list"] as const,
  list: (page: number) => [...tripKeys.lists(), page] as const,
  details: () => [...tripKeys.all, "detail"] as const,
  detail: (id: number) => [...tripKeys.details(), id] as const,
  status: (id: number) => [...tripKeys.all, "status", id] as const,
};

/**
 * Hook to fetch list of trips
 */
export function useTrips(page: number = 1) {
  return useQuery({
    queryKey: tripKeys.list(page),
    queryFn: () => getTrips(page),
  });
}

/**
 * Hook to fetch a single trip
 */
export function useTrip(tripId: number) {
  return useQuery({
    queryKey: tripKeys.detail(tripId),
    queryFn: () => getTrip(tripId),
    enabled: !!tripId,
  });
}

/**
 * Hook to poll trip status with automatic refresh
 * Polls every 3 seconds while status is PROCESSING
 */
export function useTripStatus(tripId: number | null) {
  return useQuery({
    queryKey: tripKeys.status(tripId!),
    queryFn: () => getTripStatus(tripId!),
    enabled: !!tripId,
    refetchInterval: (query) => {
      const status = query.state.data?.status as TripStatus | undefined;
      // Only poll while processing
      if (status === "PROCESSING" || status === "PENDING") {
        return POLLING_INTERVALS.TRIP_STATUS;
      }
      return false;
    },
  });
}

/**
 * Hook to plan a new trip
 */
export function usePlanTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: TripPlanPayload) => planTrip(payload),
    onSuccess: () => {
      // Invalidate trips list to refresh
      queryClient.invalidateQueries({ queryKey: tripKeys.lists() });
    },
  });
}

/**
 * Hook to cancel a trip
 */
export function useCancelTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tripId: number) => cancelTrip(tripId),
    onSuccess: (_, tripId) => {
      // Invalidate both the trip detail and list
      queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
      queryClient.invalidateQueries({ queryKey: tripKeys.lists() });
    },
  });
}
