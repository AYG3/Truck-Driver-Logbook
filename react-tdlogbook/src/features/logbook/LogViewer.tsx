import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import { LogDay } from "./LogDay";
import { TripList } from "./TripList";
import {
  Button,
  LoadingSpinner,
  ErrorBanner,
  EmptyState,
} from "../../components/ui";
import { useTripLogs } from "../../hooks/useLogs";
import { formatHoursToDisplay } from "../../utils/time";
import { DUTY_STATUS_COLORS } from "../../types/log";

/**
 * LogViewer - Top-level orchestrator for log display
 * 
 * Handles:
 * - Data fetching via React Query
 * - Pagination / ordering
 * - Multi-day trip display
 * - Empty states and loading
 */
export function LogViewer() {
  const { tripId } = useParams<{ tripId: string }>();
  const parsedTripId = tripId ? parseInt(tripId, 10) : null;

  // Day selection state (null = show all days)
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Fetch logs - enabled when tripId exists and trip is COMPLETED
  const { data: logs, isLoading, error } = useTripLogs(parsedTripId, "COMPLETED");

  // No trip selected state - show list of completed trips
  if (!parsedTripId) {
    return <TripList />;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Loading logs...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorBanner
        message="Failed to load logs. Please try again."
        type="error"
      />
    );
  }

  // Empty state (no logs yet)
  if (!logs || logs.days.length === 0) {
    return (
      <EmptyState
        title="No Logs Available"
        description="Logs will appear here once the trip is completed."
        icon={CalendarIcon}
        action={
          <Link to={`/trips/${tripId}`}>
            <Button variant="secondary">View Trip Status</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/trips/${tripId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Trip
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Driver's Daily Log</h1>
            <p className="text-gray-600">Trip #{tripId} • {logs.total_days} Day(s)</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<PrinterIcon className="h-4 w-4" />}
            onClick={() => window.print()}
          >
            Print
          </Button>
          {/* <Button
            variant="secondary"
            size="sm"
            leftIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
          >
            Export PDF
          </Button> */}
        </div>
      </div>

      {/* Trip Summary Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
          Trip Summary
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <SummaryItem
            label="Total Days"
            value={logs.total_days.toString()}
          />
          <SummaryItem
            label="Driving Hours"
            value={formatHoursToDisplay(logs.total_driving_hours)}
          />
          <SummaryItem
            label="On-Duty Hours"
            value={formatHoursToDisplay(logs.total_on_duty_hours)}
          />
          <SummaryItem
            label="Log Entries"
            value={logs.log_days.length.toString()}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 bg-white p-4 rounded-lg border border-gray-200 print:bg-transparent">
        <span className="text-sm font-medium text-gray-700">Legend:</span>
        <LegendItem color={DUTY_STATUS_COLORS.OFF_DUTY} label="Off Duty" />
        <LegendItem color={DUTY_STATUS_COLORS.SLEEPER} label="Sleeper Berth" />
        <LegendItem color={DUTY_STATUS_COLORS.DRIVING} label="Driving" />
        <LegendItem color={DUTY_STATUS_COLORS.ON_DUTY} label="On Duty (Not Driving)" />
      </div>

      {/* Day Navigation Tabs (when multiple days) */}
      {logs.days.length > 1 && (
        <DayTabs
          days={logs.days}
          selectedDate={selectedDay}
          onSelect={setSelectedDay}
        />
      )}

      {/* Log Days - Show selected day or all days */}
      <div className="space-y-8 print:space-y-0">
        {(selectedDay
          ? logs.days.filter((d) => d.date === selectedDay)
          : logs.days
        ).map((day) => (
          <LogDay 
            key={day.date} 
            logDay={day}
            // Add driver info if available in the future
          />
        ))}
      </div>

      {/* Print Footer */}
      <div className="hidden print:block text-center text-xs text-gray-500 mt-8 pt-4 border-t border-gray-300">
        <p>Generated by ELD Logbook System • Trip #{tripId}</p>
        <p>This log is electronically generated and FMCSA compliant</p>
      </div>
    </div>
  );
}

interface SummaryItemProps {
  label: string;
  value: string;
  highlight?: "red" | "green";
}

function SummaryItem({ label, value, highlight }: SummaryItemProps) {
  const valueColor = highlight === "red" 
    ? "text-red-600" 
    : highlight === "green" 
    ? "text-green-600" 
    : "text-gray-900";

  return (
    <div className="text-center">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold font-mono ${valueColor}`}>{value}</p>
    </div>
  );
}

interface LegendItemProps {
  color: string;
  label: string;
}

function LegendItem({ color, label }: LegendItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-4 h-4 rounded"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
}

// ============================================
// DAY TABS COMPONENT
// ============================================

interface DayTabsProps {
  days: Array<{ date: string }>;
  selectedDate: string | null;
  onSelect: (date: string | null) => void;
}

function DayTabs({ days, selectedDate, onSelect }: DayTabsProps) {
  // Format date for display
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 print:hidden">
      <div className="flex flex-wrap gap-2">
        {/* Show All Button */}
        <button
          onClick={() => onSelect(null)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedDate === null
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All Days
        </button>

        {/* Individual Day Buttons */}
        {days.map((day, index) => (
          <button
            key={day.date}
            onClick={() => onSelect(day.date)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedDate === day.date
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Day {index + 1}: {formatDateLabel(day.date)}
          </button>
        ))}
      </div>
    </div>
  );
}
