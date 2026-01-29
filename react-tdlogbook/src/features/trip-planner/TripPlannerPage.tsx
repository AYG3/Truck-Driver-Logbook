import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TripForm } from "./TripForm";
import { TripStatus } from "./TripStatus";
import { RouteMap } from "../map";
import { usePlanRoute } from "../../hooks/useRoutes";
import type { RouteData } from "../../types/route";
import type { TripPlanPayload } from "../../types/trip";

/**
 * TripPlannerPage - Top-level orchestrator for trip planning flow
 * 
 * Flow:
 * 1. Show TripForm for input
 * 2. Preview route on map as user fills form
 * 3. On submit success, transition to TripStatus view
 * 4. TripStatus polls until COMPLETED or FAILED
 */
export function TripPlannerPage() {
  const navigate = useNavigate();
  const [tripId, setTripId] = useState<number | null>(null);
  const [previewRoute, setPreviewRoute] = useState<RouteData | null>(null);
  
  const { mutate: fetchRoute, isPending: isLoadingRoute } = usePlanRoute();

  const handleTripCreated = (newTripId: number) => {
    setTripId(newTripId);
    // Navigate to the trip status page
    navigate(`/trips/${newTripId}`);
  };

  // Handle form field changes to update route preview
  const handleFormChange = (form: TripPlanPayload) => {
    // Only fetch route preview when we have origin and destination
    if (form.current_location && form.dropoff_location && form.total_miles > 0) {
      fetchRoute(
        {
          origin: form.current_location,
          destination: form.dropoff_location,
          pickup_location: form.pickup_location || undefined,
          current_cycle_hours: form.current_cycle_used_hours,
          average_speed_mph: form.average_speed_mph,
        },
        {
          onSuccess: (response) => {
            if (response.success && response.route) {
              setPreviewRoute(response.route);
            }
          },
        }
      );
    }
  };

  // If we have a tripId, show the status view
  // Otherwise, show the form
  if (tripId) {
    return <TripStatus />;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Plan a New Trip</h1>
        <p className="text-gray-600 mt-1">
          Enter your trip details to generate an HOS-compliant route plan with
          required rest stops.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trip Form */}
        <div>
          <TripForm 
            onSuccess={handleTripCreated} 
            onFormChange={handleFormChange}
          />
        </div>

        {/* Route Map Preview */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Route Preview</h2>
              <p className="text-sm text-gray-500">
                {previewRoute 
                  ? `${previewRoute.distance_miles.toFixed(1)} miles • ${previewRoute.duration_hours.toFixed(1)} hours`
                  : "Fill in origin and destination to see route"}
              </p>
            </div>
            
            <RouteMap 
              route={previewRoute} 
              height="h-[400px]"
            />
            
            {isLoadingRoute && (
              <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
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
          
          {/* Route Stops Preview */}
          {previewRoute?.stops && previewRoute.stops.length > 0 && (
            <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Required Stops ({previewRoute.stops.length})
              </h3>
              <div className="space-y-2">
                {previewRoute.stops.map((stop, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                      stop.type === "BREAK" ? "bg-amber-500" :
                      stop.type === "REST" ? "bg-purple-600" :
                      stop.type === "FUEL" ? "bg-blue-500" :
                      "bg-gray-500"
                    }`}>
                      {stop.type === "BREAK" ? "B" : stop.type === "REST" ? "R" : "F"}
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">{stop.label}</span>
                      <span className="text-gray-500 ml-2">
                        at {stop.distance_from_start_miles?.toFixed(1)} mi
                      </span>
                    </div>
                    <span className="text-gray-500 text-sm">
                      {(() => {
                        const minutes = stop.duration_minutes ?? 0;
                        if (minutes >= 60) {
                          const hours = minutes / 60;
                          return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;
                        }
                        return `${minutes}min`;
                      })()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
