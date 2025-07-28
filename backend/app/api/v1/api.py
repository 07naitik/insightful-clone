"""
Main API router for Insightful Clone API v1
"""

from fastapi import APIRouter
from app.api.v1.endpoints import employees, projects, tasks, time_entries, screenshots, auth

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])

# Original plural routes (existing functionality)
api_router.include_router(employees.router, prefix="/employees", tags=["employees"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(time_entries.router, prefix="/time_entries", tags=["time_entries"])
api_router.include_router(screenshots.router, prefix="/screenshots", tags=["screenshots"])

# Insightful-compatible singular routes (aliases)
api_router.include_router(employees.router, prefix="/employee", tags=["employee"])
api_router.include_router(projects.router, prefix="/project", tags=["project"])
api_router.include_router(tasks.router, prefix="/task", tags=["task"])
api_router.include_router(time_entries.router, prefix="/time-tracking", tags=["time-tracking"])
