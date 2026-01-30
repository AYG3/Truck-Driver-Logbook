import type { DutySegment } from "../../../types/log";
import { timeToX, statusToY } from "./utils";
import { PADDING } from "./constants";

/**
 * Draw a single duty segment (horizontal line)
 */
export function drawSegment(
  ctx: CanvasRenderingContext2D,
  segment: DutySegment,
  canvasDate: string,
  isFirstSegment: boolean = false
): void {

  const xStart = isFirstSegment ? PADDING.left : timeToX(segment.start, canvasDate);
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
export function drawTransition(
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
export function drawAllSegments(
  ctx: CanvasRenderingContext2D,
  segments: DutySegment[],
  canvasDate: string
): void {
  if (!segments || segments.length === 0) return;

  segments.forEach((segment, index) => {
    // Draw the horizontal segment line
    drawSegment(ctx, segment, canvasDate, index === 0);

    // Draw vertical transition to next segment (if exists)
    if (index < segments.length - 1) {
      drawTransition(ctx, segment, segments[index + 1], canvasDate);
    }
  });
}
