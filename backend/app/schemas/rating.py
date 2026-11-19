
from pydantic import BaseModel, Field, ConfigDict


class RatingCreate(BaseModel):
    score: int = Field(ge=1, le=5)


class RatingResponse(BaseModel):
    id: int
    user_id: int
    recipe_id: int | None = None
    static_recipe_id: str | None = None
    score: int

    model_config = ConfigDict(from_attributes=True)
