/**
 * Time utility functions for ELD log calculations
 */

/**
 * Format minutes to hours:minutes display
 */
export function formatMinutesToHoursMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Format hours to hours:minutes display
 */
export function formatHoursToDisplay(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

/**
 * Parse ISO datetime string to Date object
 */
export function parseISODateTime(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Format Date to time display (HH:MM)
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Format Date to date display (MM/DD/YYYY)
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

/**
 * Get the hour position (0-24) from a datetime
 */
export function getHourPosition(datetime: string): number {
  const date = new Date(datetime);
  return date.getHours() + date.getMinutes() / 60;
}

/**
 * Calculate duration in hours between two ISO datetime strings
 */
export function calculateDurationHours(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
}

/**
 * Format duration in hours to readable string
 */
export function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} min`;
  }
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) {
    return `${h} hr`;
  }
  return `${h} hr ${m} min`;
}

/**
 * Get start of day for a date string
 */
export function getStartOfDay(dateString: string): Date {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Get end of day for a date string
 */
export function getEndOfDay(dateString: string): Date {
  const date = new Date(dateString);
  date.setHours(23, 59, 59, 999);
  return date;
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Get array of dates between start and end
 */
export function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const currentDate = new Date(start);
  const endDate = new Date(end);

  while (currentDate <= endDate) {
    dates.push(currentDate.toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}
