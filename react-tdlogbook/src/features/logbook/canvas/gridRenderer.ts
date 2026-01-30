import type { DutyStatus } from "../../../types/log";
import { DUTY_STATUS_LABELS } from "../../../types/log";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PADDING,
  GRID_WIDTH,
  GRID_HEIGHT,
  ROW_COUNT,
  ROW_HEIGHT,
  PIXELS_PER_HOUR,
} from "./constants";

/**
 * Draw the logbook grid with hour lines and duty status rows
 */
export function drawGrid(ctx: CanvasRenderingContext2D): void {
  // Clear canvas with white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Grid area background (very light gray)
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(PADDING.left, PADDING.top, GRID_WIDTH, GRID_HEIGHT);

  // ---- HORIZONTAL LINES (Duty Rows) ----
  ctx.strokeStyle = "#d1d5db"; // gray-300
  ctx.lineWidth = 1;

  for (let i = 0; i <= ROW_COUNT; i++) {
    const y = PADDING.top + i * ROW_HEIGHT;
    ctx.beginPath();
    ctx.moveTo(PADDING.left, y);
    ctx.lineTo(PADDING.left + GRID_WIDTH, y);
    ctx.stroke();
  }

  // ---- ROW LABELS (Left side) ----
  ctx.font = "11px 'SF Mono', Monaco, 'Courier New', monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#374151"; // gray-700

  const statuses: DutyStatus[] = ["OFF_DUTY", "SLEEPER", "DRIVING", "ON_DUTY"];
  statuses.forEach((status, index) => {
    const y = PADDING.top + index * ROW_HEIGHT + ROW_HEIGHT / 2;
    ctx.fillText(DUTY_STATUS_LABELS[status], PADDING.left - 8, y);
  });

  // ---- VERTICAL HOUR LINES ----
  for (let h = 0; h <= 24; h++) {
    const x = PADDING.left + h * PIXELS_PER_HOUR;

    // Major hour lines (darker)
    ctx.strokeStyle = h % 6 === 0 ? "#9ca3af" : "#e5e7eb"; // gray-400 or gray-200
    ctx.lineWidth = h % 6 === 0 ? 1 : 0.5;

    ctx.beginPath();
    ctx.moveTo(x, PADDING.top);
    ctx.lineTo(x, PADDING.top + GRID_HEIGHT);
    ctx.stroke();
  }

  // ---- HOUR LABELS (Below grid) ----
  ctx.font = "10px 'SF Mono', Monaco, 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#6b7280"; // gray-500

  for (let h = 0; h <= 24; h++) {
    const x = PADDING.left + h * PIXELS_PER_HOUR;

    // Show Midnight/Noon markers and all other hours
    let label = "";
    if (h === 0) label = "M";
    else if (h === 12) label = "N";
    else if (h === 24) label = "M";
    else label = h.toString();

    if (label) {
      ctx.fillText(label, x, PADDING.top + GRID_HEIGHT + 6);
    }
  }

  // ---- QUARTER-HOUR TICK MARKS (subtle) ----
  ctx.strokeStyle = "#f3f4f6"; // gray-100
  ctx.lineWidth = 0.5;

  for (let h = 0; h < 24; h++) {
    for (let q = 1; q < 4; q++) {
      const x = PADDING.left + (h + q * 0.25) * PIXELS_PER_HOUR;
      ctx.beginPath();
      ctx.moveTo(x, PADDING.top);
      ctx.lineTo(x, PADDING.top + GRID_HEIGHT);
      ctx.stroke();
    }
  }
}
