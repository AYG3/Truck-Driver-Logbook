/**
 * Log-related type definitions
 * These types mirror the backend HOS (Hours of Service) models
 */

export type DutyStatus = 
  | "OFF_DUTY"
  | "SLEEPER"
  | "DRIVING"
  | "ON_DUTY";

export interface DutySegment {
  id: string;
  start: string; // ISO datetime string
  end: string; // ISO datetime string
  status: DutyStatus;
  city: string;
  state: string;
  remark: string;
}

export interface LogTotals {
  driving: number; // Hours
  on_duty: number; // Hours
  off_duty: number; // Hours
  sleeper: number; // Hours
}

export interface LogDay {
  date: string; // YYYY-MM-DD format
  totals: LogTotals;
  segments: DutySegment[];
  violations?: Violation[];
}

export interface Violation {
  type: ViolationType;
  message: string;
  severity: "warning" | "error";
  start_time?: string;
  end_time?: string;
}

export type ViolationType =
  | "11_HOUR_DRIVING"
  | "14_HOUR_WINDOW"
  | "30_MIN_BREAK"
  | "70_HOUR_CYCLE"
  | "10_HOUR_REST";

export interface LogsResponse {
  trip_id: number;
  driver_name: string;
  pickup_location: string;
  dropoff_location: string;
  planned_start_time: string;
  log_days: LogDayDetail[];
  total_days: number;
  total_driving_hours: number;
  total_on_duty_hours: number;
}

export interface LogDayDetail {
  id: number;
  date: string;
  total_driving_hours: string;
  total_on_duty_hours: string;
  total_off_duty_hours: string;
  total_sleeper_hours: string;
  segments: LogSegment[];
  created_at: string;
}

export interface LogSegment {
  id: number;
  start_time: string;
  end_time: string;
  duration_hours: number;
  status: DutyStatus;
  city: string;
  state: string;
  remark: string;
}

export interface LogSummary {
  total_days: number;
  total_driving_hours: number;
  total_on_duty_hours: number;
  violations_count?: number;
  compliant?: boolean;
}

export interface HOSStatus {
  driving_remaining: number;
  on_duty_remaining: number;
  cycle_remaining: number;
  next_required_break: string | null;
  next_required_rest: string | null;
}

// Display labels for duty statuses
export const DUTY_STATUS_LABELS: Record<DutyStatus, string> = {
  OFF_DUTY: "Off Duty",
  SLEEPER: "Sleeper Berth",
  DRIVING: "Driving",
  ON_DUTY: "On Duty (Not Driving)",
};

// Colors for duty status badges and indicators
export const DUTY_STATUS_COLORS: Record<DutyStatus, string> = {
  OFF_DUTY: "#6b7280",   // Gray
  SLEEPER: "#8b5cf6",    // Purple
  DRIVING: "#22c55e",    // Green
  ON_DUTY: "#f59e0b",    // Amber
};

// FMCSA canvas constants for paper-log style rendering
export const CANVAS_CONSTANTS = {
  WIDTH: 1000,
  HEIGHT: 240,
  PADDING: { left: 60, right: 20, top: 20, bottom: 30 },
  ROW_COUNT: 4, // 4 duty statuses
} as const;

export const DUTY_STATUS_ROW: Record<DutyStatus, number> = {
  OFF_DUTY: 0,
  SLEEPER: 1,
  DRIVING: 2,
  ON_DUTY: 3,
};
