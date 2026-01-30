import type { DutySegment } from "../../../types/log";
import { PADDING, REMARKS_TOP, BRACKET_Y, TEXT_Y, REMARK_ROW_HEIGHT } from "./constants";
import { timeToX } from "./utils";

/**
 * Determine if a segment should have a remark bracket
 * Industry convention: Show remarks for events, not continuous driving
 */
export function shouldRenderRemark(segment: DutySegment): boolean {
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
 * Slanted lines from top corners to horizontal base
 */
export function drawRemarkBracket(
  ctx: CanvasRenderingContext2D,
  xStart: number,
  xEnd: number,
  y: number
): void {
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "square";

  const slantHeight = 12; // Height of slanted lines
  const slantWidth = 6;   // Horizontal offset for slant

  ctx.beginPath();
  // Left slant: from top-left down to bottom-left
  ctx.moveTo(xStart - slantWidth, y - slantHeight);
  ctx.lineTo(xStart, y);
  
  // Bottom horizontal line
  ctx.lineTo(xEnd, y);
  
  // Right slant: from bottom-right up to top-right
  ctx.lineTo(xEnd + slantWidth, y - slantHeight);
  
  ctx.stroke();
}

/**
 * Draw remark label (location + activity)
 * Format: "City, ST | Activity" with separator
 * Renders text vertically (rotated 90 degrees) with slant
 */
export function drawRemarkLabel(
  ctx: CanvasRenderingContext2D,
  segment: DutySegment,
  xMid: number,
  y: number,
  canvasWidth: number
): void {
  // Build location and remark parts
  const location = [segment.city, segment.state].filter(Boolean).join(", ");
  
  // Clean up the remark (remove redundant location info if present)
  let cleanRemark = segment.remark;
  if (location && cleanRemark.includes(location)) {
    cleanRemark = cleanRemark.replace(` - ${location}`, "").replace(`${location} - `, "");
  }
  
  // Responsive font size (larger on mobile/smaller screens)
  const fontSize = canvasWidth < 600 ? 13 : 11;
  const fontWeight = "bold";
  
  // Save context state
  ctx.save();
  
  // Move to the center position where text should start
  ctx.translate(xMid, y);
  
  // Rotate 90 degrees clockwise (Math.PI / 2)
  ctx.rotate(Math.PI / 2);
  
  // Add slight slant (rotate an additional 5 degrees)
  ctx.rotate(5 * Math.PI / 180);
  
  // Configure text style
  ctx.font = `${fontWeight} ${fontSize}px system-ui, -apple-system, Arial, sans-serif`;
  ctx.fillStyle = "#000000";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  
  // Draw location and remark with separator
  if (location && cleanRemark) {
    // Draw location
    ctx.fillText(location, 0, 0);
    
    // Measure location width to position separator
    const locationWidth = ctx.measureText(location).width;
    
    // Draw separator line
    const separatorX = locationWidth + 4;
    const separatorLength = 10;
    ctx.beginPath();
    ctx.moveTo(separatorX, -separatorLength / 2);
    ctx.lineTo(separatorX, separatorLength / 2);
    ctx.stroke();
    
    // Draw remark after separator
    ctx.fillText(cleanRemark, separatorX + 8, 0);
  } else {
    // Just remark or just location
    const text = location || cleanRemark;
    ctx.fillText(text, 0, 0);
  }
  
  // Restore context state
  ctx.restore();
}

/**
 * Track used X ranges to handle overlapping remarks
 * Returns the row offset for vertical stacking
 */
export function getRemarkRowOffset(
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
export function drawRemarks(
  ctx: CanvasRenderingContext2D,
  segments: DutySegment[],
  canvasDate: string,
  canvasWidth: number
): void {
  if (!segments || segments.length === 0) return;

  // Track used X ranges for collision avoidance
  const usedRanges: Array<{ start: number; end: number; row: number }> = [];

  // Draw "REMARKS" label on the left
  ctx.font = "11px 'SF Mono', Monaco, 'Courier New', monospace";
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
    drawRemarkLabel(ctx, segment, xMid, TEXT_Y + yOffset, canvasWidth);
  });
}
