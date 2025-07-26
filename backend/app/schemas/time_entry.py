"""
TimeEntry Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class TimeEntryBase(BaseModel):
    """Base time entry schema"""
    task_id: int = Field(..., gt=0)
    start_time: datetime
    ip_address: Optional[str] = Field(None, max_length=45)
    mac_address: Optional[str] = Field(None, max_length=17)


class TimeEntryCreate(BaseModel):
    """Schema for creating new time entries (clock in)"""
    task_id: int = Field(..., gt=0)
    ip_address: Optional[str] = Field(None, max_length=45)
    mac_address: Optional[str] = Field(None, max_length=17)


class TimeEntryUpdate(BaseModel):
    """Schema for updating time entries (clock out)"""
    end_time: Optional[datetime] = None
    ip_address: Optional[str] = Field(None, max_length=45)
    mac_address: Optional[str] = Field(None, max_length=17)


class TimeEntryResponse(TimeEntryBase):
    """Schema for time entry responses"""
    id: int
    employee_id: int
    end_time: Optional[datetime] = None
    is_active: bool
    duration_seconds: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
