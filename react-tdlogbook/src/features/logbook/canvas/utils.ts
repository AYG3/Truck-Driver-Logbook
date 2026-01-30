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
  const canvasDateObj = new Date(canvasDate + "T00:00:00");
  
  // Calculate hours from the start of the canvas date
  const timeDiff = date.getTime() - canvasDateObj.getTime();
  const hours = timeDiff / (1000 * 60 * 60); // Convert milliseconds to hours
  
  // Clamp to 0-24 range for this canvas
  const clampedHours = Math.max(0, Math.min(24, hours));
  
  return PADDING.left + clampedHours * PIXELS_PER_HOUR;
}

/**
 * Get Y coordinate for a duty status (middle of row)
 */
export function statusToY(status: DutyStatus): number {
  const row = STATUS_TO_ROW[status];
  return PADDING.top + row * ROW_HEIGHT + ROW_HEIGHT / 2;
}
