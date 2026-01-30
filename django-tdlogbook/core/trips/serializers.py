from rest_framework import serializers
from .models import Trip
from core.drivers.models import Driver


class TripPlanSerializer(serializers.Serializer):
    """
    Serializer for trip planning requests.
    
    This is NOT a ModelSerializer because trip planning is a behavioral
    endpoint, not a simple CRUD operation. The input doesn't map 1:1 to
    the Trip model - we need additional fields for the HOS engine.
    
    Miles and average speed are calculated/defaulted by the backend:
    - Miles: Calculated from route via OSRM
    - Average speed: Defaults to 55 mph
    - Planned start time: Optional, defaults to midnight
    """
    
    driver_id = serializers.IntegerField(
        help_text="ID of the driver making this trip"
    )
    
    current_location = serializers.CharField(
        max_length=255,
        help_text="Where the driver is starting from (e.g., 'Richmond, VA')"
    )
    
    pickup_location = serializers.CharField(
        max_length=255,
        help_text="Where to pick up the load"
    )
    
    dropoff_location = serializers.CharField(
        max_length=255,
        help_text="Where to deliver the load"
    )
    
    planned_start_time = serializers.DateTimeField(
        required=False,
        allow_null=True,
        help_text="When the driver plans to start (ISO 8601 format, UTC). Defaults to midnight if not provided."
    )
    
    current_cycle_used_hours = serializers.FloatField(
        help_text="Hours already used in current 70-hour/8-day cycle"
    )
    
    def validate_driver_id(self, value):
        """Ensure driver exists."""
        if not Driver.objects.filter(id=value).exists():
            raise serializers.ValidationError(f"Driver with id {value} does not exist")
        return value
    
    def validate_current_cycle_used_hours(self, value):
        """Validate cycle hours are within legal bounds."""
        if value < 0:
            raise serializers.ValidationError("Cycle hours cannot be negative")
        if value > 70:
            raise serializers.ValidationError("Cycle hours cannot exceed 70")
        return value


class TripSerializer(serializers.ModelSerializer):
    """Serializer for Trip model (for retrieval)."""
    
    driver_name = serializers.CharField(source='driver.name', read_only=True)
    
    class Meta:
        model = Trip
        fields = [
            'id',
            'driver',
            'driver_name',
            'current_location',
            'pickup_location',
            'dropoff_location',
            'current_cycle_used_hours',
            'planned_start_time',
            'status',
            'error_message',
            'total_miles',
            'average_speed_mph',
            'created_at',
        ]
        read_only_fields = ['id', 'status', 'error_message', 'created_at']


class TripStatusSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for status polling.
    
    Use GET /trips/{id}/status/ to check processing status.
    This enables frontend loading spinners and retry buttons.
    """
    
    trip_id = serializers.IntegerField(source='id', read_only=True)
    error = serializers.CharField(source='error_message', read_only=True)
    
    class Meta:
        model = Trip
        fields = ['trip_id', 'status', 'error']
        read_only_fields = ['trip_id', 'status', 'error']
