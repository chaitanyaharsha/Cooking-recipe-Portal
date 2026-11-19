
import os
import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Depends,
    HTTPException
)

from app.api.dependencies import get_current_user
from app.models.user import User


router = APIRouter(
    prefix="/uploads",
    tags=["Image Upload"]
)


# --------------------------------------------------
# UPLOAD CONFIGURATION
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BASE_DIR / "uploads"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_TYPES = {
    "image/jpeg": {".jpg", ".jpeg"},
    "image/png": {".png"},
    "image/webp": {".webp"}
}

MAX_FILE_SIZE = 5 * 1024 * 1024


# --------------------------------------------------
# UPLOAD RECIPE IMAGE
# --------------------------------------------------

@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Please select an image"
        )

    extension = Path(file.filename).suffix.lower()

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG and WEBP images are allowed"
        )

    if extension not in ALLOWED_TYPES[file.content_type]:
        raise HTTPException(
            status_code=400,
            detail="Image extension does not match its file type"
        )

    contents = await file.read(MAX_FILE_SIZE + 1)

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty"
        )

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Image size must not exceed 5 MB"
        )

    # Generate a unique filename
    filename = f"{uuid.uuid4().hex}{extension}"

    file_path = UPLOAD_DIR / filename

    try:
        with open(file_path, "wb") as image:
            image.write(contents)

    except OSError:
        raise HTTPException(
            status_code=500,
            detail="Unable to save uploaded image"
        )

    # Return the same response structure as the original endpoint
    return {
        "message": "Image uploaded successfully",
        "image_url": f"/uploads/{filename}"
    }
