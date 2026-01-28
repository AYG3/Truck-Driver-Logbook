import { LogHeader } from "./LogHeader";
import { LogCanvas } from "./LogCanvas";
import { LogRemarks } from "./LogRemarks";
import type { LogDay as LogDayType } from "../../types/log";
import { LogSummaryTable } from "./LogSummaryTable";

interface LogDayProps {
  logDay: LogDayType;
  driverName?: string;
  truckNumber?: string;
  carrier?: string;
}

/**
 * LogDay - Complete single day log layout
 * 
 * Paper-log mental model:
 * [ Header ]     - Date, driver info
 * [ Time Grid ]  - Canvas visualization
 * [ Remarks ]    - Activity list
 * [ Totals ]     - Hours summary
 * 
 * Each component has ONE job - no business logic in this layout.
 */
export function LogDay({ logDay, driverName, truckNumber, carrier }: LogDayProps) {
  return (
    <div className="bg-white border border-gray-300 rounded-lg p-4 sm:p-6 mb-8 shadow-sm print:shadow-none print:border-gray-400">
      {/* Header Section */}
      <LogHeader
        date={logDay.date}
        driverName={driverName}
        truckNumber={truckNumber}
        carrier={carrier}
      />

      {/* Time Grid (Canvas) + Summary Table - Stacks on mobile, side-by-side on desktop */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        {/* Canvas - Full width on mobile, flex-grow on desktop */}
        <div className="w-full lg:flex-1 overflow-x-auto">
          <LogCanvas segments={logDay.segments} date={logDay.date} />
        </div>
        
        {/* Summary Table - Full width on mobile, fixed width on desktop */}
        <div className="w-full lg:w-64 lg:flex-shrink-0">
          <LogSummaryTable segments={logDay.segments} />
        </div>
      </div>

      {/* Remarks Section */}
      <LogRemarks segments={logDay.segments} />

      {/* Violations Warning (if any) */}
      {logDay.violations && logDay.violations.length > 0 && (
        <div className="mt-6 pt-4 border-t border-red-200">
          <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wide mb-3">
            ⚠️ HOS Violations ({logDay.violations.length})
          </h3>
          <div className="space-y-2">
            {logDay.violations.map((violation, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  violation.severity === "error"
                    ? "bg-red-50 border border-red-200"
                    : "bg-yellow-50 border border-yellow-200"
                }`}
              >
                <p
                  className={`text-sm font-medium ${
                    violation.severity === "error"
                      ? "text-red-800"
                      : "text-yellow-800"
                  }`}
                >
                  {violation.type.replace(/_/g, " ")}: {violation.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
