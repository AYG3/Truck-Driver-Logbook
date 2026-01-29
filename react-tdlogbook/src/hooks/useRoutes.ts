/**
 * React Query hooks for route operations
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { planRoute, geocodeLocation, type RoutePlanRequest } from "../api/routes";

// Query keys for cache management
export const routeKeys = {
  all: ["routes"] as const,
  plan: (request: RoutePlanRequest) => [...routeKeys.all, "plan", request] as const,
  geocode: (location: string) => [...routeKeys.all, "geocode", location] as const,
};

/**
 * Hook to plan a route
 * Uses mutation since route planning has side effects (API calls)
 */
export function usePlanRoute() {
  return useMutation({
    mutationFn: (request: RoutePlanRequest) => planRoute(request),
  });
}

/**
 * Hook to geocode a location
 * Caches results since geocoding is deterministic
 */
export function useGeocode(location: string | null) {
  return useQuery({
    queryKey: routeKeys.geocode(location || ""),
    queryFn: () => geocodeLocation(location!),
    enabled: !!location && location.length > 2,
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
  });
}

/**
 * Hook for fetching a route with caching
 * Useful when you need to refetch the same route
 */
export function useRoute(
  origin: string | null,
  destination: string | null,
  options?: Partial<RoutePlanRequest>
) {
  const request: RoutePlanRequest | null = origin && destination
    ? { origin, destination, ...options }
    : null;

  return useQuery({
    queryKey: request ? routeKeys.plan(request) : ["routes", "disabled"],
    queryFn: () => planRoute(request!),
    enabled: !!request,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}
