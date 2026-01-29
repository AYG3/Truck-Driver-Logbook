/**
 * RouteMap Component
 * 
 * Renders an interactive map with:
 * - Route polyline from OSRM
 * - Stop markers (breaks, rests, fuel)
 * - Auto-fit to route bounds
 * 
 * Uses Leaflet with OpenStreetMap tiles (free, no API key required)
 */

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { RouteData, RouteStop } from "../../types/route";

// Fix Leaflet default marker icon issue in bundlers
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

// Configure default icon
L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

// Custom marker icons for different stop types
const createStopIcon = (color: string, label: string) => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div class="relative flex items-center justify-center">
        <div class="w-8 h-8 rounded-full ${color} flex items-center justify-center shadow-lg border-2 border-white">
          <span class="text-white text-xs font-bold">${label}</span>
        </div>
        <div class="absolute -bottom-1 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent ${color.replace('bg-', 'border-t-')}"></div>
      </div>
    `,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  });
};

// Predefined stop icons
const STOP_ICONS = {
  BREAK: createStopIcon("bg-amber-500", "B"),
  REST: createStopIcon("bg-purple-600", "R"),
  FUEL: createStopIcon("bg-blue-500", "F"),
  PICKUP: createStopIcon("bg-green-600", "P"),
  DROPOFF: createStopIcon("bg-red-600", "D"),
  START: createStopIcon("bg-gray-700", "S"),
};

// Start/End marker icons
const startIcon = L.divIcon({
  className: "custom-marker",
  html: `
    <div class="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center shadow-lg border-2 border-white">
      <span class="text-white text-xs font-bold">A</span>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const endIcon = L.divIcon({
  className: "custom-marker",
  html: `
    <div class="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center shadow-lg border-2 border-white">
      <span class="text-white text-xs font-bold">B</span>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface RouteMapProps {
  route?: RouteData | null;
  className?: string;
  height?: string;
}

/**
 * Inner component to handle map bounds fitting
 * Must be a child of MapContainer to access useMap()
 */
function FitBounds({ positions }: { positions: L.LatLngExpression[] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 1) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (positions.length === 1) {
      map.setView(positions[0], 10);
    }
  }, [map, positions]);

  return null;
}

/**
 * Normalize OSRM coordinates [lng, lat] to Leaflet [lat, lng]
 */
function normalizeOSRMGeometry(coords: number[][]): L.LatLngExpression[] {
  return coords.map(([lng, lat]) => [lat, lng] as L.LatLngExpression);
}

/**
 * Get the appropriate icon for a stop type
 */
function getStopIcon(type: RouteStop["type"]): L.DivIcon {
  return STOP_ICONS[type] || STOP_ICONS.BREAK;
}

/**
 * Format duration for display
 */
function formatStopDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

export function RouteMap({ route, className = "", height = "h-[500px]" }: RouteMapProps) {
  // Default center (continental US)
  const defaultCenter: L.LatLngExpression = [39.8283, -98.5795];
  const defaultZoom = 4;

  // Normalize route geometry for Leaflet
  const polylinePositions = useMemo(() => {
    if (!route?.geometry || route.geometry.length === 0) {
      return [];
    }
    return normalizeOSRMGeometry(route.geometry);
  }, [route?.geometry]);

  // Get start and end points from geometry
  const startPoint = polylinePositions.length > 0 ? polylinePositions[0] : null;
  const endPoint = polylinePositions.length > 1 
    ? polylinePositions[polylinePositions.length - 1] 
    : null;

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className={`${height} w-full rounded-lg shadow-md z-0`}
        scrollWheelZoom={true}
      >
        {/* OpenStreetMap Tiles - Free, no API key */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Fit map to route bounds when route is available */}
        {polylinePositions.length > 0 && (
          <FitBounds positions={polylinePositions} />
        )}

        {/* Route Polyline */}
        {polylinePositions.length > 0 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{
              color: "#2563eb",
              weight: 4,
              opacity: 0.8,
            }}
          />
        )}

        {/* Start Marker */}
        {startPoint && (
          <Marker position={startPoint} icon={startIcon}>
            <Popup>
              <div className="text-sm">
                <strong className="text-green-700">Start</strong>
                <p className="text-gray-600 mt-1">{route?.origin || "Origin"}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* End Marker */}
        {endPoint && (
          <Marker position={endPoint} icon={endIcon}>
            <Popup>
              <div className="text-sm">
                <strong className="text-red-700">Destination</strong>
                <p className="text-gray-600 mt-1">{route?.destination || "Destination"}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Stop Markers */}
        {route?.stops?.map((stop, index) => (
          <Marker
            key={`stop-${index}`}
            position={[stop.lat, stop.lng]}
            icon={getStopIcon(stop.type)}
          >
            <Popup>
              <div className="text-sm min-w-[150px]">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${
                    stop.type === "BREAK" ? "bg-amber-500" :
                    stop.type === "REST" ? "bg-purple-600" :
                    stop.type === "FUEL" ? "bg-blue-500" :
                    stop.type === "PICKUP" ? "bg-green-600" :
                    stop.type === "DROPOFF" ? "bg-red-600" :
                    "bg-gray-500"
                  }`}>
                    {stop.type}
                  </span>
                </div>
                <p className="font-medium text-gray-900">{stop.label}</p>
                {stop.duration_minutes && (
                  <p className="text-gray-600 text-xs mt-1">
                    Duration: {formatStopDuration(stop.duration_minutes)}
                  </p>
                )}
                {stop.scheduled_arrival && (
                  <p className="text-gray-500 text-xs mt-1">
                    ETA: {new Date(stop.scheduled_arrival).toLocaleString()}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Route Summary Overlay */}
      {route && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[1000]">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div className="text-gray-600">Distance:</div>
            <div className="font-medium">{route.distance_miles.toFixed(1)} mi</div>
            <div className="text-gray-600">Duration:</div>
            <div className="font-medium">{(route.duration_hours).toFixed(1)} hrs</div>
            {route.stops && route.stops.length > 0 && (
              <>
                <div className="text-gray-600">Stops:</div>
                <div className="font-medium">{route.stops.length}</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      {route?.stops && route.stops.length > 0 && (
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[1000]">
          <div className="text-xs font-semibold text-gray-700 mb-2">Legend</div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500"></div>
              <span>30-min Break</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-600"></div>
              <span>10-hr Rest</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span>Fuel Stop</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RouteMap;
