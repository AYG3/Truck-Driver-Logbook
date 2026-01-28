/**
 * Application constants
 */

// HOS (Hours of Service) limits
export const HOS_LIMITS = {
  MAX_DRIVING_HOURS: 11,
  MAX_ON_DUTY_HOURS: 14,
  REQUIRED_BREAK_AFTER_HOURS: 8,
  MIN_BREAK_DURATION: 0.5, // 30 minutes
  MIN_REST_DURATION: 10,
  CYCLE_HOURS: 70,
  CYCLE_DAYS: 8,
} as const;

// Canvas rendering constants
export const CANVAS_CONFIG = {
  DEFAULT_WIDTH: 800,
  DEFAULT_HEIGHT: 200,
  PADDING: {
    top: 20,
    right: 40,
    bottom: 30,
    left: 80,
  },
  ROW_HEIGHT: 35,
  HOUR_LABELS: Array.from({ length: 25 }, (_, i) => i),
} as const;

// API polling intervals (in milliseconds)
export const POLLING_INTERVALS = {
  TRIP_STATUS: 3000,
  HOS_STATUS: 60000,
} as const;

// Status display configurations
export const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800",
    icon: "clock",
  },
  PROCESSING: {
    label: "Processing",
    color: "bg-blue-100 text-blue-800",
    icon: "spinner",
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-green-100 text-green-800",
    icon: "check",
  },
  FAILED: {
    label: "Failed",
    color: "bg-red-100 text-red-800",
    icon: "x",
  },
} as const;

// Date format patterns
export const DATE_FORMATS = {
  API: "YYYY-MM-DD",
  DISPLAY: "MM/DD/YYYY",
  DISPLAY_LONG: "MMMM D, YYYY",
  TIME: "HH:mm",
  DATETIME: "MM/DD/YYYY HH:mm",
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  USER_PREFERENCES: "user_preferences",
  RECENT_TRIPS: "recent_trips",
} as const;
