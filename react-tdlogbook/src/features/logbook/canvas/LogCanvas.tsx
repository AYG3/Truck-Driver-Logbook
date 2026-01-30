import { useRef, useEffect, useCallback } from "react";

import type { DutySegment } from "../../../types/log";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./constants";
import { drawGrid } from "./gridRenderer";
import { drawAllSegments } from "./segmentRenderer";
import { drawRemarks } from "./remarksRenderer";

interface LogCanvasProps {
  segments: DutySegment[];
  date: string;
  className?: string;
}

/**
 * LogCanvas Component
 * Renders FMCSA-compliant driver logbook on HTML5 canvas
 * 
 * Architecture:
 * - Grid rendering (hours, duty status rows)
 * - Segment rendering (duty status timeline)
 * - Remarks rendering (FMCSA brackets with rotated text)
 */
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
    // RENDER PHASES
    // 1. Grid
    // 2. Duty segments
    // 3. Remarks brackets
    // ====================================
    drawGrid(ctx);
    drawAllSegments(ctx, segments, date);
    drawRemarks(ctx, segments, date, containerWidth);
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
