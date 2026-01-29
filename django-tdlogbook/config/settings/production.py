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

# Celery - Upstash's Redis URL
CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

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