from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import shutil
import os
import uuid
from pathlib import Path

from app.auth import get_current_user, AuthenticatedUser

router = APIRouter(prefix="/api/upload", tags=["upload"])

UPLOAD_DIR = Path("app/static/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Security: Allowed file extensions and MIME types
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    try:
        # Validate file extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # Validate MIME type
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_MIME_TYPES)}"
            )

        # Read file and check size
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
            )

        # Validate image magic bytes
        if not _is_valid_image(content):
            raise HTTPException(
                status_code=400,
                detail="Invalid image file"
            )

        # Generate unique filename with user prefix for organization
        filename = f"{current_user.id[:8]}_{uuid.uuid4()}{file_ext}"
        file_path = UPLOAD_DIR / filename

        # Write file
        with file_path.open("wb") as buffer:
            buffer.write(content)

        # Return relative URL (frontend should construct full URL)
        return {"url": f"/static/uploads/{filename}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


def _is_valid_image(content: bytes) -> bool:
    """Validate image by checking magic bytes"""
    if len(content) < 8:
        return False

    # JPEG magic bytes
    if content[:2] == b'\xff\xd8':
        return True
    # PNG magic bytes
    if content[:8] == b'\x89PNG\r\n\x1a\n':
        return True
    # GIF magic bytes
    if content[:6] in (b'GIF87a', b'GIF89a'):
        return True
    # WebP magic bytes
    if content[:4] == b'RIFF' and content[8:12] == b'WEBP':
        return True

    return False
