"""
HOS (Hours of Service) Engine Package

This package contains pure business logic for generating FMCSA-compliant logs.
It is intentionally separated from Django so it can be:
- Tested independently
- Reused for ELD integrations
- Audited for regulatory compliance
- Understood without Django knowledge

Key files:
- types.py: Data structures (input/output DTOs)
- rules.py: FMCSA constants and limits
- validators.py: Input validation logic
- engine.py: Core log generation algorithm
"""
