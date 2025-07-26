"""
Screenshot management endpoints matching Insightful's Screenshots API
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime
import os

from app.core.database import get_db_session
from app.core.auth import get_current_employee, get_active_employee
from app.core.storage import storage_manager
from app.models.employee import Employee
from app.models.time_entry import TimeEntry
from app.models.screenshot import Screenshot
from app.schemas.screenshot import ScreenshotResponse
from app.core.exceptions import NotFoundError, ValidationError, ServerError
from app.core.config import settings

router = APIRouter()


@router.post("/", response_model=ScreenshotResponse, status_code=status.HTTP_201_CREATED)
async def upload_screenshot(
    image: UploadFile = File(..., description="Screenshot image file"),
    employee_id: int = Form(...),
    time_entry_id: int = Form(...),
    permission: bool = Form(True, description="Screen recording permission flag"),
    ip: Optional[str] = Form(None, description="IP address at capture time"),
    mac: Optional[str] = Form(None, description="MAC address at capture time"),
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_active_employee)
):
    """
    Upload screenshot during time tracking
    Accepts multipart form data with image file and metadata
    """
    try:
        # Validate file type
        if not image.content_type or not image.content_type.startswith('image/'):
            raise ValidationError("File must be an image")
        
        # Validate file size (5MB limit)
        file_size = 0
        content = await image.read()
        file_size = len(content)
        
        if file_size > settings.MAX_SCREENSHOT_SIZE_MB * 1024 * 1024:
            raise ValidationError(f"File size must be less than {settings.MAX_SCREENSHOT_SIZE_MB}MB")
        
        # Verify employee exists and matches current user
        if employee_id != current_user.id:
            raise ValidationError("You can only upload screenshots for yourself")
        
        # Verify time entry exists and belongs to the employee
        time_entry_result = await db.execute(
            select(TimeEntry).where(
                TimeEntry.id == time_entry_id,
                TimeEntry.employee_id == employee_id
            )
        )
        time_entry = time_entry_result.scalar_one_or_none()
        
        if not time_entry:
            raise ValidationError("Time entry not found or does not belong to this employee")
        
        # Verify time entry is active (can only upload screenshots during active tracking)
        if time_entry.end_time is not None:
            raise ValidationError("Cannot upload screenshots for completed time entries")
        
        # Reset file pointer and upload to Supabase Storage
        import io
        file_stream = io.BytesIO(content)
        file_url, file_name = await storage_manager.upload_screenshot(
            file_stream,
            employee_id,
            time_entry_id,
            image.content_type
        )
        
        # Create screenshot record
        screenshot = Screenshot(
            time_entry_id=time_entry_id,
            employee_id=employee_id,
            file_url=file_url,
            file_name=file_name,
            captured_at=datetime.utcnow(),
            permission_flag=permission,
            ip_address=ip,
            mac_address=mac,
            file_size=file_size
        )
        
        db.add(screenshot)
        await db.commit()
        await db.refresh(screenshot)
        
        return screenshot
        
    except ValidationError:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload screenshot: {str(e)}"
        )


@router.get("/", response_model=List[ScreenshotResponse])
async def list_screenshots(
    employee_id: Optional[int] = None,
    time_entry_id: Optional[int] = None,
    permission_flag: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_active_employee)
):
    """
    List screenshots with optional filters
    """
    try:
        query = select(Screenshot).offset(skip).limit(limit).order_by(Screenshot.captured_at.desc())
        
        # Apply filters
        if employee_id is not None:
            query = query.where(Screenshot.employee_id == employee_id)
        
        if time_entry_id is not None:
            query = query.where(Screenshot.time_entry_id == time_entry_id)
        
        if permission_flag is not None:
            query = query.where(Screenshot.permission_flag == permission_flag)
        
        result = await db.execute(query)
        screenshots = result.scalars().all()
        return screenshots
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list screenshots: {str(e)}"
        )


@router.get("/{screenshot_id}", response_model=ScreenshotResponse)
async def get_screenshot(
    screenshot_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_active_employee)
):
    """
    Get screenshot by ID
    """
    try:
        result = await db.execute(
            select(Screenshot).where(Screenshot.id == screenshot_id)
        )
        screenshot = result.scalar_one_or_none()
        
        if not screenshot:
            raise NotFoundError("Screenshot")
        
        return screenshot
        
    except NotFoundError:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get screenshot: {str(e)}"
        )


@router.delete("/{screenshot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_screenshot(
    screenshot_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_current_employee)
):
    """
    Delete screenshot
    """
    try:
        result = await db.execute(
            select(Screenshot).where(Screenshot.id == screenshot_id)
        )
        screenshot = result.scalar_one_or_none()
        
        if not screenshot:
            raise NotFoundError("Screenshot")
        
        # Delete file from storage
        await storage_manager.delete_screenshot(screenshot.file_name)
        
        # Delete database record
        await db.delete(screenshot)
        await db.commit()
        
    except NotFoundError:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete screenshot: {str(e)}"
        )


@router.get("/employee/{employee_id}", response_model=List[ScreenshotResponse])
async def get_employee_screenshots(
    employee_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_active_employee)
):
    """
    Get all screenshots for a specific employee within date range
    """
    try:
        query = select(Screenshot).where(
            Screenshot.employee_id == employee_id
        ).offset(skip).limit(limit).order_by(Screenshot.captured_at.desc())
        
        # Apply date filters
        if start_date:
            query = query.where(Screenshot.captured_at >= start_date)
        
        if end_date:
            query = query.where(Screenshot.captured_at <= end_date)
        
        result = await db.execute(query)
        screenshots = result.scalars().all()
        return screenshots
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get employee screenshots: {str(e)}"
        )


@router.get("/time_entry/{time_entry_id}", response_model=List[ScreenshotResponse])
async def get_time_entry_screenshots(
    time_entry_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_active_employee)
):
    """
    Get all screenshots for a specific time entry
    """
    try:
        result = await db.execute(
            select(Screenshot).where(
                Screenshot.time_entry_id == time_entry_id
            ).order_by(Screenshot.captured_at.desc())
        )
        screenshots = result.scalars().all()
        return screenshots
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get time entry screenshots: {str(e)}"
        )
