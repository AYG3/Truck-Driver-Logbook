"""
Production settings - override as needed for deployment.
"""

from .base import *

DEBUG = False

# Update in production
ALLOWED_HOSTS = ['yourdomain.com']

# Use environment variables for sensitive data in production
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', SECRET_KEY)

DATABASES['default']['PASSWORD'] = os.environ.get('DB_PASSWORD', 'postgres')
