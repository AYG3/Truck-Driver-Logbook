/**
 * Canvas Layout Constants
 * Industry-standard FMCSA logbook dimensions
 */

export const CANVAS_WIDTH = 1000; // px - fixed logical width

// Grid layout
export const ROW_COUNT = 4;
export const ROW_HEIGHT = 60;
export const GRID_HEIGHT = ROW_COUNT * ROW_HEIGHT; // 240px

// Remarks lane (below grid)
export const REMARKS_HEIGHT = 120;
export const REMARKS_GAP = 20; // Gap between grid and remarks

// Padding for labels
export const PADDING = {
  top: 25,
  right: 10,
  bottom: 30,
  left: 100,
};

// Total canvas height
export const CANVAS_HEIGHT = PADDING.top + GRID_HEIGHT + REMARKS_GAP + REMARKS_HEIGHT + PADDING.bottom;

// Grid dimensions (inside padding)
export const GRID_WIDTH = CANVAS_WIDTH - PADDING.left - PADDING.right;

// Time → X mapping (CRITICAL)
export const PIXELS_PER_HOUR = GRID_WIDTH / 24;

// Remarks lane coordinates
export const REMARKS_TOP = PADDING.top + GRID_HEIGHT + REMARKS_GAP;
export const BRACKET_Y = REMARKS_TOP + 20;
export const TEXT_Y = BRACKET_Y + 12;
export const REMARK_ROW_HEIGHT = 35; // Vertical spacing for stacked remarks

// Duty status → Row mapping
export const STATUS_TO_ROW = {
  OFF_DUTY: 0,
  SLEEPER: 1,
  DRIVING: 2,
  ON_DUTY: 3,
} as const;
