"""
Route API Views
"""

import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .serializers import RoutePlanRequestSerializer, RouteResponseSerializer
from .services import plan_route, GeocodingError, RoutingError

logger = logging.getLogger("hos")


@api_view(["POST"])
@permission_classes([AllowAny])
def plan_route_view(request):
    """
    Plan a route with HOS-compliant stops.
    
    POST /api/routes/plan/
    
    Request body:
    {
        "origin": "Chicago, IL",
        "destination": "Columbus, OH",
        "pickup_location": "Indianapolis, IN",  // optional
        "current_cycle_hours": 20,  // optional, default 0
        "average_speed_mph": 55  // optional, default 55
    }
    
    Response:
    {
        "success": true,
        "route": {
            "distance_miles": 350.5,
            "duration_hours": 6.4,
            "geometry": [[lng, lat], ...],
            "origin": "Chicago, Cook County, Illinois, USA",
            "destination": "Columbus, Franklin County, Ohio, USA",
            "stops": [
                {
                    "type": "BREAK",
                    "lat": 40.123,
                    "lng": -86.456,
                    "label": "30-minute break",
                    "duration_minutes": 30,
                    "distance_from_start_miles": 200.5,
                    "driving_hours_from_start": 3.6
                }
            ]
        }
    }
    """
    # Validate request
    serializer = RoutePlanRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "error": "Invalid request",
                "details": serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Plan the route
        route = plan_route(
            origin=serializer.validated_data["origin"],
            destination=serializer.validated_data["destination"],
            pickup_location=serializer.validated_data.get("pickup_location"),
            current_cycle_hours=serializer.validated_data.get("current_cycle_hours", 0),
            average_speed_mph=serializer.validated_data.get("average_speed_mph", 55),
            start_time=serializer.validated_data.get("start_time"),
        )
        
        # Serialize response with enhanced data
        response_data = {
            "distance_miles": route.distance_miles,
            "duration_hours": route.duration_hours,
            "total_trip_hours": route.total_trip_hours,
            "geometry": route.geometry,
            "origin": route.origin,
            "destination": route.destination,
            "pickup_location": route.pickup_location,
            "dropoff_location": route.dropoff_location,
            "stops": route.stops, 
            "segments": route.segments, 
        }
        
        return Response({
            "success": True,
            "route": response_data
        })
        
    except GeocodingError as e:
        logger.warning(f"Geocoding error: {e}")
        return Response(
            {
                "success": False,
                "error": str(e)
            },
            status=status.HTTP_400_BAD_REQUEST
        )
        
    except RoutingError as e:
        logger.warning(f"Routing error: {e}")
        return Response(
            {
                "success": False,
                "error": str(e)
            },
            status=status.HTTP_400_BAD_REQUEST
        )
        
    except Exception as e:
        logger.exception(f"Unexpected error in route planning: {e}")
        return Response(
            {
                "success": False,
                "error": "An unexpected error occurred"
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def geocode_view(request):
    """
    Geocode a location string to coordinates.
    
    GET /api/routes/geocode/?location=Chicago,IL
    
    Response:
    {
        "success": true,
        "result": {
            "lat": 41.8781,
            "lng": -87.6298,
            "display_name": "Chicago, Cook County, Illinois, USA"
        }
    }
    """
    from .services import geocode_location
    
    location = request.query_params.get("location")
    
    if not location:
        return Response(
            {
                "success": False,
                "error": "Missing 'location' query parameter"
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        result = geocode_location(location)
        
        return Response({
            "success": True,
            "result": {
                "lat": result.lat,
                "lng": result.lng,
                "display_name": result.display_name
            }
        })
        
    except GeocodingError as e:
        return Response(
            {
                "success": False,
                "error": str(e)
            },
            status=status.HTTP_400_BAD_REQUEST
        )
