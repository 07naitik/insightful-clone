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
from app.core.exceptions import AuthenticationError
from app.core.security import password_manager
from app.schemas.auth import Token

router = APIRouter()


@router.post("/token", response_model=Token)
async def login_for_access_token(
    email: str = Form(...),
    password: str = Form(...),
    db: AsyncSession = Depends(get_db_session)
):
    """
    OAuth2 compatible token login endpoint with proper password authentication
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
        
        # Verify password
        if not employee.password_hash:
            raise AuthenticationError("Account password not set. Please complete activation.")
        
        if not password_manager.verify_password(password, employee.password_hash):
            raise AuthenticationError("Invalid credentials")
        
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
        print(f"Auth endpoint error: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication server error: {str(e)}"
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
