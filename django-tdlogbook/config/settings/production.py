"""
Production settings - Render deployment.
"""

import os
import dj_database_url
from .base import *

DEBUG = False

# Render provides this automatically
ALLOWED_HOSTS = ['truck-driver-logbook-w2ht.onrender.com']


# Security settings
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("DJANGO_SECRET_KEY environment variable must be set")

# Database - Parse Render's DATABASE_URL
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Celery Configuration
# OPTION: For MVP without dedicated worker, use eager mode (tasks run synchronously)
# For production scale: set CELERY_TASK_ALWAYS_EAGER=False and add Render background worker
CELERY_TASK_ALWAYS_EAGER = os.environ.get('CELERY_TASK_ALWAYS_EAGER', 'True') == 'True'
CELERY_TASK_EAGER_PROPAGATES = True  # Propagate exceptions immediately
CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = None  # Disabled - no result storage needed
CELERY_TASK_IGNORE_RESULT = True  # Fire-and-forget pattern

# Static files (handled by WhiteNoise)
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'

# Security headers
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# CORS - frontend domain
CORS_ALLOWED_ORIGINS = [
    'https://truck-driver-logbook.vercel.app',
    "http://localhost:5173",
]

print("ALLOWED_HOSTS =", ALLOWED_HOSTS)