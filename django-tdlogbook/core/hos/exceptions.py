"""
HOS Engine Exceptions

Custom exceptions for HOS rule violations and validation errors.
These exceptions allow the system to fail loudly when assumptions are broken.
"""


class HOSException(Exception):
    """Base exception for all HOS-related errors."""
    pass


class HOSViolation(HOSException):
    """
    Raised when an HOS rule would be violated.
    
    This is a HARD failure - the log cannot be generated.
    Never persist logs when this is raised.
    """
    
    def __init__(self, rule: str, message: str, details: dict = None):
        self.rule = rule
        self.message = message
        self.details = details or {}
        super().__init__(f"HOS Violation [{rule}]: {message}")


class HOSValidationError(HOSException):
    """
    Raised when generated logs fail post-generation validation.
    
    This indicates a bug in the engine, not user error.
    """
    
    def __init__(self, validation_type: str, message: str, details: dict = None):
        self.validation_type = validation_type
        self.message = message
        self.details = details or {}
        super().__init__(f"Validation Error [{validation_type}]: {message}")


class HOSCycleExhausted(HOSViolation):
    """Raised when the 70-hour cycle would be exceeded."""
    
    def __init__(self, current_hours: float, projected_hours: float):
        super().__init__(
            rule="70_HOUR_CYCLE",
            message=f"Cycle limit exceeded. Current: {current_hours:.2f}hrs, "
                    f"Projected addition: {projected_hours:.2f}hrs, Max: 70hrs",
            details={
                "current_hours": current_hours,
                "projected_hours": projected_hours,
                "max_hours": 70
            }
        )


class HOSDrivingLimitExceeded(HOSViolation):
    """Raised when 11-hour driving limit would be exceeded."""
    
    def __init__(self, driving_hours: float):
        super().__init__(
            rule="11_HOUR_DRIVING",
            message=f"Cannot exceed 11-hour driving limit. Current: {driving_hours:.2f}hrs",
            details={"driving_hours": driving_hours, "max_hours": 11}
        )


class HOSWindowExceeded(HOSViolation):
    """Raised when 14-hour on-duty window would be exceeded."""
    
    def __init__(self, window_hours: float):
        super().__init__(
            rule="14_HOUR_WINDOW",
            message=f"Cannot drive after 14-hour window. Window duration: {window_hours:.2f}hrs",
            details={"window_hours": window_hours, "max_hours": 14}
        )


class InvalidLogSequence(HOSValidationError):
    """Raised when log segments are not properly sequenced."""
    pass
