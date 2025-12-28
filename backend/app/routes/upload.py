from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import os
import uuid
from pathlib import Path

router = APIRouter(prefix="/api/upload", tags=["upload"])

UPLOAD_DIR = Path("app/static/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Generate unique filename
        file_ext = os.path.splitext(file.filename)[1]
        filename = f"{uuid.uuid4()}{file_ext}"
        file_path = UPLOAD_DIR / filename

        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Return URL (assuming static mount at /static)
        return {"url": f"http://localhost:8000/static/uploads/{filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
