from rest_framework import serializers
from .models import Driver


class DriverSerializer(serializers.ModelSerializer):
    """Serializer for Driver CRUD operations."""
    
    class Meta:
        model = Driver
        fields = ['id', 'name', 'cycle_type', 'created_at']
        read_only_fields = ['id', 'created_at']


class DriverListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing drivers."""
    
    class Meta:
        model = Driver
        fields = ['id', 'name']
