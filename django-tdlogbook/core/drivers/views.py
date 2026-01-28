from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import Driver
from .serializers import DriverSerializer


class DriverViewSet(viewsets.ModelViewSet):
    """
    API endpoints for managing drivers.
    
    list: Get all drivers
    create: Create a new driver
    retrieve: Get a specific driver
    update: Update a driver
    destroy: Delete a driver
    """
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer
    permission_classes = [AllowAny]  # TODO: Add authentication in production
