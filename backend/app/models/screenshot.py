"""
Screenshot model - represents screenshots captured during time tracking
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Screenshot(Base):
    """Screenshot model matching Insightful's screenshot schema"""
    
    __tablename__ = "screenshots"
    
    id = Column(Integer, primary_key=True, index=True)
    time_entry_id = Column(Integer, ForeignKey("time_entries.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    # Screenshot storage
    file_url = Column(Text, nullable=False)  # Supabase Storage URL
    file_name = Column(String(255), nullable=False)
    
    # Capture metadata
    captured_at = Column(DateTime(timezone=True), nullable=False)
    permission_flag = Column(Boolean, default=True, nullable=False)  # Screen recording permissions
    
    # Network information at capture time
    ip_address = Column(String(45), nullable=True)
    mac_address = Column(String(17), nullable=True)
    
    # File metadata
    file_size = Column(Integer, nullable=True)  # Size in bytes
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    time_entry = relationship("TimeEntry", back_populates="screenshots")
    employee = relationship("Employee", back_populates="screenshots")
    
    def __repr__(self):
        return f"<Screenshot(id={self.id}, employee_id={self.employee_id}, time_entry_id={self.time_entry_id}, permission={self.permission_flag})>"
