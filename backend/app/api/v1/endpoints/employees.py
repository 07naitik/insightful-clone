"""
Employee management endpoints matching Insightful's Employee API
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid
import secrets

from app.core.database import get_db_session
from app.core.auth import get_current_employee, get_active_employee
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse, EmployeeActivate
from app.core.exceptions import NotFoundError, ConflictError, ValidationError
from app.core.security import password_manager

router = APIRouter()


@router.get("/me", response_model=EmployeeResponse)
async def get_current_employee_info(
    current_user: Employee = Depends(get_current_employee)
):
    """
    Get current authenticated employee information
    """
    return current_user


@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    employee_data: EmployeeCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_current_employee)
):
    """
    Create a new employee
    Generates activation token for employee onboarding
    """
    try:
        # Check if employee with email already exists
        result = await db.execute(
            select(Employee).where(Employee.email == employee_data.email)
        )
        existing_employee = result.scalar_one_or_none()
        
        if existing_employee:
            raise ConflictError("Employee with this email already exists")
        
        # Create new employee with activation token
        activation_token = secrets.token_urlsafe(32)
        employee = Employee(
            name=employee_data.name,
            email=employee_data.email,
            is_active=employee_data.is_active,
            activation_token=activation_token,
            is_activated=False
        )
        
        db.add(employee)
        await db.commit()
        await db.refresh(employee)
        
        # TODO: Send activation email with token
        # For now, we'll just return the employee data
        
        return employee
        
    except ConflictError:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create employee: {str(e)}"
        )


@router.get("/", response_model=List[EmployeeResponse])
async def list_employees(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_current_employee)
):
    """
    List all employees
    """
    try:
        result = await db.execute(
            select(Employee).offset(skip).limit(limit)
        )
        employees = result.scalars().all()
        return employees
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list employees: {str(e)}"
        )


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_current_employee)
):
    """
    Get employee by ID
    """
    try:
        result = await db.execute(
            select(Employee).where(Employee.id == employee_id)
        )
        employee = result.scalar_one_or_none()
        
        if not employee:
            raise NotFoundError("Employee")
        
        return employee
        
    except NotFoundError:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get employee: {str(e)}"
        )


@router.patch("/{employee_id}", response_model=EmployeeResponse)
@router.put("/{employee_id}", response_model=EmployeeResponse)  # Insightful-compatible alias
async def update_employee(
    employee_id: int,
    employee_data: EmployeeUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_current_employee)
):
    """
    Update employee
    """
    try:
        result = await db.execute(
            select(Employee).where(Employee.id == employee_id)
        )
        employee = result.scalar_one_or_none()
        
        if not employee:
            raise NotFoundError("Employee")
        
        # Update fields if provided
        if employee_data.name is not None:
            employee.name = employee_data.name
        if employee_data.email is not None:
            # Check if email is already taken by another employee
            existing_result = await db.execute(
                select(Employee).where(
                    Employee.email == employee_data.email,
                    Employee.id != employee_id
                )
            )
            if existing_result.scalar_one_or_none():
                raise ConflictError("Email is already taken")
            employee.email = employee_data.email
        if employee_data.is_active is not None:
            employee.is_active = employee_data.is_active
        
        await db.commit()
        await db.refresh(employee)
        
        return employee
        
    except (NotFoundError, ConflictError):
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update employee: {str(e)}"
        )


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    employee_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: Employee = Depends(get_current_employee)
):
    """
    Delete employee
    """
    try:
        result = await db.execute(
            select(Employee).where(Employee.id == employee_id)
        )
        employee = result.scalar_one_or_none()
        
        if not employee:
            raise NotFoundError("Employee")
        
        await db.delete(employee)
        await db.commit()
        
    except NotFoundError:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete employee: {str(e)}"
        )


@router.post("/activate", response_model=EmployeeResponse)
async def activate_employee(
    activation_data: EmployeeActivate,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Activate employee account with activation token
    Used by the web onboarding page
    """
    try:
        result = await db.execute(
            select(Employee).where(
                Employee.activation_token == activation_data.token,
                Employee.is_activated == False
            )
        )
        employee = result.scalar_one_or_none()
        
        if not employee:
            raise ValidationError("Invalid or already used activation token")
        
        # Set password if provided
        if activation_data.password:
            # Validate password strength
            is_valid, error_msg = password_manager.is_password_strong(activation_data.password)
            if not is_valid:
                raise ValidationError(f"Password validation failed: {error_msg}")
            
            # Hash and store password
            employee.password_hash = password_manager.hash_password(activation_data.password)
        
        # Activate the employee
        employee.is_activated = True
        employee.activation_token = None  # Clear the token
        
        await db.commit()
        await db.refresh(employee)
        
        return employee
        
    except ValidationError:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to activate employee: {str(e)}"
        )
