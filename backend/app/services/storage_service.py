import os
import shutil
import logging
from pathlib import Path
from app.config import settings

logger = logging.getLogger("voicerag")

class StorageService:
    """
    Storage service supporting local disk storage and AWS S3 bucket storage.
    Supports private AWS S3 buckets using AWS credentials and presigned URLs.
    Handles cross-platform path normalization (Windows backslashes vs S3 forward slashes).
    """
    def __init__(self, base_path: str = None):
        self.base_path = Path(base_path or settings.STORAGE_PATH).resolve()
        self.base_path.mkdir(parents=True, exist_ok=True)
        
        # Subdirectories for clean organization
        (self.base_path / "originals").mkdir(exist_ok=True)
        (self.base_path / "normalized").mkdir(exist_ok=True)
        (self.base_path / "chunks").mkdir(exist_ok=True)
        (self.base_path / "queries").mkdir(exist_ok=True)
        (self.base_path / "tts").mkdir(exist_ok=True)

        self.use_s3 = settings.USE_S3
        self.s3_client = None
        self.bucket_name = settings.S3_BUCKET_NAME

        if self.use_s3:
            try:
                import boto3
                self.s3_client = boto3.client(
                    "s3",
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_REGION
                )
                logger.info(f"AWS S3 storage initialized for bucket: {self.bucket_name}")
            except Exception as e:
                logger.error(f"Failed to initialize S3 client: {e}")

    def _normalize_key(self, relative_path: str) -> str:
        """
        Converts Windows backslashes '\\' to forward slashes '/' for S3 keys.
        """
        if not relative_path:
            return ""
        return str(relative_path).replace("\\", "/").strip("/")

    def _get_local_path(self, clean_key: str) -> Path:
        """
        Converts S3 forward-slash key into OS-native Path.
        """
        parts = [p for p in clean_key.split("/") if p]
        return self.base_path.joinpath(*parts)

    def save_file(self, content: bytes, filename: str, subfolder: str = "originals") -> str:
        """
        Saves bytes content locally and uploads to S3 if enabled.
        """
        clean_key = self._normalize_key(f"{subfolder}/{filename}")
        local_path = self._get_local_path(clean_key)
        local_path.parent.mkdir(parents=True, exist_ok=True)

        with open(local_path, "wb") as f:
            f.write(content)

        if self.use_s3 and self.s3_client and self.bucket_name:
            try:
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=clean_key,
                    Body=content
                )
                logger.info(f"Uploaded {clean_key} to S3 bucket {self.bucket_name}")
            except Exception as e:
                logger.error(f"Failed to upload {clean_key} to S3 bucket '{self.bucket_name}': {e}")

        return clean_key

    def save_file_from_path(self, source_path: str, filename: str, subfolder: str = "originals") -> str:
        """
        Copies a local file into storage and syncs to S3.
        """
        clean_key = self._normalize_key(f"{subfolder}/{filename}")
        destination = self._get_local_path(clean_key)
        destination.parent.mkdir(parents=True, exist_ok=True)
        
        shutil.copy2(source_path, destination)

        if self.use_s3 and self.s3_client and self.bucket_name:
            try:
                self.s3_client.upload_file(
                    Filename=str(destination),
                    Bucket=self.bucket_name,
                    Key=clean_key
                )
                logger.info(f"Uploaded file {clean_key} to S3 bucket {self.bucket_name}")
            except Exception as e:
                logger.error(f"Failed to upload {clean_key} to S3 bucket '{self.bucket_name}': {e}")

        return clean_key

    def get_full_path(self, relative_path: str) -> Path:
        """
        Resolves a relative storage key to an absolute Path on disk.
        If file is missing locally but exists in S3, downloads it to local cache.
        """
        clean_key = self._normalize_key(relative_path)
        local_path = self._get_local_path(clean_key)

        if not local_path.exists() and self.use_s3 and self.s3_client and self.bucket_name:
            try:
                local_path.parent.mkdir(parents=True, exist_ok=True)
                self.s3_client.download_file(self.bucket_name, clean_key, str(local_path))
                logger.info(f"Downloaded {clean_key} from S3 bucket to local cache.")
            except Exception as e:
                logger.error(f"Failed to download {clean_key} from S3 bucket '{self.bucket_name}': {e}")

        return local_path

    def file_exists(self, relative_path: str) -> bool:
        clean_key = self._normalize_key(relative_path)
        local_path = self._get_local_path(clean_key)
        if local_path.exists():
            return True
            
        if self.use_s3 and self.s3_client and self.bucket_name:
            try:
                self.s3_client.head_object(Bucket=self.bucket_name, Key=clean_key)
                return True
            except Exception:
                return False
        return False

    def delete_file(self, relative_path: str) -> bool:
        clean_key = self._normalize_key(relative_path)
        local_path = self._get_local_path(clean_key)
        deleted = False

        if local_path.exists():
            local_path.unlink()
            deleted = True

        if self.use_s3 and self.s3_client and self.bucket_name:
            try:
                self.s3_client.delete_object(Bucket=self.bucket_name, Key=clean_key)
                deleted = True
            except Exception as e:
                logger.error(f"Failed to delete {clean_key} from S3 bucket '{self.bucket_name}': {e}")

        return deleted

    def get_presigned_url(self, relative_path: str, expires_in: int = 3600) -> str:
        """
        Generates a secure temporary presigned URL for private S3 objects.
        """
        clean_key = self._normalize_key(relative_path)
        if self.use_s3 and self.s3_client and self.bucket_name:
            try:
                return self.s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": self.bucket_name, "Key": clean_key},
                    ExpiresIn=expires_in
                )
            except Exception as e:
                logger.error(f"Failed to generate presigned URL for {clean_key}: {e}")
        return f"/api/audio/{clean_key}"

# Global instance singleton
storage_service = StorageService()
