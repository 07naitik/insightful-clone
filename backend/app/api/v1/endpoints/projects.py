"""
Project management endpoints matching Insightful's Project API
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db_session
from app.core.auth import get_current_employee, get_active_employee
from app.models.employee import Employee
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.core.exceptions import NotFoundError, ConflictError

router = APIRouter()


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_current_employee)
):
    """
    Create a new project
    """
    try:
        # Check if project with same name already exists
        result = await db.execute(
            select(Project).where(Project.name == project_data.name)
        )
        existing_project = result.scalar_one_or_none()
        
        if existing_project:
            raise ConflictError("Project with this name already exists")
        
        # Create new project
        project = Project(
            name=project_data.name,
            description=project_data.description
        )
        
        db.add(project)
        await db.commit()
        await db.refresh(project)
        
        return project
        
    except ConflictError:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create project: {str(e)}"
        )


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_active_employee)
):
    """
    List all projects
    """
    try:
        result = await db.execute(
            select(Project).offset(skip).limit(limit).order_by(Project.created_at.desc())
        )
        projects = result.scalars().all()
        return projects
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list projects: {str(e)}"
        )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_active_employee)
):
    """
    Get project by ID
    """
    try:
        result = await db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one_or_none()
        
        if not project:
            raise NotFoundError("Project")
        
        return project
        
    except NotFoundError:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get project: {str(e)}"
        )


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_current_employee)
):
    """
    Update project
    """
    try:
        result = await db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one_or_none()
        
        if not project:
            raise NotFoundError("Project")
        
        # Update fields if provided
        if project_data.name is not None:
            # Check if name is already taken by another project
            existing_result = await db.execute(
                select(Project).where(
                    Project.name == project_data.name,
                    Project.id != project_id
                )
            )
            if existing_result.scalar_one_or_none():
                raise ConflictError("Project name is already taken")
            project.name = project_data.name
            
        if project_data.description is not None:
            project.description = project_data.description
        
        await db.commit()
        await db.refresh(project)
        
        return project
        
    except (NotFoundError, ConflictError):
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update project: {str(e)}"
        )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_current_employee)
):
    """
    Delete project
    """
    try:
        result = await db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one_or_none()
        
        if not project:
            raise NotFoundError("Project")
        
        await db.delete(project)
        await db.commit()
        
    except NotFoundError:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete project: {str(e)}"
        )
