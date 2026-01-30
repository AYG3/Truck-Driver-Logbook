import { useState, useEffect } from "react";
import {
  MapPinIcon,
  TruckIcon,
  ClockIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Card, Button, Input, Combobox } from "../../components/ui";
import { usePlanTrip } from "../../hooks/useTrips";
import { getErrorMessage } from "../../api/client";
import type { TripPlanPayload } from "../../types/trip";

// Common US cities for trucking routes
const COMMON_LOCATIONS = [
  { value: "", label: "Select a location..." },
  // Northeast
  { value: "New York, NY", label: "New York, NY" },
  { value: "Philadelphia, PA", label: "Philadelphia, PA" },
  { value: "Newark, NJ", label: "Newark, NJ" },
  { value: "Baltimore, MD", label: "Baltimore, MD" },
  { value: "Boston, MA", label: "Boston, MA" },
  { value: "Pittsburgh, PA", label: "Pittsburgh, PA" },
  { value: "Buffalo, NY", label: "Buffalo, NY" },
  // Southeast
  { value: "Atlanta, GA", label: "Atlanta, GA" },
  { value: "Charlotte, NC", label: "Charlotte, NC" },
  { value: "Richmond, VA", label: "Richmond, VA" },
  { value: "Nashville, TN", label: "Nashville, TN" },
  { value: "Memphis, TN", label: "Memphis, TN" },
  { value: "Jacksonville, FL", label: "Jacksonville, FL" },
  { value: "Miami, FL", label: "Miami, FL" },
  { value: "Tampa, FL", label: "Tampa, FL" },
  { value: "New Orleans, LA", label: "New Orleans, LA" },
  // Midwest
  { value: "Chicago, IL", label: "Chicago, IL" },
  { value: "Indianapolis, IN", label: "Indianapolis, IN" },
  { value: "Columbus, OH", label: "Columbus, OH" },
  { value: "Cleveland, OH", label: "Cleveland, OH" },
  { value: "Detroit, MI", label: "Detroit, MI" },
  { value: "Milwaukee, WI", label: "Milwaukee, WI" },
  { value: "Minneapolis, MN", label: "Minneapolis, MN" },
  { value: "Kansas City, MO", label: "Kansas City, MO" },
  { value: "St. Louis, MO", label: "St. Louis, MO" },
  { value: "Omaha, NE", label: "Omaha, NE" },
  // Southwest
  { value: "Dallas, TX", label: "Dallas, TX" },
  { value: "Houston, TX", label: "Houston, TX" },
  { value: "San Antonio, TX", label: "San Antonio, TX" },
  { value: "Austin, TX", label: "Austin, TX" },
  { value: "El Paso, TX", label: "El Paso, TX" },
  { value: "Phoenix, AZ", label: "Phoenix, AZ" },
  { value: "Albuquerque, NM", label: "Albuquerque, NM" },
  { value: "Denver, CO", label: "Denver, CO" },
  { value: "Salt Lake City, UT", label: "Salt Lake City, UT" },
  { value: "Las Vegas, NV", label: "Las Vegas, NV" },
  // West Coast
  { value: "Los Angeles, CA", label: "Los Angeles, CA" },
  { value: "San Francisco, CA", label: "San Francisco, CA" },
  { value: "San Diego, CA", label: "San Diego, CA" },
  { value: "Oakland, CA", label: "Oakland, CA" },
  { value: "Seattle, WA", label: "Seattle, WA" },
  { value: "Portland, OR", label: "Portland, OR" },
];

interface TripFormProps {
  onSuccess: (tripId: number) => void;
  onFormChange?: (form: TripPlanPayload) => void;
}

// Helper to get default start time (midnight tomorrow)
function getDefaultStartTime(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function TripForm({ onSuccess, onFormChange }: TripFormProps) {
  const { mutate: planTrip, isPending } = usePlanTrip();

  const [form, setForm] = useState<TripPlanPayload>({
    driver_id: 1,
    current_location: "",
    pickup_location: "",
    dropoff_location: "",
    planned_start_time: getDefaultStartTime(),
    current_cycle_used_hours: 0,
  });

  // Debounce form changes for route preview (1 second delay)
  const debouncedForm = useDebounce(form, 1000);
  
  // Notify parent of form changes for route preview
  useEffect(() => {
    if (onFormChange && debouncedForm.current_location && debouncedForm.dropoff_location) {
      onFormChange(debouncedForm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedForm]);

  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<keyof TripPlanPayload, string>>
  >({});

  // Frontend-level validation (prevents obvious mistakes)
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof TripPlanPayload, string>> = {};

    if (!form.current_location.trim()) {
      errors.current_location = "Current location is required";
    }
    if (!form.pickup_location.trim()) {
      errors.pickup_location = "Pickup location is required";
    }
    if (!form.dropoff_location.trim()) {
      errors.dropoff_location = "Drop-off location is required";
    }
    // planned_start_time is optional - will default to midnight on backend
    if (form.current_cycle_used_hours < 0 || form.current_cycle_used_hours > 70) {
      errors.current_cycle_used_hours = "Must be between 0 and 70 hours";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check if form is valid for enabling submit button
  const isValid =
    form.current_cycle_used_hours >= 0 &&
    form.current_cycle_used_hours <= 70 &&
    form.current_location.trim() !== "" &&
    form.pickup_location.trim() !== "" &&
    form.dropoff_location.trim() !== "";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the validation errors before submitting.");
      return;
    }

    // Convert local datetime to ISO string for backend (if provided)
    const payload: TripPlanPayload = {
      ...form,
      planned_start_time: form.planned_start_time 
        ? new Date(form.planned_start_time).toISOString() 
        : undefined,
    };

    planTrip(payload, {
      onSuccess: (response) => {
        toast.success("Trip planned successfully! Generating HOS-compliant route...");
        onSuccess(response.trip_id);
      },
      onError: (err) => {
        // Error is already shown by axios interceptor, but we can add context
        const message = getErrorMessage(err);
        if (message.toLowerCase().includes("driver")) {
          toast.error("Driver not found. Please contact support.");
        }
      },
    });
  };

  const handleInputChange =
    (field: keyof TripPlanPayload) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        field === "current_cycle_used_hours"
          ? isNaN(e.target.valueAsNumber) ? "" : e.target.valueAsNumber
          : e.target.value;

      setForm((prev) => ({ ...prev, [field]: value }));

      // Clear validation error when user starts typing
      if (validationErrors[field]) {
        setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  const handleSelectChange =
    (field: keyof TripPlanPayload) =>
    (value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));

      // Clear validation error when user selects
      if (validationErrors[field]) {
        setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Location Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Trip Locations
          </h3>

          {/* Current Location */}
          <div className="relative">
            <div className="absolute left-3 top-9 text-gray-400 z-10 pointer-events-none">
              <TruckIcon className="h-5 w-5" />
            </div>
            <Combobox
              label="Current Location"
              options={COMMON_LOCATIONS}
              value={form.current_location}
              onChange={handleSelectChange("current_location")}
              error={validationErrors.current_location}
              placeholder="e.g New York, NY"
              className="pl-10"
            />
          </div>

          {/* Pickup Location */}
          <div className="relative">
            <div className="absolute left-3 top-9 text-green-500 z-10 pointer-events-none">
              <MapPinIcon className="h-5 w-5" />
            </div>
            <Combobox
              label="Pickup Location"
              options={[
                { value: "", label: "Select a location..." },
                ...(form.current_location 
                  ? [{ value: form.current_location, label: `Same as current (${form.current_location})` }]
                  : []),
                ...COMMON_LOCATIONS.slice(1), // Skip the "Select a location..." option
              ]}
              value={form.pickup_location}
              onChange={handleSelectChange("pickup_location")}
              error={validationErrors.pickup_location}
              placeholder="e.g Dallas, TX"
              className="pl-10"
            />
          </div>

          {/* Drop-off Location */}
          <div className="relative">
            <div className="absolute left-3 top-9 text-red-500 z-10 pointer-events-none">
              <MapPinIcon className="h-5 w-5" />
            </div>
            <Combobox
              label="Drop-off Location"
              options={COMMON_LOCATIONS}
              value={form.dropoff_location}
              onChange={handleSelectChange("dropoff_location")}
              error={validationErrors.dropoff_location}
              placeholder="e.g Philadelphia, PA"
              className="pl-10"
            />
          </div>
        </div>

        {/* Trip Details Section */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Trip Details
          </h3>

          {/* Planned Start Time */}
          <div className="relative">
            <div className="absolute left-3 top-9 text-gray-400">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <Input
              label="Planned Start Time (optional)"
              type="datetime-local"
              value={form.planned_start_time || ""}
              onChange={handleInputChange("planned_start_time")}
              error={validationErrors.planned_start_time}
              helperText="Defaults to midnight if not specified"
              className="pl-10"
            />
          </div>
        </div>

        {/* HOS Section */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Current HOS Status
          </h3>

          {/* Current Cycle Used */}
          <div className="relative">
            <div className="absolute left-3 top-9 text-gray-400">
              <ClockIcon className="h-5 w-5" />
            </div>
            <Input
              label="Current Cycle Hours Used"
              type="number"
              min="0"
              max="70"
              step="0.5"
              placeholder="0"
              value={form.current_cycle_used_hours ?? ""}
              onChange={handleInputChange("current_cycle_used_hours")}
              error={validationErrors.current_cycle_used_hours}
              helperText="Hours used in current 70-hour/8-day cycle"
              className="pl-10"
            />
          </div>
        </div>

        {/* HOS Info Box */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">
            HOS Rules Applied (FMCSA)
          </h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 11-hour driving limit per shift</li>
            <li>• 14-hour on-duty window</li>
            <li>• 30-minute break required after 8 hours driving</li>
            <li>• 30-minute fuel stop every 1,000 miles</li>
            <li>• 10-hour consecutive rest required</li>
            <li>• 70-hour/8-day cycle limit</li>
          </ul>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          isLoading={isPending}
          disabled={!isValid || isPending}
        >
          {isPending ? "Planning Route..." : "Generate HOS-Compliant Route"}
        </Button>
      </form>
    </Card>
  );
}
