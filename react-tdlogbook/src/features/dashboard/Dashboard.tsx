import { Link } from "react-router-dom";
import {
  TruckIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { Card, Button, LoadingSpinner } from "../../components/ui";
import { useTrips } from "../../hooks/useTrips";

export function Dashboard() {
  const { data: trips, isLoading: tripsLoading } = useTrips();

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
        <Link to="/trips">
          <Button rightIcon={<ArrowRightIcon className="h-4 w-4" />}>
            Plan New Trip
          </Button>
        </Link>
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
    </div>
  );
}