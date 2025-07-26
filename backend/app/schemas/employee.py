"""
Employee Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional


class EmployeeBase(BaseModel):
    """Base employee schema"""
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr


class EmployeeCreate(EmployeeBase):
    """Schema for creating new employees"""
    is_active: bool = True


class EmployeeUpdate(BaseModel):
    """Schema for updating employees"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None


class EmployeeActivate(BaseModel):
    """Schema for employee activation"""
    token: str = Field(..., min_length=1)


class EmployeeResponse(EmployeeBase):
    """Schema for employee responses"""
    id: int
    is_active: bool
    is_activated: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
