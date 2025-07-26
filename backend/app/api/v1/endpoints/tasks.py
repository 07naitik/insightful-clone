"""
Task management endpoints matching Insightful's Task API
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.core.database import get_db_session
from app.core.auth import get_current_employee, get_active_employee
from app.models.employee import Employee
from app.models.project import Project
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.core.exceptions import NotFoundError, ConflictError, ValidationError

router = APIRouter()


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_current_employee)
):
    """
    Create a new task within a project
    """
    try:
        # Verify project exists
        project_result = await db.execute(
            select(Project).where(Project.id == task_data.project_id)
        )
        project = project_result.scalar_one_or_none()
        
        if not project:
            raise ValidationError("Project does not exist")
        
        # Check if task with same name already exists in this project
        result = await db.execute(
            select(Task).where(
                Task.name == task_data.name,
                Task.project_id == task_data.project_id
            )
        )
        existing_task = result.scalar_one_or_none()
        
        if existing_task:
            raise ConflictError("Task with this name already exists in the project")
        
        # Create new task
        task = Task(
            name=task_data.name,
            project_id=task_data.project_id
        )
        
        db.add(task)
        await db.commit()
        await db.refresh(task)
        
        return task
        
    except (ValidationError, ConflictError):
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create task: {str(e)}"
        )


@router.get("/", response_model=List[TaskResponse])
async def list_tasks(
    project_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_active_employee)
):
    """
    List tasks, optionally filtered by project_id
    """
    try:
        query = select(Task).offset(skip).limit(limit).order_by(Task.created_at.desc())
        
        if project_id is not None:
            query = query.where(Task.project_id == project_id)
        
        result = await db.execute(query)
        tasks = result.scalars().all()
        return tasks
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list tasks: {str(e)}"
        )


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_active_employee)
):
    """
    Get task by ID
    """
    try:
        result = await db.execute(
            select(Task).where(Task.id == task_id)
        )
        task = result.scalar_one_or_none()
        
        if not task:
            raise NotFoundError("Task")
        
        return task
        
    except NotFoundError:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get task: {str(e)}"
        )


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_data: TaskUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_current_employee)
):
    """
    Update task
    """
    try:
        result = await db.execute(
            select(Task).where(Task.id == task_id)
        )
        task = result.scalar_one_or_none()
        
        if not task:
            raise NotFoundError("Task")
        
        # Update fields if provided
        if task_data.name is not None:
            # Check if name is already taken by another task in the same project
            existing_result = await db.execute(
                select(Task).where(
                    Task.name == task_data.name,
                    Task.project_id == task.project_id,
                    Task.id != task_id
                )
            )
            if existing_result.scalar_one_or_none():
                raise ConflictError("Task name is already taken in this project")
            task.name = task_data.name
        
        if task_data.project_id is not None:
            # Verify new project exists
            project_result = await db.execute(
                select(Project).where(Project.id == task_data.project_id)
            )
            if not project_result.scalar_one_or_none():
                raise ValidationError("Project does not exist")
            
            # Check if task name conflicts in new project
            existing_result = await db.execute(
                select(Task).where(
                    Task.name == task.name,
                    Task.project_id == task_data.project_id,
                    Task.id != task_id
                )
            )
            if existing_result.scalar_one_or_none():
                raise ConflictError("Task with this name already exists in the target project")
            
            task.project_id = task_data.project_id
        
        await db.commit()
        await db.refresh(task)
        
        return task
        
    except (NotFoundError, ConflictError, ValidationError):
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update task: {str(e)}"
        )


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_current_employee)
):
    """
    Delete task
    """
    try:
        result = await db.execute(
            select(Task).where(Task.id == task_id)
        )
        task = result.scalar_one_or_none()
        
        if not task:
            raise NotFoundError("Task")
        
        await db.delete(task)
        await db.commit()
        
    except NotFoundError:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete task: {str(e)}"
        )
