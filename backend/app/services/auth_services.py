from fastapi import HTTPException, status
from app.repositories import user_repository
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token
)

def register_user(db, data):
    email = str(data.email).lower()

    existing_user = user_repository.get_user_by_email(db, email)

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    hashed_password = hash_password(data.password)

    return user_repository.create_user(
        db,
        data.display_name,
        email,
        hashed_password
    )

def login_user(db, data):
    email = str(data.email).lower()

    user = user_repository.get_user_by_email(db, email)

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active"
        )

    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer"
    }