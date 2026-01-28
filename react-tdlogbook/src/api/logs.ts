import { apiClient } from "./client";
import type { LogsResponse, LogDay, LogDayDetail, DutySegment, HOSStatus } from "../types/log";

/**
 * Logs API functions
 * These functions handle all log-related API calls
 */

/**
 * Map backend LogDayDetail to UI LogDay format
 */
function mapLogDayDetailToLogDay(detail: LogDayDetail): LogDay {
  return {
    date: detail.date,
    totals: {
      driving: parseFloat(detail.total_driving_hours),
      on_duty: parseFloat(detail.total_on_duty_hours),
      off_duty: parseFloat(detail.total_off_duty_hours),
      sleeper: parseFloat(detail.total_sleeper_hours),
    },
    segments: detail.segments.map(seg => ({
      id: seg.id.toString(),
      start: seg.start_time,
      end: seg.end_time,
      status: seg.status,
      city: seg.city,
      state: seg.state,
      remark: seg.remark,
    } as DutySegment)),
    violations: [],
  };
}

/**
 * Get logs for a specific trip
 * @param tripId - The trip ID
 * @returns Log data including all days and segments
 */
export async function getLogs(tripId: number): Promise<LogsResponse & { days: LogDay[] }> {
  const { data } = await apiClient.get<LogsResponse>(`/logs/days/trip/${tripId}/`);
  
  // Map log_days to UI format
  return {
    ...data,
    days: data.log_days.map(mapLogDayDetailToLogDay),
  };
}

/**
 * Get logs for a specific date range
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Log data for the date range
 */
export async function getLogsByDateRange(
  startDate: string,
  endDate: string
): Promise<LogDay[]> {
  const { data } = await apiClient.get<LogDay[]>("/logs/days/", {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
  });
  return data;
}

/**
 * Get logs for a specific day
 * @param date - Date in YYYY-MM-DD format
 * @returns Log data for that day
 */
export async function getLogByDate(date: string): Promise<LogDay[]> {
  // Use date range filtering with same start and end date
  const { data } = await apiClient.get<LogDay[]>("/logs/days/", {
    params: {
      start_date: date,
      end_date: date,
    },
  });
  return data;
}

/**
 * Get current HOS status for a driver
 * @param driverId - Optional driver ID (defaults to 1)
 * @returns Current Hours of Service status
 */
export async function getHOSStatus(driverId: number = 1): Promise<HOSStatus> {
  const { data } = await apiClient.get<HOSStatus>("/logs/days/hos-status/", {
    params: { driver_id: driverId },
  });
  return data;
}

/**
 * Export logs to PDF
 * TODO: Backend endpoint not yet implemented
 * @param _tripId - The trip ID to export
 * @returns Blob containing PDF data
 */
export async function exportLogsPDF(_tripId: number): Promise<Blob> {
  throw new Error("Not implemented: PDF export not available yet");
}
