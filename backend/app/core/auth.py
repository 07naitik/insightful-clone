"""
JWT Authentication utilities for Insightful Clone API
"""

import jwt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import hashlib

from app.core.config import settings
from app.core.database import get_db_session
from app.models.employee import Employee
from app.schemas.auth import TokenData
from app.core.exceptions import AuthenticationError, AuthorizationError

security = HTTPBearer()


class AuthManager:
    """JWT authentication manager"""
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
        """Create JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str) -> TokenData:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            employee_id: int = payload.get("sub")
            email: str = payload.get("email")
            
            if employee_id is None or email is None:
                raise AuthenticationError("Invalid token payload")
                
            token_data = TokenData(employee_id=employee_id, email=email)
            return token_data
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Token has expired")
        except jwt.JWTError:
            raise AuthenticationError("Invalid token")
    
    @staticmethod
    def hash_token(token: str) -> str:
        """Create hash of token for storage"""
        return hashlib.sha256(token.encode()).hexdigest()


auth_manager = AuthManager()


async def get_current_employee(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db_session)
) -> Employee:
    """
    Get current authenticated employee from JWT token
    """
    try:
        # Verify token
        token_data = auth_manager.verify_token(credentials.credentials)
        
        # Get employee from database
        result = await db.execute(
            select(Employee).where(
                Employee.id == token_data.employee_id,
                Employee.email == token_data.email,
                Employee.is_active == True
            )
        )
        employee = result.scalar_one_or_none()
        
        if employee is None:
            raise AuthenticationError("Employee not found or inactive")
        
        # Verify JWT hash matches stored hash (for token invalidation)
        token_hash = auth_manager.hash_token(credentials.credentials)
        if employee.jwt_hash and employee.jwt_hash != token_hash:
            raise AuthenticationError("Token has been invalidated")
        
        return employee
        
    except AuthenticationError:
        raise
    except Exception as e:
        raise AuthenticationError(f"Authentication failed: {str(e)}")


async def get_active_employee(
    current_employee: Employee = Depends(get_current_employee)
) -> Employee:
    """
    Ensure current employee is active and activated
    """
    if not current_employee.is_active:
        raise AuthorizationError("Employee account is deactivated")
    
    if not current_employee.is_activated:
        raise AuthorizationError("Employee account is not activated")
    
    return current_employee
