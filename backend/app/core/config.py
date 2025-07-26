"""
Configuration management for the Insightful Clone API
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database settings
    SUPABASE_DB_URL: str = Field(..., description="PostgreSQL database URL")
    SUPABASE_SERVICE_KEY: str = Field(..., description="Supabase service key")
    SUPABASE_PROJECT_URL: str = Field(..., description="Supabase project URL")
    
    # JWT settings
    JWT_SECRET: str = Field(default="supersecret", description="JWT secret key")
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    JWT_EXPIRATION_HOURS: int = Field(default=24, description="JWT expiration in hours")
    
    # API settings
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Insightful Time Tracking API"
    
    # Screenshot settings
    SCREENSHOT_BUCKET_NAME: str = "screenshots"
    MAX_SCREENSHOT_SIZE_MB: int = 5
    
    # App settings
    DEBUG: bool = Field(default=False, description="Debug mode")
    ENVIRONMENT: str = Field(default="development", description="Environment")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
