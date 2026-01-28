"""
FMCSA Hours of Service Rules and Constants

These constants define the legal limits enforced by the HOS engine.
All values are based on FMCSA regulations as of 2026.

Reference: https://www.fmcsa.dot.gov/regulations/hours-of-service

ASSESSMENT ASSUMPTIONS (Explicit):
- Property-carrying driver (not passenger)
- 70 hours / 8 days cycle (not 60/7)
- No adverse driving conditions
- No short-haul exemption
- Standard pickup/dropoff times
- Fuel stops every 1,000 miles

These assumptions can be overridden via environment variables.
"""

import os

# ============================================================================
# CORE HOS LIMITS (FMCSA Part 395)
# Configurable via environment variables for flexibility
# ============================================================================

# Maximum driving time allowed per duty period
MAX_DRIVING_HOURS = int(os.getenv("HOS_MAX_DRIVING_HOURS", "11"))

# Maximum on-duty time window (including driving and non-driving work)
# After 14 hours on duty, driver MUST take 10 consecutive hours off
MAX_ON_DUTY_WINDOW = int(os.getenv("HOS_MAX_ON_DUTY_WINDOW", "14"))

# Maximum hours in the rolling 8-day cycle
MAX_CYCLE_HOURS = int(os.getenv("HOS_MAX_CYCLE_HOURS", "70"))

# Number of days in the cycle window
CYCLE_DAYS = int(os.getenv("HOS_CYCLE_DAYS", "8"))

# Minimum off-duty/sleeper time required before starting a new duty period
MINIMUM_REST_HOURS = int(os.getenv("HOS_MINIMUM_REST_HOURS", "10"))

# ============================================================================
# BREAK REQUIREMENTS
# ============================================================================

# Driver must take a 30-minute break after this many hours of driving
BREAK_REQUIRED_AFTER_HOURS = int(os.getenv("HOS_BREAK_AFTER_HOURS", "8"))

# Minimum break duration (in minutes)
BREAK_DURATION_MINUTES = int(os.getenv("HOS_BREAK_DURATION_MINUTES", "30"))

# ============================================================================
# TRIP LOGISTICS CONSTANTS (Assessment Assumptions)
# ============================================================================

# Time required for pickup activities (loading, inspection, paperwork)
PICKUP_DURATION_HOURS = float(os.getenv("HOS_PICKUP_DURATION_HOURS", "1"))

# Time required for delivery activities (unloading, paperwork, inspection)
DROPOFF_DURATION_HOURS = float(os.getenv("HOS_DROPOFF_DURATION_HOURS", "1"))

# How often to simulate fuel stops (in miles)
FUEL_INTERVAL_MILES = int(os.getenv("HOS_FUEL_INTERVAL_MILES", "1000"))

# Duration of a fuel stop (in minutes)
FUEL_STOP_DURATION_MINUTES = int(os.getenv("HOS_FUEL_STOP_DURATION_MINUTES", "30"))

# ============================================================================
# DRIVING PARAMETERS
# ============================================================================

# Default average driving speed for trip calculations
DEFAULT_AVERAGE_SPEED_MPH = int(os.getenv("HOS_DEFAULT_SPEED_MPH", "55"))

# Maximum continuous driving block before forcing a rest/check
# (This is a safety parameter, not an FMCSA rule)
MAX_CONTINUOUS_DRIVING_HOURS = int(os.getenv("HOS_MAX_CONTINUOUS_DRIVING_HOURS", "2"))

# ============================================================================
# LOCATION DEFAULTS (for when location data isn't available)
# ============================================================================

DEFAULT_CITY = "Unknown"
DEFAULT_STATE = "N/A"

# ============================================================================
# DUTY STATUS CODES (FMCSA standard)
# ============================================================================

STATUS_OFF_DUTY = "OFF_DUTY"
STATUS_SLEEPER = "SLEEPER"
STATUS_DRIVING = "DRIVING"
STATUS_ON_DUTY = "ON_DUTY"

# All valid status codes
VALID_STATUSES = [
    STATUS_OFF_DUTY,
    STATUS_SLEEPER,
    STATUS_DRIVING,
    STATUS_ON_DUTY,
]
