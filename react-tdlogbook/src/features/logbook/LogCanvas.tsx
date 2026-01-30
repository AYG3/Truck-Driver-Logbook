import { useRef, useEffect, useCallback } from "react";
import type { DutySegment, DutyStatus } from "../../types/log";
import { DUTY_STATUS_LABELS } from "../../types/log";

interface LogCanvasProps {
  segments: DutySegment[];
  date: string;
  className?: string;
}

// ============================================
// CANVAS LAYOUT CONSTANTS (Fixed Design)
// Industry-standard: Define all dimensions upfront
// ============================================
const CANVAS_WIDTH = 1000; // px - fixed logical width

// Grid layout
const ROW_COUNT = 4;
const ROW_HEIGHT = 60;
const GRID_HEIGHT = ROW_COUNT * ROW_HEIGHT; // 240px

// Remarks lane (below grid)
const REMARKS_HEIGHT = 80;
const REMARKS_GAP = 15; // Gap between grid and remarks

// Padding for labels
const PADDING = {
  top: 25,
  right: 10,
  bottom: 25,
  left: 100,
};

// Total canvas height
const CANVAS_HEIGHT = PADDING.top + GRID_HEIGHT + REMARKS_GAP + REMARKS_HEIGHT + PADDING.bottom;

// Grid dimensions (inside padding)
const GRID_WIDTH = CANVAS_WIDTH - PADDING.left - PADDING.right;

// Time → X mapping (CRITICAL)
const PIXELS_PER_HOUR = GRID_WIDTH / 24;

// Remarks lane coordinates
const REMARKS_TOP = PADDING.top + GRID_HEIGHT + REMARKS_GAP;
const BRACKET_Y = REMARKS_TOP + 15;
const TEXT_Y = BRACKET_Y + 8;
const REMARK_ROW_HEIGHT = 22; // Vertical spacing for stacked remarks

// ============================================
// DUTY STATUS → ROW MAPPING
// ============================================
const STATUS_TO_ROW: Record<DutyStatus, number> = {
  OFF_DUTY: 0,
  SLEEPER: 1,
  DRIVING: 2,
  ON_DUTY: 3,
};

// ============================================
// TIME → PIXEL MAPPING (Core Math)
// ============================================

/**
 * Convert ISO time string to X coordinate
 * This is the core mapping - if this is wrong, everything is wrong
 * 
 * CRITICAL: Handles midnight crossover correctly
 * - Times on the canvas date map to hours 0-23.999
 * - Midnight of the NEXT day (00:00:00 of date+1) maps to hour 24.0
 */
function timeToX(time: string, canvasDate: string): number {
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
function statusToY(status: DutyStatus): number {
  const row = STATUS_TO_ROW[status];
  return PADDING.top + row * ROW_HEIGHT + ROW_HEIGHT / 2;
}

// ============================================
// GRID DRAWING
// ============================================

function drawGrid(ctx: CanvasRenderingContext2D): void {
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

// ============================================
// SEGMENT DRAWING (The Actual Log Lines)
// ============================================

/**
 * Draw a single duty segment (horizontal line)
 */
function drawSegment(ctx: CanvasRenderingContext2D, segment: DutySegment, canvasDate: string): void {
  const xStart = timeToX(segment.start, canvasDate);
  const xEnd = timeToX(segment.end, canvasDate);
  const y = statusToY(segment.status);

  // Draw horizontal line (like paper log)
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.lineCap = "square";

  ctx.beginPath();
  // Offset by 0.5 to align perfectly with pixel grid
  ctx.moveTo(xStart, y + 0.5);
  ctx.lineTo(xEnd, y + 0.5);
  ctx.stroke();
}

/**
 * Draw vertical transition line between two segments
 */
function drawTransition(
  ctx: CanvasRenderingContext2D,
  prevSegment: DutySegment,
  nextSegment: DutySegment,
  canvasDate: string
): void {
  const x = timeToX(prevSegment.end, canvasDate); // Same as nextSegment.start
  const y1 = statusToY(prevSegment.status);
  const y2 = statusToY(nextSegment.status);

  // Draw vertical connector
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.lineCap = "square";

  ctx.beginPath();
  // Offset by 0.5 to align perfectly with pixel grid
  ctx.moveTo(x + 0.5, y1);
  ctx.lineTo(x + 0.5, y2);
  ctx.stroke();
}

/**
 * Draw all segments in order
 * Backend guarantees: correct order, no overlaps, contiguous segments
 * Frontend just draws.
 */
function drawAllSegments(ctx: CanvasRenderingContext2D, segments: DutySegment[], canvasDate: string): void {
  if (!segments || segments.length === 0) return;

  segments.forEach((segment, index) => {
    // Draw the horizontal segment line
    drawSegment(ctx, segment, canvasDate);

    // Draw vertical transition to next segment (if exists)
    if (index < segments.length - 1) {
      drawTransition(ctx, segment, segments[index + 1], canvasDate);
    }
  });
}

// ============================================
// REMARKS DRAWING (FMCSA-Style Brackets)
// Industry standard: Brackets below grid with location/activity
// ============================================

/**
 * Determine if a segment should have a remark bracket
 * Industry convention: Show remarks for events, not continuous driving
 */
function shouldRenderRemark(segment: DutySegment): boolean {
  // Must have a remark
  if (!segment.remark || !segment.remark.trim()) return false;
  
  // Skip generic auto-filled remarks
  const remark = segment.remark.toLowerCase();
  if (remark.includes("auto-filled") || remark === "off duty") return false;
  
  // Show for: ON_DUTY (pickup, dropoff, fuel), OFF_DUTY (breaks), SLEEPER (rest)
  // Skip: DRIVING (unless it's a short notable segment)
  if (segment.status === "DRIVING") {
    // Only show driving remarks if they're notable (fuel stops, etc.)
    return remark.includes("fuel") || remark.includes("stop");
  }
  
  return true;
}

/**
 * Draw a bracket (FMCSA paper-log style)
 * Thin lines, square ends, small vertical stems
 */
function drawRemarkBracket(
  ctx: CanvasRenderingContext2D,
  xStart: number,
  xEnd: number,
  y: number
): void {
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "square";

  // Horizontal line
  ctx.beginPath();
  ctx.moveTo(xStart, y);
  ctx.lineTo(xEnd, y);
  ctx.stroke();

  // Vertical stems (pointing up toward grid)
  const stemHeight = 8;
  ctx.beginPath();
  ctx.moveTo(xStart, y);
  ctx.lineTo(xStart, y - stemHeight);
  ctx.moveTo(xEnd, y);
  ctx.lineTo(xEnd, y - stemHeight);
  ctx.stroke();
}

/**
 * Draw remark label (location + activity)
 * Format: "City, ST — Activity" or just "Activity"
 * Renders text vertically (one character per line)
 */
function drawRemarkLabel(
  ctx: CanvasRenderingContext2D,
  segment: DutySegment,
  xMid: number,
  y: number
): void {
  ctx.font = "9px system-ui, -apple-system, Arial, sans-serif";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // Build label: "Location — Remark" or just "Remark"
  const location = [segment.city, segment.state].filter(Boolean).join(", ");
  
  // Clean up the remark (remove redundant location info if present)
  let cleanRemark = segment.remark;
  if (location && cleanRemark.includes(location)) {
    cleanRemark = cleanRemark.replace(` - ${location}`, "").replace(`${location} - `, "");
  }
  
  // Build final text
  const text = location ? `${location} —
   ${cleanRemark}` : cleanRemark;
  
  // Draw text vertically (one character per line)
  const charSpacing = 10; // Vertical spacing between characters
  const chars = text.split('');
  
  chars.forEach((char, index) => {
    const charY = y + index * charSpacing;
    ctx.fillText(char, xMid, charY);
  });
}

/**
 * Track used X ranges to handle overlapping remarks
 * Returns the row offset for vertical stacking
 */
function getRemarkRowOffset(
  xStart: number,
  xEnd: number,
  usedRanges: Array<{ start: number; end: number; row: number }>
): number {
  let row = 0;
  
  // Find the first row without overlap
  while (usedRanges.some(
    r => r.row === row && !(xEnd < r.start - 5 || xStart > r.end + 5)
  )) {
    row++;
  }
  
  // Record this range
  usedRanges.push({ start: xStart, end: xEnd, row });
  
  return row * REMARK_ROW_HEIGHT;
}

/**
 * Draw all remarks (brackets + labels)
 * Main orchestrator for remarks rendering
 */
function drawRemarks(
  ctx: CanvasRenderingContext2D,
  segments: DutySegment[],
  canvasDate: string
): void {
  if (!segments || segments.length === 0) return;

  // Track used X ranges for collision avoidance
  const usedRanges: Array<{ start: number; end: number; row: number }> = [];

  // Draw "REMARKS" label on the left
  ctx.font = "10px 'SF Mono', Monaco, 'Courier New', monospace";
  ctx.fillStyle = "#6b7280";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText("REMARKS", PADDING.left - 8, REMARKS_TOP);

  // Draw each remark
  segments.forEach(segment => {
    if (!shouldRenderRemark(segment)) return;

    const xStart = timeToX(segment.start, canvasDate);
    const xEnd = timeToX(segment.end, canvasDate);
    
    // Skip if segment is too narrow (less than ~15 min)
    if (xEnd - xStart < 10) return;
    
    const xMid = (xStart + xEnd) / 2;

    // Get vertical offset for stacking
    const yOffset = getRemarkRowOffset(xStart, xEnd, usedRanges);

    // Draw bracket and label
    drawRemarkBracket(ctx, xStart, xEnd, BRACKET_Y + yOffset);
    drawRemarkLabel(ctx, segment, xMid, TEXT_Y + yOffset);
  });
}

// ============================================
// MAIN COMPONENT
// ============================================

export function LogCanvas({ segments, date, className = "" }: LogCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Log backend data to console for debugging
  useEffect(() => {
    console.log("🎯 LogCanvas received data:", {
      date,
      segmentCount: segments.length,
      segments,
      timestamp: new Date().toISOString(),
    });
  }, [segments, date]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const containerWidth = container.clientWidth;

    // Calculate scale to fit container while maintaining aspect ratio
    const scale = containerWidth / CANVAS_WIDTH;
    const displayHeight = CANVAS_HEIGHT * scale;

    // Set actual canvas size (for crisp rendering)
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;

    // Set display size (CSS)
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    // Scale context for high DPI
    ctx.scale(dpr, dpr);

    // ====================================
    // RENDER PHASES (Industry Standard)
    // 1. Grid
    // 2. Duty segments
    // 3. Remarks brackets
    // ====================================
    drawGrid(ctx);
    drawAllSegments(ctx, segments, date);
    drawRemarks(ctx, segments, date);
  }, [segments, date]);

  useEffect(() => {
    draw();

    // Redraw on window resize
    const handleResize = () => {
      // Use requestAnimationFrame for smooth resize
      requestAnimationFrame(draw);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [draw]);

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full border border-gray-300 rounded"
        style={{ imageRendering: "crisp-edges" }}
        aria-label={`Driver's daily log grid for ${date}`}
        role="img"
      />
    </div>
  );
}
