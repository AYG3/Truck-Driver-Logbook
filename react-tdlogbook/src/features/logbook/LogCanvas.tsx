import { useRef, useEffect, useCallback } from "react";
import type { DutySegment, DutyStatus } from "../../types/log";
import { DUTY_STATUS_LABELS } from "../../types/log";

interface LogCanvasProps {
  segments: DutySegment[];
  date: string;
  className?: string;
}

// ============================================
// CANVAS CONSTANTS (Fixed Design)
// ============================================
const CANVAS_WIDTH = 1000; // px - fixed logical width
const CANVAS_HEIGHT = 240; // px - fixed logical height
const ROW_COUNT = 4;
const ROW_HEIGHT = CANVAS_HEIGHT / ROW_COUNT; // 60px per row

// Padding for labels
const PADDING = {
  top: 25,
  right: 10,
  bottom: 25,
  left: 100,
};

// Grid dimensions (inside padding)
const GRID_WIDTH = CANVAS_WIDTH - PADDING.left - PADDING.right;
const GRID_HEIGHT = ROW_COUNT * ROW_HEIGHT;

// Time → X mapping (CRITICAL)
const PIXELS_PER_HOUR = GRID_WIDTH / 24;

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
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT + PADDING.top + PADDING.bottom);

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

  // ---- HOUR LABELS (Bottom) ----
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
    const displayHeight = (CANVAS_HEIGHT + PADDING.top + PADDING.bottom) * scale;

    // Set actual canvas size (for crisp rendering)
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = (CANVAS_HEIGHT + PADDING.top + PADDING.bottom) * dpr;

    // Set display size (CSS)
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    // Scale context for high DPI
    ctx.scale(dpr, dpr);

    // Draw grid first, then segments
    drawGrid(ctx);
    drawAllSegments(ctx, segments, date);
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
