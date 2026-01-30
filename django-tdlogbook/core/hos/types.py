"""
HOS Engine Data Types

These are plain Python dataclasses used for input/output of the HOS engine.
They are framework-agnostic (no Django dependencies).

Why dataclasses?
- Type safety
- Clear contracts
- Easy to test
- Can be serialized to JSON
- IDE autocomplete support
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class TripPlanInput:
    """
    Input data for the HOS engine to plan a trip.
    
    This represents what the API receives from the frontend
    and what the HOS engine needs to generate compliant logs.
    """
    
    # Driver information
    driver_id: int
    current_cycle_used_hours: float  # How much of 70-hour cycle already used
    
    # Route information
    current_location: str
    pickup_location: str
    dropoff_location: str
    total_miles: Optional[int] = None 
    average_speed_mph: int = 55  
    
    # Timing
    planned_start_time: Optional[datetime] = None
    
    def __post_init__(self):
        """Validate input data."""
        if self.current_cycle_used_hours < 0 or self.current_cycle_used_hours > 70:
            raise ValueError("current_cycle_used_hours must be between 0 and 70")
        
        if self.total_miles is not None and self.total_miles <= 0:
            raise ValueError("total_miles must be positive if provided")
        
        if self.average_speed_mph <= 0 or self.average_speed_mph > 100:
            raise ValueError("average_speed_mph must be between 1 and 100")


@dataclass
class DutyEvent:
    """
    A single duty status event - output from the HOS engine.
    
    This represents one horizontal line segment on the FMCSA log graph.
    Multiple DutyEvents get grouped into LogDays.
    """
    
    start: datetime
    end: datetime
    status: str  # OFF_DUTY, SLEEPER, DRIVING, ON_DUTY
    city: str
    state: str
    remark: str
    
    @property
    def duration_hours(self) -> float:
        """Calculate duration in hours."""
        delta = self.end - self.start
        return delta.total_seconds() / 3600
    
    def __post_init__(self):
        """Validate event data."""
        if self.end <= self.start:
            raise ValueError("end must be after start")


@dataclass
class HOSState:
    """
    Tracks the current state during log generation.
    
    This is used internally by the HOS engine to enforce rules
    as it builds up the sequence of duty events.
    """
    
    current_time: datetime
    driving_hours_today: float = 0.0
    on_duty_window_start: Optional[datetime] = None
    miles_remaining: float = 0.0
    cycle_hours_used: float = 0.0
    
    def add_driving_hours(self, hours: float):
        """Track driving time."""
        self.driving_hours_today += hours
        self.cycle_hours_used += hours
    
    def add_on_duty_hours(self, hours: float):
        """Track on-duty (not driving) time."""
        self.cycle_hours_used += hours
    
    def reset_daily_limits(self):
        """Reset after a 10-hour rest period."""
        self.driving_hours_today = 0.0
        self.on_duty_window_start = None
    
    def hours_since_window_start(self) -> float:
        """Calculate hours since on-duty window started."""
        if self.on_duty_window_start is None:
            return 0.0
        delta = self.current_time - self.on_duty_window_start
        return delta.total_seconds() / 3600


@dataclass
class LogDayData:
    """
    Summary data for one calendar day of logs.
    
    This is the intermediate format before creating Django models.
    """
    
    date: str  # YYYY-MM-DD format
    total_driving_hours: float
    total_on_duty_hours: float
    total_off_duty_hours: float
    total_sleeper_hours: float
    segments: list  # List of DutyEvent objects
