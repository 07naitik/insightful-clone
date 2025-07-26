"""
Task Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class TaskBase(BaseModel):
    """Base task schema"""
    name: str = Field(..., min_length=1, max_length=255)
    project_id: int = Field(..., gt=0)


class TaskCreate(TaskBase):
    """Schema for creating new tasks"""
    pass


class TaskUpdate(BaseModel):
    """Schema for updating tasks"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    project_id: Optional[int] = Field(None, gt=0)


class TaskResponse(TaskBase):
    """Schema for task responses"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
