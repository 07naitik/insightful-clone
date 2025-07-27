"""
Time Entry management endpoints matching Insightful's Time Tracking API
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List
from datetime import datetime

from app.core.database import get_db_session
from app.core.auth import get_current_employee, get_active_employee
from app.models.employee import Employee
from app.models.task import Task
from app.models.time_entry import TimeEntry
from app.schemas.time_entry import TimeEntryCreate, TimeEntryUpdate, TimeEntryResponse
from app.core.exceptions import NotFoundError, ConflictError, ValidationError

router = APIRouter()


@router.post("/", response_model=TimeEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_time_entry(
    time_entry_data: TimeEntryCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_active_employee)
):
    """
    Create a new time entry (clock in)
    Employee can only have one active time entry at a time
    """
    try:
        # Verify task exists
        task_result = await db.execute(
            select(Task).where(Task.id == time_entry_data.task_id)
        )
        task = task_result.scalar_one_or_none()
        
        if not task:
            raise ValidationError("Task does not exist")
        
        # Check if employee already has an active time entry
        active_entry_result = await db.execute(
            select(TimeEntry).where(
                and_(
                    TimeEntry.employee_id == current_user.id,
                    TimeEntry.end_time.is_(None)  # Active entry has no end time
                )
            )
        )
        active_entry = active_entry_result.scalar_one_or_none()
        
        if active_entry:
            raise ConflictError("Employee already has an active time entry. Please clock out first.")
        
        # Create new time entry
        time_entry = TimeEntry(
            employee_id=current_user.id,
            task_id=time_entry_data.task_id,
            start_time=datetime.utcnow(),
            ip_address=time_entry_data.ip_address,
            mac_address=time_entry_data.mac_address
        )
        
        db.add(time_entry)
        await db.commit()
        await db.refresh(time_entry)
        
        return time_entry
        
    except (ValidationError, ConflictError):
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create time entry: {str(e)}"
        )


@router.get("/", response_model=List[TimeEntryResponse])
async def list_time_entries(
    employee_id: int = None,
    task_id: int = None,
    active_only: bool = False,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_active_employee)
):
    """
    List time entries with optional filters
    """
    try:
        query = select(TimeEntry).offset(skip).limit(limit).order_by(TimeEntry.start_time.desc())
        
        # Apply filters
        if employee_id is not None:
            query = query.where(TimeEntry.employee_id == employee_id)
        
        if task_id is not None:
            query = query.where(TimeEntry.task_id == task_id)
        
        if active_only:
            query = query.where(TimeEntry.end_time.is_(None))
        
        result = await db.execute(query)
        time_entries = result.scalars().all()
        return time_entries
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list time entries: {str(e)}"
        )


@router.get("/{time_entry_id}", response_model=TimeEntryResponse)
async def get_time_entry(
    time_entry_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_active_employee)
):
    """
    Get time entry by ID
    """
    try:
        result = await db.execute(
            select(TimeEntry).where(TimeEntry.id == time_entry_id)
        )
        time_entry = result.scalar_one_or_none()
        
        if not time_entry:
            raise NotFoundError("Time entry")
        
        return time_entry
        
    except NotFoundError:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get time entry: {str(e)}"
        )


@router.patch("/{time_entry_id}", response_model=TimeEntryResponse)
async def update_time_entry(
    time_entry_id: int,
    time_entry_data: TimeEntryUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_active_employee)
):
    """
    Update time entry (typically used for clocking out)
    """
    try:
        result = await db.execute(
            select(TimeEntry).where(TimeEntry.id == time_entry_id)
        )
        time_entry = result.scalar_one_or_none()
        
        if not time_entry:
            raise NotFoundError("Time entry")
        
        # Verify employee owns this time entry
        if time_entry.employee_id != current_user.id:
            raise ValidationError("You can only update your own time entries")
        
        # Update fields if provided
        if time_entry_data.end_time is not None:
            # Validate end time is after start time
            if time_entry_data.end_time <= time_entry.start_time:
                raise ValidationError("End time must be after start time")
            time_entry.end_time = time_entry_data.end_time
        
        if time_entry_data.ip_address is not None:
            time_entry.ip_address = time_entry_data.ip_address
        
        if time_entry_data.mac_address is not None:
            time_entry.mac_address = time_entry_data.mac_address
        
        await db.commit()
        await db.refresh(time_entry)
        
        return time_entry
        
    except (NotFoundError, ValidationError):
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update time entry: {str(e)}"
        )


@router.delete("/{time_entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_time_entry(
    time_entry_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_current_employee)
):
    """
    Delete time entry
    """
    try:
        result = await db.execute(
            select(TimeEntry).where(TimeEntry.id == time_entry_id)
        )
        time_entry = result.scalar_one_or_none()
        
        if not time_entry:
            raise NotFoundError("Time entry")
        
        await db.delete(time_entry)
        await db.commit()
        
    except NotFoundError:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete time entry: {str(e)}"
        )


@router.post("/{time_entry_id}/stop", response_model=TimeEntryResponse)
async def stop_time_entry(
    time_entry_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_active_employee)
):
    """
    Stop an active time entry (clock out)
    Convenience endpoint that sets end_time to now
    """
    try:
        result = await db.execute(
            select(TimeEntry).where(TimeEntry.id == time_entry_id)
        )
        time_entry = result.scalar_one_or_none()
        
        if not time_entry:
            raise NotFoundError("Time entry")
        
        # Verify employee owns this time entry
        if time_entry.employee_id != current_user.id:
            raise ValidationError("You can only stop your own time entries")
        
        # Verify time entry is active
        if time_entry.end_time is not None:
            raise ValidationError("Time entry is already stopped")
        
        # Stop the time entry
        time_entry.end_time = datetime.utcnow()
        print(f"Stop endpoint: Setting end_time to {time_entry.end_time}")
        
        try:
            await db.commit()
            print("Stop endpoint: Database commit successful")
        except Exception as commit_error:
            print(f"Stop endpoint: Commit failed: {commit_error}")
            raise
            
        try:
            await db.refresh(time_entry)
            print("Stop endpoint: Database refresh successful")
        except Exception as refresh_error:
            print(f"Stop endpoint: Refresh failed: {refresh_error}")
            raise
        
        print(f"Stop endpoint: Returning time_entry with end_time: {time_entry.end_time}")
        return time_entry
        
    except (NotFoundError, ValidationError):
        raise
    except Exception as e:
        print(f"Stop endpoint error: {str(e)}")
        print(f"Stop endpoint error type: {type(e)}")
        import traceback
        traceback.print_exc()
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop time entry: {str(e)}"
        )
