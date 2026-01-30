import type { DutySegment } from "../../types/log";
import { DUTY_STATUS_COLORS, DUTY_STATUS_LABELS } from "../../types/log";
import { formatTime, parseISODateTime, calculateDurationHours, formatDuration } from "../../utils/time";

interface LogRemarksProps {
  segments: DutySegment[];
}

/**
 * Filter out generic/auto-filled remarks that shouldn't be displayed
 */
function shouldDisplayRemark(remark: string | undefined): boolean {
  if (!remark || !remark.trim()) return false;
  
  const remarkLower = remark.toLowerCase();
  
  // Skip auto-filled remarks
  if (remarkLower.includes("auto-filled")) return false;
  
  // Skip continuation remarks from previous day
  if (remarkLower.includes("cont'd from prev day") || remarkLower.includes("trip complete")) return false;
  
  // Skip generic "off duty" with no additional context
  if (remarkLower === "off duty") return false;
  
  return true;
}

/**
 * LogRemarks - Activity remarks section for a log day
 * Lists each duty status change with location and remarks
 * Mirrors the "Remarks" section of a paper logbook
 */
export function LogRemarks({ segments }: LogRemarksProps) {
  if (!segments || segments.length === 0) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500 text-center">No activity recorded</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
        Remarks / Activity Log
      </h3>
      
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
          <div className="col-span-1">Time</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Duration</div>
          <div className="col-span-3">Location</div>
          <div className="col-span-4">Remarks</div>
        </div>

        {/* Segment Rows */}
        <div className="divide-y divide-gray-100">
          {segments.map((segment, index) => {
            const startTime = parseISODateTime(segment.start);
            const duration = calculateDurationHours(segment.start, segment.end);

            return (
              <div
                key={segment.id || index}
                className="grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
              >
                {/* Time */}
                <div className="col-span-1 font-mono text-gray-700">
                  {formatTime(startTime)}
                </div>

                {/* Status */}
                <div className="col-span-2 flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: DUTY_STATUS_COLORS[segment.status] }}
                  />
                  <span className="text-gray-900 font-medium truncate">
                    {DUTY_STATUS_LABELS[segment.status]}
                  </span>
                </div>

                {/* Duration */}
                <div className="col-span-2 font-mono text-gray-600">
                  {formatDuration(duration)}
                </div>

                {/* Location */}
                <div className="col-span-3 text-gray-600">
                  {segment.city && segment.state
                    ? `${segment.city}, ${segment.state}`
                    : "—"}
                </div>

                {/* Remarks */}
                <div className="col-span-4 text-gray-500">
                  {shouldDisplayRemark(segment.remark) ? segment.remark : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
