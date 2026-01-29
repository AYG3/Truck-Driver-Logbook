"""
Route API Serializers

Defines the contract between backend route services and frontend.
"""

from rest_framework import serializers


class RoutePlanRequestSerializer(serializers.Serializer):
    """
    Serializer for route planning request.
    """
    origin = serializers.CharField(
        max_length=255,
        help_text="Starting location (city, state or address)"
    )
    destination = serializers.CharField(
        max_length=255,
        help_text="Final destination (city, state or address)"
    )
    pickup_location = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        help_text="Optional pickup location (if different from origin)"
    )
    current_cycle_hours = serializers.FloatField(
        required=False,
        default=0,
        min_value=0,
        max_value=70,
        help_text="Hours already used in 70-hour cycle"
    )
    average_speed_mph = serializers.IntegerField(
        required=False,
        default=55,
        min_value=30,
        max_value=75,
        help_text="Average driving speed for calculations"
    )
    start_time = serializers.DateTimeField(
        required=False,
        help_text="Trip start time (ISO 8601 format). Defaults to now."
    )


class RouteStopSerializer(serializers.Serializer):
    """
    Serializer for a stop along the route.
    
    This is the contract that the frontend expects for rendering
    markers on the map.
    """
    type = serializers.ChoiceField(
        choices=["BREAK", "REST", "FUEL", "PICKUP", "DROPOFF"]
    )
    lat = serializers.FloatField()
    lng = serializers.FloatField()
    label = serializers.CharField()
    duration_minutes = serializers.IntegerField()
    distance_from_start_miles = serializers.FloatField(required=False)
    driving_hours_from_start = serializers.FloatField(required=False)
    scheduled_arrival = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="ISO 8601 timestamp of scheduled arrival"
    )
    scheduled_departure = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="ISO 8601 timestamp of scheduled departure"
    )
    city = serializers.CharField(required=False, allow_blank=True)
    state = serializers.CharField(required=False, allow_blank=True)


class DrivingSegmentSerializer(serializers.Serializer):
    """
    Serializer for a driving segment between stops.
    """
    start_miles = serializers.FloatField()
    end_miles = serializers.FloatField()
    start_time = serializers.CharField()
    end_time = serializers.CharField()
    hours = serializers.FloatField()


class RouteResponseSerializer(serializers.Serializer):
    """
    Serializer for route planning response.
    """
    distance_miles = serializers.FloatField()
    duration_hours = serializers.FloatField()
    total_trip_hours = serializers.FloatField(
        required=False,
        help_text="Total trip time including all stops"
    )
    geometry = serializers.ListField(
        child=serializers.ListField(child=serializers.FloatField()),
        help_text="List of [lng, lat] coordinates"
    )
    origin = serializers.CharField()
    destination = serializers.CharField()
    stops = RouteStopSerializer(many=True)
    segments = DrivingSegmentSerializer(many=True, required=False)
    pickup_location = serializers.CharField(required=False, allow_null=True)
    dropoff_location = serializers.CharField(required=False, allow_null=True)
