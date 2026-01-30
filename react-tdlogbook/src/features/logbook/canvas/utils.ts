import type { DutyStatus } from "../../../types/log";
import { PADDING, PIXELS_PER_HOUR, ROW_HEIGHT, STATUS_TO_ROW } from "./constants";

/**
 * Convert ISO time string to X coordinate
 * This is the core mapping - if this is wrong, everything is wrong
 * 
 * CRITICAL: Handles midnight crossover correctly
 * - Times on the canvas date map to hours 0-23.999
 * - Midnight of the NEXT day (00:00:00 of date+1) maps to hour 24.0
 */
export function timeToX(time: string, canvasDate: string): number {
  const date = new Date(time);
  const canvasDateObj = new Date(canvasDate);
  
  const hours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  
  // Check if this time is on the next day (midnight crossover)
  if (date.getDate() !== canvasDateObj.getDate() || 
      date.getMonth() !== canvasDateObj.getMonth() ||
      date.getFullYear() !== canvasDateObj.getFullYear()) {
    // Next day's midnight = hour 24 on this canvas
    return PADDING.left + 24 * PIXELS_PER_HOUR;
  }
  
  return PADDING.left + hours * PIXELS_PER_HOUR;
}

/**
 * Get Y coordinate for a duty status (middle of row)
 */
export function statusToY(status: DutyStatus): number {
  const row = STATUS_TO_ROW[status];
  return PADDING.top + row * ROW_HEIGHT + ROW_HEIGHT / 2;
}
