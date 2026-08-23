import os
import shutil
from pathlib import Path
from app.config import settings

class StorageService:
    """
    Abstract storage service for managing audio files.
    Defaults to local file storage, designed for easy migration to AWS S3.
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

    def save_file(self, content: bytes, filename: str, subfolder: str = "originals") -> str:
        """
        Saves bytes content to a specific subfolder and returns a relative storage path.
        """
        target_dir = self.base_path / subfolder
        target_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = target_dir / filename
        with open(file_path, "wb") as f:
            f.write(content)
            
        # Return relative storage path / key
        return f"{subfolder}/{filename}"

    def save_file_from_path(self, source_path: str, filename: str, subfolder: str = "originals") -> str:
        """
        Copies a local file into storage.
        """
        target_dir = self.base_path / subfolder
        target_dir.mkdir(parents=True, exist_ok=True)
        
        destination = target_dir / filename
        shutil.copy2(source_path, destination)
        return f"{subfolder}/{filename}"

    def get_full_path(self, relative_path: str) -> Path:
        """
        Resolves a relative storage key to an absolute Path on disk.
        """
        # Strip leading slashes
        clean_rel = relative_path.lstrip("/\\")
        return self.base_path / clean_rel

    def file_exists(self, relative_path: str) -> bool:
        return self.get_full_path(relative_path).exists()

    def delete_file(self, relative_path: str) -> bool:
        full_path = self.get_full_path(relative_path)
        if full_path.exists():
            full_path.unlink()
            return True
        return False

# Global instance singleton
storage_service = StorageService()
