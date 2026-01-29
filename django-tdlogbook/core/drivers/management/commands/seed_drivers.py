"""
Management command to seed the database with default drivers.

Usage:
    python manage.py seed_drivers
    
This is especially useful for:
- Initial deployment to production
- Resetting test databases
- Ensuring driver_id=1 exists for the default app behavior
"""

from django.core.management.base import BaseCommand
from django.db import connection
from core.drivers.models import Driver


class Command(BaseCommand):
    help = 'Seeds the database with default drivers for testing and production'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all existing drivers before seeding (DESTRUCTIVE)',
        )

    def handle(self, *args, **options):
        if options['clear']:
            count = Driver.objects.count()
            Driver.objects.all().delete()
            self.stdout.write(
                self.style.WARNING(f'Deleted {count} existing drivers')
            )

        # Create default driver (driver_id=1)
        driver, created = Driver.objects.get_or_create(
            id=1,
            defaults={
                'name': 'John Doe',
                'cycle_type': '70_8',
            }
        )

        if created:
            self.stdout.write(
                self.style.SUCCESS(f'✓ Created driver: {driver.name} (ID: {driver.id})')
            )
            # Reset PostgreSQL sequence after manual ID insertion
            if connection.vendor == 'postgresql':
                with connection.cursor() as cursor:
                    cursor.execute("SELECT setval('drivers_id_seq', (SELECT MAX(id) FROM drivers));")
        else:
            self.stdout.write(
                self.style.SUCCESS(f'✓ Driver already exists: {driver.name} (ID: {driver.id})')
            )

        # You can add more default drivers here if needed
        additional_drivers = [
            {'name': 'Jane Smith', 'cycle_type': '70_8'},
            {'name': 'Bob Wilson', 'cycle_type': '70_8'},
        ]

        for driver_data in additional_drivers:
            driver, created = Driver.objects.get_or_create(
                name=driver_data['name'],
                defaults={'cycle_type': driver_data['cycle_type']}
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created driver: {driver.name} (ID: {driver.id})')
                )

        total_count = Driver.objects.count()
        self.stdout.write(
            self.style.SUCCESS(f'\n✅ Database now has {total_count} driver(s)')
        )
