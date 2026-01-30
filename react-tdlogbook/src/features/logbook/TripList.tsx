import { Link } from "react-router-dom";
import { MapPinIcon, ClockIcon, CalendarIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { LoadingSpinner, ErrorBanner, EmptyState } from "../../components/ui";
import { useTrips } from "../../hooks/useTrips";
import type { Trip } from "../../types/trip";

/**
 * TripList - Shows a list of completed trips with logs
 * Used in LogViewer when no specific trip is selected
 */
export function TripList() {
  const { data, isLoading, error } = useTrips();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Loading trips...</p>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBanner
        message="Failed to load trips. Please try again."
        type="error"
      />
    );
  }

  // Filter to only show completed trips
  const completedTrips = data?.results?.filter(
    (trip) => trip.status === "COMPLETED"
  ) || [];

  if (completedTrips.length === 0) {
    return (
      <EmptyState
        title="No Completed Trips"
        description="Complete a trip to view its logbook here."
        icon={CalendarIcon}
        action={
          <Link to="/trips">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Plan a Trip
            </button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trip Logbooks</h1>
        <p className="text-gray-600 mt-1">
          Select a completed trip to view its driver's daily log.
        </p>
      </div>

      {/* Trip Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {completedTrips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>
    </div>
  );
}

interface TripCardProps {
  trip: Trip;
}

function TripCard({ trip }: TripCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <Link
      to={`/logs/${trip.id}`}
      className="block bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-blue-300 transition-all group"
    >
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-gray-500">
          Trip #{trip.id}
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
          <CheckCircleIcon className="h-3.5 w-3.5" />
          Completed
        </span>
      </div>

      {/* Route Information */}
      <div className="space-y-3 mb-4">
        {/* Origin */}
        <div className="flex items-start gap-2">
          <MapPinIcon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">From</p>
            <p className="text-sm font-medium text-gray-900 truncate">
              {trip.current_location}
            </p>
          </div>
        </div>

        {/* Pickup (if exists) */}
        {trip.pickup_location && trip.pickup_location !== trip.current_location && (
          <div className="flex items-start gap-2">
            <MapPinIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500">Pick Up</p>
              <p className="text-sm font-medium text-gray-900 truncate">
                {trip.pickup_location}
              </p>
            </div>
          </div>
        )}

        {/* Destination */}
        <div className="flex items-start gap-2">
          <MapPinIcon className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">To</p>
            <p className="text-sm font-medium text-gray-900 truncate">
              {trip.dropoff_location}
            </p>
          </div>
        </div>
      </div>

      {/* Date/Time */}
      <div className="pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <CalendarIcon className="h-4 w-4" />
          <span>{formatDate(trip.planned_start_time)}</span>
          <ClockIcon className="h-4 w-4 ml-2" />
          <span>{formatTime(trip.planned_start_time)}</span>
        </div>
      </div>

      {/* View Link - Shows on hover */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700">
          View Logbook →
        </span>
      </div>
    </Link>
  );
}
