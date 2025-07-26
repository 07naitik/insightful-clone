"""
Screenshot Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ScreenshotCreate(BaseModel):
    """Schema for creating screenshots via multipart upload"""
    employee_id: int = Field(..., gt=0)
    time_entry_id: int = Field(..., gt=0)
    ip_address: Optional[str] = Field(None, max_length=45)
    mac_address: Optional[str] = Field(None, max_length=17)
    permission_flag: bool = True
    # Note: image file will be handled separately in FastAPI as UploadFile


class ScreenshotResponse(BaseModel):
    """Schema for screenshot responses"""
    id: int
    time_entry_id: int
    employee_id: int
    file_url: str
    file_name: str
    captured_at: datetime
    permission_flag: bool
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    file_size: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True
