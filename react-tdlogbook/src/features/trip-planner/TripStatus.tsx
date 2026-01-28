import { useParams, useNavigate, Link } from "react-router-dom";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MapIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { Card, Button, StatusBadge, LoadingSpinner, ErrorBanner, EmptyState } from "../../components/ui";
import { useTripStatus } from "../../hooks/useTrips";
import { useTripLogs } from "../../hooks/useLogs";
import { formatDuration } from "../../utils/time";

export function TripStatus() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const parsedTripId = tripId ? parseInt(tripId, 10) : null;

  const { data: status, isLoading, error } = useTripStatus(parsedTripId);
  const { data: logs } = useTripLogs(parsedTripId, status?.status);

  if (!parsedTripId) {
    return (
      <EmptyState
        title="Trip Not Found"
        description="The trip ID is invalid or missing."
        action={
          <Button onClick={() => navigate("/trips")}>Plan New Trip</Button>
        }
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Loading trip status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBanner
        message="Failed to load trip status. Please try again."
        type="error"
      />
    );
  }

  if (!status) {
    return null;
  }

  // Render based on status
  if (status.status === "FAILED") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="text-center py-8">
            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Trip Planning Failed
            </h2>
            <p className="text-gray-600 mb-6">
              {status.error || "An error occurred while planning your trip."}
            </p>
            <Button onClick={() => navigate("/trips")}>Try Again</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (status.status === "PENDING" || status.status === "PROCESSING") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="text-center py-8">
            <div className="relative mx-auto w-20 h-20 mb-6">
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
              <div
                className="absolute inset-0 border-4 border-blue-600 rounded-full animate-spin"
                style={{
                  borderTopColor: "transparent",
                  borderRightColor: "transparent",
                }}
              ></div>
              <TruckIcon className="absolute inset-0 m-auto h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Planning Your Trip
            </h2>
            <StatusBadge status={status.status} />
            <p className="text-gray-600 mt-4">
              Calculating optimal route with HOS compliance...
            </p>
            {status.progress !== undefined && (
              <div className="mt-6 max-w-xs mx-auto">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{status.progress}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${status.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // COMPLETED status
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Success Header */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-full">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">
              Trip Planned Successfully
            </h2>
            <p className="text-gray-600">
              Your HOS-compliant route has been generated
            </p>
          </div>
          <StatusBadge status="COMPLETED" />
        </div>
      </Card>

      {/* Route Summary */}
      {status.route_summary && (
        <Card title="Route Summary" subtitle="Estimated trip details">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <SummaryItem
              icon={<MapIcon className="h-5 w-5" />}
              label="Total Distance"
              value={`${status.route_summary.total_distance_miles.toFixed(0)} mi`}
            />
            <SummaryItem
              icon={<TruckIcon className="h-5 w-5" />}
              label="Driving Time"
              value={formatDuration(status.route_summary.total_driving_hours)}
            />
            <SummaryItem
              icon={<ClockIcon className="h-5 w-5" />}
              label="Total Trip Time"
              value={formatDuration(status.route_summary.total_trip_hours)}
            />
            <SummaryItem
              icon={<ClockIcon className="h-5 w-5" />}
              label="Required Stops"
              value={`${status.route_summary.required_stops} stops`}
            />
          </div>
        </Card>
      )}

      {/* Logs Preview */}
      {logs && (
        <Card
          title="Generated Logs"
          subtitle={`${logs.total_days} day(s) of logs`}
          action={
            <Link to={`/logs/${tripId}`}>
              <Button variant="secondary" size="sm">
                View Full Logs
              </Button>
            </Link>
          }
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">
                {logs.total_driving_hours.toFixed(1)}
              </p>
              <p className="text-sm text-green-600">Driving Hours</p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <p className="text-2xl font-bold text-amber-700">
                {logs.total_on_duty_hours.toFixed(1)}
              </p>
              <p className="text-sm text-amber-600">On-Duty Hours</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">
                {logs.total_days}
              </p>
              <p className="text-sm text-blue-600">Total Days</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-700">
                {logs.log_days.length}
              </p>
              <p className="text-sm text-gray-600">Log Entries</p>
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Link to={`/logs/${tripId}`} className="flex-1">
          <Button className="w-full" size="lg">
            View Detailed Logs
          </Button>
        </Link>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => navigate("/trips")}
        >
          Plan Another Trip
        </Button>
      </div>
    </div>
  );
}

interface SummaryItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function SummaryItem({ icon, label, value }: SummaryItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-gray-400">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
