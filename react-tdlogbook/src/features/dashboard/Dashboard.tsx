import { useState } from "react";
import { Link } from "react-router-dom";
import {
  TruckIcon,
  ArrowRightIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { Card, Button, LoadingSpinner } from "../../components/ui";
import { useTrips, useDeleteAllTrips } from "../../hooks/useTrips";

export function Dashboard() {
  const { data: trips, isLoading: tripsLoading } = useTrips();
  const { mutate: deleteAll, isPending: isDeleting } = useDeleteAllTrips();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleClearAllTrips = () => {
    deleteAll(undefined, {
      onSuccess: (data) => {
        setShowConfirmDialog(false);
        // Show success message
        alert(`Successfully deleted ${data.deleted_count} trip(s)`);
      },
      onError: (error) => {
        setShowConfirmDialog(false);
        alert(`Failed to delete trips: ${error.message}`);
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Welcome back! Here's your driving status overview.
          </p>
        </div>
        <div className="flex gap-3">
          {trips && trips.results.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => setShowConfirmDialog(true)}
              leftIcon={<TrashIcon className="h-4 w-4" />}
              disabled={isDeleting}
            >
              Clear All Trips
            </Button>
          )}
          <Link to="/trips">
            <Button rightIcon={<ArrowRightIcon className="h-4 w-4" />}>
              Plan New Trip
            </Button>
          </Link>
        </div>
      </div>

      {/* Recent Trips */}
      <Card title="Recent Trips" subtitle="Your latest trip plans">
        {tripsLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : trips && trips.results.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {trips.results.slice(0, 5).map((trip) => (
              <Link
                key={trip.id}
                to={`/trips/${trip.id}`}
                className="flex items-center justify-between py-4 hover:bg-gray-50 -mx-6 px-6 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <TruckIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {trip.pickup_location} → {trip.dropoff_location}
                    </p>
                    <p className="text-sm text-gray-500">
                      From: {trip.current_location}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      trip.status === "COMPLETED"
                        ? "bg-green-100 text-green-800"
                        : trip.status === "PROCESSING"
                        ? "bg-blue-100 text-blue-800"
                        : trip.status === "FAILED"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {trip.status}
                  </span>
                  <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <TruckIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No trips yet</p>
            <Link to="/trips">
              <Button variant="secondary" size="sm" className="mt-4">
                Plan Your First Trip
              </Button>
            </Link>
          </div>
        )}
      </Card>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Clear All Trips?
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  This will permanently delete all trips and their associated logs. 
                  This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => setShowConfirmDialog(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <button
                    onClick={handleClearAllTrips}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isDeleting ? "Deleting..." : "Delete All"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}