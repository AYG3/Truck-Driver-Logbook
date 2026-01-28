import { useQuery } from "@tanstack/react-query";
import { getLogs, getLogByDate, getLogsByDateRange, getHOSStatus } from "../api/logs";
import type { TripStatus } from "../types/trip";

/**
 * React Query hooks for log operations
 */

// Query keys for cache management
export const logKeys = {
  all: ["logs"] as const,
  trip: (tripId: number) => [...logKeys.all, "trip", tripId] as const,
  date: (date: string) => [...logKeys.all, "date", date] as const,
  range: (start: string, end: string) => [...logKeys.all, "range", start, end] as const,
  hosStatus: () => [...logKeys.all, "hos-status"] as const,
};

/**
 * Hook to fetch logs for a specific trip
 * Only fetches when trip is completed
 */
export function useTripLogs(tripId: number | null, tripStatus?: TripStatus) {
  return useQuery({
    queryKey: logKeys.trip(tripId!),
    queryFn: () => getLogs(tripId!),
    enabled: !!tripId && tripStatus === "COMPLETED",
  });
}

/**
 * Hook to fetch logs for a specific date
 */
export function useLogByDate(date: string | null) {
  return useQuery({
    queryKey: logKeys.date(date!),
    queryFn: () => getLogByDate(date!),
    enabled: !!date,
  });
}

/**
 * Hook to fetch logs for a date range
 */
export function useLogsByDateRange(startDate: string | null, endDate: string | null) {
  return useQuery({
    queryKey: logKeys.range(startDate!, endDate!),
    queryFn: () => getLogsByDateRange(startDate!, endDate!),
    enabled: !!startDate && !!endDate,
  });
}

/**
 * Hook to fetch current HOS status
 * Refreshes every minute
 */
export function useHOSStatus(driverId: number = 1) {
  return useQuery({
    queryKey: [...logKeys.hosStatus(), driverId],
    queryFn: () => getHOSStatus(driverId),
    refetchInterval: 60000, // 1 minute
    staleTime: 30000, // 30 seconds
  });
}
