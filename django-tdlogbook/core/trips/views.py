from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db import transaction

from .models import Trip
from .serializers import TripPlanSerializer, TripSerializer, TripStatusSerializer
from .services import create_and_plan_trip


class TripViewSet(viewsets.ModelViewSet):
    """
    API endpoints for trip management and planning.
    
    Main endpoints:
    - POST /trips/plan/ - Create trip and generate logs asynchronously
    - GET /trips/ - List all trips
    - GET /trips/{id}/ - Get trip details
    - GET /trips/{id}/status/ - Get processing status (for polling)
    """
    
    queryset = Trip.objects.all().select_related('driver')
    serializer_class = TripSerializer
    permission_classes = [AllowAny]  # TODO: Add authentication in production
    
    @action(detail=True, methods=['get'], url_path='status')
    def status(self, request, pk=None):
        """
        Get the current processing status of a trip.
        
        Use this for frontend polling during log generation.
        
        Response:
        {
            "trip_id": 12,
            "status": "PROCESSING",
            "error": null
        }
        
        Status values:
        - PENDING: Trip created, waiting for processing
        - PROCESSING: Celery task is generating logs
        - COMPLETED: Logs generated successfully
        - FAILED: Generation failed (check error field)
        """
        trip = self.get_object()
        serializer = TripStatusSerializer(trip)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='plan')
    def plan(self, request):
        """
        Plan a new trip and generate HOS logs.
        
        This is the main entry point for trip planning.
        
        Request body:
        {
            "driver_id": 1,
            "current_location": "Richmond, VA",
            "pickup_location": "Richmond, VA",
            "dropoff_location": "Philadelphia, PA",
            "planned_start_time": "2026-01-27T06:00:00Z",
            "current_cycle_used_hours": 42.5,
            "total_miles": 280,
            "average_speed_mph": 55
        }
        
        Response:
        {
            "status": "success",
            "message": "Trip planned successfully. Logs are being generated.",
            "trip_id": 12,
            "trip": { ... }
        }
        
        The logs are generated asynchronously via Celery.
        Use GET /logs/trip/{trip_id}/ to retrieve generated logs.
        """
        
        # Validate input
        serializer = TripPlanSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    'status': 'error',
                    'errors': serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create trip and trigger log generation
        try:
            trip = create_and_plan_trip(serializer.validated_data)
            
            return Response(
                {
                    'status': 'success',
                    'message': 'Trip planned successfully. Logs are being generated.',
                    'trip_id': trip.id,
                    'trip': TripSerializer(trip).data,
                },
                status=status.HTTP_201_CREATED
            )
        
        except Exception as e:
            return Response(
                {
                    'status': 'error',
                    'message': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """
        Cancel a trip.
        
        POST /trips/{id}/cancel/
        
        Only trips in PENDING or PROCESSING status can be cancelled.
        Completed or already failed trips cannot be cancelled.
        
        Response:
        {
            "status": "success",
            "message": "Trip cancelled successfully"
        }
        """
        
        trip = self.get_object()
        
        if trip.status == 'COMPLETED':
            return Response(
                {
                    'status': 'error',
                    'message': 'Cannot cancel a completed trip'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if trip.status == 'FAILED':
            return Response(
                {
                    'status': 'error',
                    'message': 'Trip already failed'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if trip.status == 'CANCELLED':
            return Response(
                {
                    'status': 'error',
                    'message': 'Trip already cancelled'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cancel the trip
        trip.status = 'CANCELLED'
        trip.error_message = 'Cancelled by user'
        trip.save(update_fields=['status', 'error_message'])
        
        return Response(
            {
                'status': 'success',
                'message': 'Trip cancelled successfully',
                'trip_id': trip.id
            }
        )
    
    @action(detail=False, methods=['delete'], url_path='clear-all')
    def clear_all(self, request):
        """
        Delete all trips and their associated logs.
        
        DELETE /trips/clear-all/
        
        This will:
        - Delete all Trip records
        - Cascade delete all related LogDay records
        - Cascade delete all related DutySegment records
        
        Works with both SQLite (local) and PostgreSQL (production).
        
        Response:
        {
            "status": "success",
            "message": "All trips cleared successfully",
            "deleted_count": 15
        }
        """
        
        try:
            # Use transaction to ensure atomicity
            with transaction.atomic():
                # Get count before deletion
                trip_count = Trip.objects.count()
                
                # Delete all trips - cascades to logs automatically
                # due to ForeignKey on_delete=CASCADE relationships
                Trip.objects.all().delete()
                
                return Response(
                    {
                        'status': 'success',
                        'message': f'All trips cleared successfully',
                        'deleted_count': trip_count
                    },
                    status=status.HTTP_200_OK
                )
        
        except Exception as e:
            return Response(
                {
                    'status': 'error',
                    'message': f'Failed to clear trips: {str(e)}'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
