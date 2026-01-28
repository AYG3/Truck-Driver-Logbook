import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { formatDate, parseISODateTime } from "../../utils/time";

interface LogHeaderProps {
  date: string; // YYYY-MM-DD format
  driverName?: string;
  truckNumber?: string;
  carrier?: string;
}

/**
 * LogHeader - Header section for a single log day
 * Mirrors the header of a paper logbook
 */
export function LogHeader({ date, driverName, truckNumber, carrier }: LogHeaderProps) {
  const dateObj = parseISODateTime(date + "T00:00:00");
  const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" });

  return (
    <div className="border-b border-gray-300 pb-4 mb-4">
      {/* Date Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 p-2 rounded-lg">
            <CalendarDaysIcon className="h-6 w-6 text-gray-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-mono">
              Log Date: {formatDate(dateObj)}
            </h2>
            <p className="text-sm text-gray-500">{dayOfWeek}</p>
          </div>
        </div>

        {/* Trip Info (if available) */}
        {(driverName || truckNumber || carrier) && (
          <div className="text-right text-sm text-gray-600">
            {driverName && <p>Driver: {driverName}</p>}
            {truckNumber && <p>Truck #: {truckNumber}</p>}
            {carrier && <p>Carrier: {carrier}</p>}
          </div>
        )}
      </div>

      {/* Time Scale Reference */}
      <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
        <span className="font-medium">24-Hour Time Scale</span>
        <span className="text-gray-300">|</span>
        <span>Midnight (M) → Noon (N) → Midnight (M)</span>
      </div>
    </div>
  );
}
