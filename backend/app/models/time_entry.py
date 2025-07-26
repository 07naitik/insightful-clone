"""
TimeEntry model - represents time tracking sessions by employees
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class TimeEntry(Base):
    """TimeEntry model matching Insightful's time tracking schema"""
    
    __tablename__ = "time_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    
    # Time tracking
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)  # Null while active
    
    # Network information captured during time tracking
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    mac_address = Column(String(17), nullable=True)  # MAC address format
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    employee = relationship("Employee", back_populates="time_entries")
    task = relationship("Task", back_populates="time_entries")
    screenshots = relationship("Screenshot", back_populates="time_entry", cascade="all, delete-orphan")
    
    @property
    def is_active(self) -> bool:
        """Check if this time entry is currently active (no end time)"""
        return self.end_time is None
    
    @property
    def duration_seconds(self) -> int:
        """Calculate duration in seconds"""
        if self.end_time is None:
            return 0
        return int((self.end_time - self.start_time).total_seconds())
    
    def __repr__(self):
        return f"<TimeEntry(id={self.id}, employee_id={self.employee_id}, task_id={self.task_id}, active={self.is_active})>"
