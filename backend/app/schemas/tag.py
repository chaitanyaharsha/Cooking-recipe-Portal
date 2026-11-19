
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class TagCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: Optional[str] = None


class TagUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    description: Optional[str] = None


class TagResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class RecipeTagAssign(BaseModel):
    tag_id: int = Field(gt=0)
