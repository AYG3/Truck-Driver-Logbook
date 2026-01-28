from rest_framework import serializers
from .models import LogDay, DutySegment


class DutySegmentSerializer(serializers.ModelSerializer):
    """
    Serializer for individual duty segments.
    
    These represent the horizontal lines on the FMCSA log graph.
    """
    
    duration_hours = serializers.FloatField(read_only=True)
    
    class Meta:
        model = DutySegment
        fields = [
            'id',
            'start_time',
            'end_time',
            'duration_hours',
            'status',
            'city',
            'state',
            'remark',
        ]
        read_only_fields = ['id', 'duration_hours']


class LogDaySerializer(serializers.ModelSerializer):
    """
    Serializer for a complete log day with all segments.
    
    This represents one 24-hour FMCSA log sheet.
    """
    
    segments = DutySegmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = LogDay
        fields = [
            'id',
            'date',
            'total_driving_hours',
            'total_on_duty_hours',
            'total_off_duty_hours',
            'total_sleeper_hours',
            'segments',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class LogDayListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing log days (without segments).
    """
    
    class Meta:
        model = LogDay
        fields = [
            'id',
            'date',
            'total_driving_hours',
            'total_on_duty_hours',
            'total_off_duty_hours',
            'total_sleeper_hours',
        ]


class TripLogsSerializer(serializers.Serializer):
    """
    Complete logs for a trip - all log days with segments.
    
    This is the format the frontend needs to render the log graph.
    """
    
    trip_id = serializers.IntegerField()
    driver_name = serializers.CharField()
    pickup_location = serializers.CharField()
    dropoff_location = serializers.CharField()
    planned_start_time = serializers.DateTimeField()
    log_days = LogDaySerializer(many=True)
    
    # Summary stats
    total_days = serializers.IntegerField()
    total_driving_hours = serializers.FloatField()
    total_on_duty_hours = serializers.FloatField()


class HOSStatusSerializer(serializers.Serializer):
    """
    Serializer for current HOS (Hours of Service) status.
    
    This shows how much driving/on-duty time remains before
    hitting FMCSA limits. Used by dashboard to display remaining hours.
    """
    
    driving_remaining = serializers.FloatField(
        help_text="Hours of driving time remaining (11-hour limit)"
    )
    on_duty_remaining = serializers.FloatField(
        help_text="Hours until 14-hour window expires"
    )
    cycle_remaining = serializers.FloatField(
        help_text="Hours remaining in 70-hour/8-day cycle"
    )
    next_required_break = serializers.CharField(
        allow_null=True,
        help_text="When 30-minute break is required (ISO datetime or null)"
    )
    next_required_rest = serializers.CharField(
        allow_null=True,
        help_text="When 10-hour rest is required (ISO datetime or null)"
    )
