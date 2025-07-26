"""
Supabase Storage integration for screenshot uploads
"""

from supabase import create_client, Client
from storage3.constants import DEFAULT_TIMEOUT
from typing import BinaryIO, Optional
from datetime import datetime
import uuid
import os
from loguru import logger

from app.core.config import settings
from app.core.exceptions import ServerError


class StorageManager:
    """Supabase Storage manager for screenshot files"""
    
    def __init__(self):
        self.supabase: Client = create_client(
            settings.SUPABASE_PROJECT_URL,
            settings.SUPABASE_SERVICE_KEY
        )
        self.bucket_name = settings.SCREENSHOT_BUCKET_NAME
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Ensure the screenshots bucket exists"""
        try:
            # Try to get bucket info
            self.supabase.storage.get_bucket(self.bucket_name)
            logger.info(f"Storage bucket '{self.bucket_name}' exists")
        except Exception as e:
            logger.warning(f"Bucket check failed: {e}")
            try:
                # Try to create the bucket
                self.supabase.storage.create_bucket(self.bucket_name)
                logger.info(f"Created storage bucket '{self.bucket_name}'")
            except Exception as create_error:
                logger.error(f"Failed to create bucket: {create_error}")
    
    async def upload_screenshot(
        self,
        file_data: BinaryIO,
        employee_id: int,
        time_entry_id: int,
        content_type: str = "image/png"
    ) -> tuple[str, str]:
        """
        Upload screenshot to Supabase Storage
        Returns tuple of (file_url, file_name)
        """
        try:
            # Generate unique filename
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            unique_id = str(uuid.uuid4())[:8]
            file_name = f"employee_{employee_id}/time_entry_{time_entry_id}/{timestamp}_{unique_id}.png"
            
            # Upload file
            response = self.supabase.storage.from_(self.bucket_name).upload(
                file_name,
                file_data,
                file_options={
                    "content-type": content_type,
                    "cache-control": "3600"
                }
            )
            
            if response.get('error'):
                raise ServerError(f"Upload failed: {response['error']}")
            
            # Get public URL
            file_url = self.supabase.storage.from_(self.bucket_name).get_public_url(file_name)
            
            logger.info(f"Screenshot uploaded: {file_name}")
            return file_url, file_name
            
        except Exception as e:
            logger.error(f"Screenshot upload failed: {e}")
            raise ServerError(f"Failed to upload screenshot: {str(e)}")
    
    async def delete_screenshot(self, file_name: str) -> bool:
        """Delete screenshot from storage"""
        try:
            response = self.supabase.storage.from_(self.bucket_name).remove([file_name])
            
            if response.get('error'):
                logger.error(f"Delete failed: {response['error']}")
                return False
            
            logger.info(f"Screenshot deleted: {file_name}")
            return True
            
        except Exception as e:
            logger.error(f"Screenshot deletion failed: {e}")
            return False
    
    async def get_screenshot_url(self, file_name: str) -> Optional[str]:
        """Get public URL for screenshot"""
        try:
            return self.supabase.storage.from_(self.bucket_name).get_public_url(file_name)
        except Exception as e:
            logger.error(f"Failed to get screenshot URL: {e}")
            return None


# Global storage manager instance
storage_manager = StorageManager()
