from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class ReviewCreate(BaseModel):
    comment: str = Field(min_length=2)


class ReviewUpdate(BaseModel):
    comment: str = Field(min_length=2)


class ReviewResponse(BaseModel):
    id: int
    user_id: int
    recipe_id: int | None = None
    static_recipe_id: str | None = None
    comment: str
    status: str
    display_name: str
    rating: int | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)