"""
Authentication Pydantic schemas for JWT tokens
"""

from pydantic import BaseModel
from typing import Optional


class Token(BaseModel):
    """JWT token response schema"""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token payload data schema"""
    employee_id: Optional[int] = None
    email: Optional[str] = None
