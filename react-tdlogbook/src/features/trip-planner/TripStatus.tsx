import { useParams, useNavigate, Link } from "react-router-dom";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MapIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { Card, Button, StatusBadge, LoadingSpinner, ErrorBanner, EmptyState } from "../../components/ui";
import { RouteMap } from "../map";
import { useTripStatus, useTrip } from "../../hooks/useTrips";
import { useTripLogs } from "../../hooks/useLogs";
import { usePlanRoute } from "../../hooks/useRoutes";
import { formatDuration } from "../../utils/time";
import { useEffect, useState } from "react";
import type { RouteData } from "../../types/route";

export function TripStatus() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const parsedTripId = tripId ? parseInt(tripId, 10) : null;

  const { data: status, isLoading, error } = useTripStatus(parsedTripId);
  const { data: trip } = useTrip(parsedTripId!);
  const { data: logs } = useTripLogs(parsedTripId, status?.status);
  const { mutate: fetchRoute, isPending: isLoadingRoute } = usePlanRoute();
  
  const [routeData, setRouteData] = useState<RouteData | null>(null);

  // Fetch route when trip is completed
  useEffect(() => {
    console.log('[TripStatus] useEffect triggered:', { 
      status: status?.status, 
      hasTrip: !!trip, 
      hasRouteData: !!routeData 
    });
    
    if (status?.status === "COMPLETED" && trip && !routeData) {
      console.log('[TripStatus] Fetching route with:', {
        origin: trip.current_location,
        destination: trip.dropoff_location,
        pickup_location: trip.pickup_location,
        current_cycle_hours: trip.current_cycle_used_hours,
        average_speed_mph: trip.average_speed_mph,
      });
      
      fetchRoute(
        {
          origin: trip.current_location,
          destination: trip.dropoff_location,
          pickup_location: trip.pickup_location || undefined,
          current_cycle_hours: trip.current_cycle_used_hours || 0,
          average_speed_mph: trip.average_speed_mph || 55,
        },
        {
          onSuccess: (response) => {
            console.log('[TripStatus] Route response:', { 
              success: response.success, 
              hasRoute: !!response.route,
              stopsCount: response.route?.stops?.length,
              geometryLength: response.route?.geometry?.length
            });
            if (response.success && response.route) {
              setRouteData(response.route);
            }
          },
          onError: (error) => {
            console.error('[TripStatus] Route fetch error:', error);
          }
        }
      );
    }
  }, [status?.status, trip, routeData, fetchRoute]);

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

      {/* Route Map */}
      <Card title="Route Map" subtitle="Planned route with HOS-compliant stops">
        <div className="relative">
          <RouteMap 
            route={routeData} 
            height="h-[400px]"
          />
          {isLoadingRoute && (
            <div className="absolute inset-0 bg-white/75 flex items-center justify-center rounded-lg">
              <div className="flex items-center gap-2 text-gray-600">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Loading route...</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Stops List */}
        {routeData?.stops && routeData.stops.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Required Stops ({routeData.stops.length})
            </h4>
            <div className="space-y-3">
              {routeData.stops.map((stop, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    stop.type === "BREAK" ? "bg-amber-500" :
                    stop.type === "REST" ? "bg-purple-600" :
                    stop.type === "FUEL" ? "bg-blue-500" :
                    stop.type === "PICKUP" ? "bg-green-600" :
                    stop.type === "DROPOFF" ? "bg-red-600" :
                    "bg-gray-500"
                  }`}>
                    {stop.type === "BREAK" ? "B" : 
                     stop.type === "REST" ? "R" : 
                     stop.type === "FUEL" ? "F" : 
                     stop.type === "PICKUP" ? "P" :
                     stop.type === "DROPOFF" ? "D" : "?"}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{stop.label}</p>
                    <p className="text-sm text-gray-500">
                      {stop.distance_from_start_miles?.toFixed(1)} miles from start • 
                      After {stop.driving_hours_from_start?.toFixed(1)} hours driving
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{stop.duration_minutes}min</p>
                    <p className="text-xs text-gray-500">duration</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

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
