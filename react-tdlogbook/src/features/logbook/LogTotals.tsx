import type { LogTotals as LogTotalsType } from "../../types/log";
import { DUTY_STATUS_COLORS } from "../../types/log";
import { formatHoursToDisplay } from "../../utils/time";
import { HOS_LIMITS } from "../../utils/constants";

interface LogTotalsProps {
  totals: LogTotalsType;
}

/**
 * LogTotals - Summary totals section for a log day
 * Shows hours by duty status (matches paper logbook totals)
 */
export function LogTotals({ totals }: LogTotalsProps) {
  // Calculate total hours (should equal 24 for a complete day)
  const totalHours = totals.off_duty + totals.sleeper + totals.driving + totals.on_duty;

  return (
    <div className="mt-6 pt-4 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
        Daily Totals
      </h3>

      <div className="grid grid-cols-5 gap-4">
        {/* Off Duty */}
        <TotalItem
          label="Off Duty"
          hours={totals.off_duty}
          color={DUTY_STATUS_COLORS.OFF_DUTY}
        />

        {/* Sleeper Berth */}
        <TotalItem
          label="Sleeper Berth"
          hours={totals.sleeper}
          color={DUTY_STATUS_COLORS.SLEEPER}
        />

        {/* Driving */}
        <TotalItem
          label="Driving"
          hours={totals.driving}
          color={DUTY_STATUS_COLORS.DRIVING}
          limit={HOS_LIMITS.MAX_DRIVING_HOURS}
        />

        {/* On Duty (Not Driving) */}
        <TotalItem
          label="On Duty"
          hours={totals.on_duty}
          color={DUTY_STATUS_COLORS.ON_DUTY}
        />

        {/* Total Hours */}
        <div className="text-center p-3 bg-gray-100 rounded-lg">
          <p className="text-2xl font-bold font-mono text-gray-900">
            {formatHoursToDisplay(totalHours)}
          </p>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
            Total Hours
          </p>
          {Math.abs(totalHours - 24) > 0.1 && (
            <p className="text-xs text-amber-600 mt-1">
              {totalHours < 24 ? "Partial day" : "Exceeds 24h"}
            </p>
          )}
        </div>
      </div>

      {/* HOS Summary Bar */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Daily Driving:</span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{
                  width: `${Math.min(100, (totals.driving / HOS_LIMITS.MAX_DRIVING_HOURS) * 100)}%`,
                }}
              />
            </div>
            <span className="font-mono text-gray-900">
              {formatHoursToDisplay(totals.driving)} / {HOS_LIMITS.MAX_DRIVING_HOURS}:00
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-gray-600">Daily On-Duty Window:</span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{
                  width: `${Math.min(100, ((totals.driving + totals.on_duty) / HOS_LIMITS.MAX_ON_DUTY_HOURS) * 100)}%`,
                }}
              />
            </div>
            <span className="font-mono text-gray-900">
              {formatHoursToDisplay(totals.driving + totals.on_duty)} / {HOS_LIMITS.MAX_ON_DUTY_HOURS}:00
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TotalItemProps {
  label: string;
  hours: number;
  color: string;
  limit?: number;
}

function TotalItem({ label, hours, color, limit }: TotalItemProps) {
  const isOverLimit = limit && hours > limit;

  return (
    <div className="text-center p-3 bg-white border border-gray-200 rounded-lg">
      <div
        className="w-4 h-4 rounded mx-auto mb-2"
        style={{ backgroundColor: color }}
      />
      <p
        className={`text-2xl font-bold font-mono ${
          isOverLimit ? "text-red-600" : "text-gray-900"
        }`}
      >
        {formatHoursToDisplay(hours)}
      </p>
      <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
        {label}
      </p>
      {limit && (
        <p className="text-xs text-gray-400 mt-0.5">
          (max {limit}:00)
        </p>
      )}
    </div>
  );
}
