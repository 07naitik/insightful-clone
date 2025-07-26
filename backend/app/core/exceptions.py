"""
Custom exceptions for the Insightful Clone API
"""

from fastapi import HTTPException
from typing import Optional, Dict, Any


class InsightfulException(HTTPException):
    """Base exception for Insightful API errors"""
    
    def __init__(
        self,
        status_code: int,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        self.status_code = status_code
        self.message = message
        self.details = details or {}
        super().__init__(status_code=status_code, detail=message)


class AuthenticationError(InsightfulException):
    """Authentication related errors"""
    
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(status_code=401, message=message)


class AuthorizationError(InsightfulException):
    """Authorization related errors"""
    
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(status_code=403, message=message)


class NotFoundError(InsightfulException):
    """Resource not found errors"""
    
    def __init__(self, resource: str = "Resource"):
        super().__init__(status_code=404, message=f"{resource} not found")


class ValidationError(InsightfulException):
    """Validation related errors"""
    
    def __init__(self, message: str = "Validation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(status_code=422, message=message, details=details)


class ConflictError(InsightfulException):
    """Resource conflict errors"""
    
    def __init__(self, message: str = "Resource conflict"):
        super().__init__(status_code=409, message=message)


class ServerError(InsightfulException):
    """Internal server errors"""
    
    def __init__(self, message: str = "Internal server error"):
        super().__init__(status_code=500, message=message)
