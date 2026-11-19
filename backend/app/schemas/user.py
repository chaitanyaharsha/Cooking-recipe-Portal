from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional


class UserRegister(BaseModel):
    display_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    display_name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=100
    )

    email: Optional[EmailStr] = None

    avatar_url: Optional[str] = Field(
        default=None,
        max_length=500
    )

    bio: Optional[str] = None

    location: Optional[str] = Field(
        default=None,
        max_length=150
    )


class UserStatusUpdate(BaseModel):
    status: str = Field(pattern="^(active|inactive)$")


class UserResponse(BaseModel):
    id: int
    display_name: str
    email: EmailStr
    role: str
    status: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ModeratorCreate(BaseModel):
    display_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)