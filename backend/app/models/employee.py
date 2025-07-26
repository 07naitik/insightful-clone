"""
Employee model - represents users who can log time and be tracked
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Employee(Base):
    """Employee model matching Insightful's employee schema"""
    
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # JWT token hash for session management
    jwt_hash = Column(Text, nullable=True)
    
    # Activation token for employee onboarding
    activation_token = Column(String(255), nullable=True, unique=True)
    is_activated = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    time_entries = relationship("TimeEntry", back_populates="employee", cascade="all, delete-orphan")
    screenshots = relationship("Screenshot", back_populates="employee", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Employee(id={self.id}, email='{self.email}', name='{self.name}')>"
