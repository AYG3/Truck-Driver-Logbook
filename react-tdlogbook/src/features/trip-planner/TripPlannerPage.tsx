import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TripForm } from "./TripForm";
import { TripStatus } from "./TripStatus";

/**
 * TripPlannerPage - Top-level orchestrator for trip planning flow
 * 
 * Flow:
 * 1. Show TripForm for input
 * 2. On submit success, transition to TripStatus view
 * 3. TripStatus polls until COMPLETED or FAILED
 */
export function TripPlannerPage() {
  const navigate = useNavigate();
  const [tripId, setTripId] = useState<number | null>(null);

  const handleTripCreated = (newTripId: number) => {
    setTripId(newTripId);
    // Navigate to the trip status page
    navigate(`/trips/${newTripId}`);
  };

  // If we have a tripId, show the status view
  // Otherwise, show the form
  if (tripId) {
    return <TripStatus />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Plan a New Trip</h1>
        <p className="text-gray-600 mt-1">
          Enter your trip details to generate an HOS-compliant route plan with
          required rest stops.
        </p>
      </div>

      <TripForm onSuccess={handleTripCreated} />
    </div>
  );
}
