from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, require_admin
from app.db.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserResponse,
    UserUpdate,
    UserStatusUpdate,
    ModeratorCreate
)
from app.core.security import hash_password

router = APIRouter(prefix="/users", tags=["Users"])


# View own profile
@router.get("/me", response_model=UserResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user


# Update own profile
@router.put("/me", response_model=UserResponse)
def update_my_profile(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    updates = data.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=400,
            detail="No profile details provided"
        )

    if "display_name" in updates:
        if updates["display_name"] is None or not updates["display_name"].strip():
            raise HTTPException(
                status_code=400,
                detail="Display name cannot be empty"
            )

        updates["display_name"] = updates["display_name"].strip()

    if "email" in updates:
        if updates["email"] is None:
            raise HTTPException(
                status_code=400,
                detail="Email cannot be empty"
            )

        updates["email"] = str(updates["email"]).lower()

        existing_user = db.query(User).filter(
            User.email == updates["email"],
            User.id != current_user.id
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

    if "bio" in updates and updates["bio"] is not None:
        updates["bio"] = updates["bio"].strip()

    if "location" in updates and updates["location"] is not None:
        updates["location"] = updates["location"].strip()

    if "avatar_url" in updates and updates["avatar_url"] is not None:
        updates["avatar_url"] = updates["avatar_url"].strip()

    for key, value in updates.items():
        setattr(current_user, key, value)

    db.commit()
    db.refresh(current_user)

    return current_user


# Create moderator account (Admin only)
@router.post("/moderators", response_model=UserResponse, status_code=201)
def create_moderator(
    data: ModeratorCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    email = str(data.email).lower()

    existing_user = db.query(User).filter(
        User.email == email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )

    moderator = User(
        display_name=data.display_name,
        email=email,
        password_hash=hash_password(data.password),
        role="moderator",
        status="active"
    )

    db.add(moderator)
    db.commit()
    db.refresh(moderator)

    return moderator


# View all users (Admin only)
@router.get("/", response_model=list[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    users = db.query(User).filter(
        User.status != "deleted"
    ).order_by(User.id.asc()).all()

    return users


# Activate or deactivate a user (Admin only)
@router.put("/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int,
    data: UserStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    if user_id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot change your own account status"
        )

    user = db.query(User).filter(
        User.id == user_id,
        User.status != "deleted"
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    user.status = data.status

    db.commit()
    db.refresh(user)

    return user


# Soft delete a user (Admin only)
@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    if user_id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account"
        )

    user = db.query(User).filter(
        User.id == user_id,
        User.status != "deleted"
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    user.status = "deleted"

    db.commit()

    return {
        "message": "User deleted successfully"
    }