"""
Insightful-compatible Time Tracking Backend
FastAPI application with Supabase PostgreSQL and JWT authentication
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
import sys
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import database
from app.core.exceptions import InsightfulException
from app.api.v1.api import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting Insightful Clone API")
    await database.connect()
    yield
    # Shutdown
    logger.info("Shutting down Insightful Clone API")
    await database.disconnect()


# Initialize FastAPI app
app = FastAPI(
    title="Insightful Time Tracking API",
    description="Insightful-compatible time tracking and employee monitoring API",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(InsightfulException)
async def insightful_exception_handler(request: Request, exc: InsightfulException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.message, "details": exc.details}
    )


# Add middleware for request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = logger.info(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response: {response.status_code} for {request.method} {request.url}")
    return response


# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["health"])
async def root():
    """Health check endpoint"""
    return {
        "message": "Insightful Time Tracking API",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health", tags=["health"])
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected",
        "timestamp": logger.info("Health check performed")
    }


if __name__ == "__main__":
    import uvicorn
    
    # Configure logging
    logger.remove()
    logger.add(
        sys.stdout,
        colorize=True,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level="INFO"
    )
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
