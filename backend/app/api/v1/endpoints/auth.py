"""
Authentication endpoints for JWT token management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta

from app.core.database import get_db_session
from app.core.auth import auth_manager, get_current_employee
from app.models.employee import Employee
from app.schemas.auth import Token
from app.core.exceptions import AuthenticationError

router = APIRouter()


@router.post("/token", response_model=Token)
async def login_for_access_token(
    email: str = Form(...),
    password: str = Form(...),  # For demo purposes - in production use proper password auth
    db: AsyncSession = Depends(get_db_session)
):
    """
    OAuth2 compatible token login endpoint
    For demo purposes, we'll authenticate by email only (assuming employee exists and is activated)
    """
    try:
        # Get employee by email
        result = await db.execute(
            select(Employee).where(
                Employee.email == email,
                Employee.is_active == True,
                Employee.is_activated == True
            )
        )
        employee = result.scalar_one_or_none()
        
        if not employee:
            raise AuthenticationError("Invalid credentials or account not activated")
        
        # Create access token
        access_token_expires = timedelta(hours=24)
        access_token = auth_manager.create_access_token(
            data={"sub": employee.id, "email": employee.email},
            expires_delta=access_token_expires
        )
        
        # Store token hash for session management
        token_hash = auth_manager.hash_token(access_token)
        employee.jwt_hash = token_hash
        await db.commit()
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except AuthenticationError:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@router.post("/logout")
async def logout(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Logout current user by invalidating their JWT token
    """
    try:
        # Clear the JWT hash to invalidate the token
        current_employee.jwt_hash = None
        await db.commit()
        
        return {"message": "Successfully logged out"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(e)}"
        )
