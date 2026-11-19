
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ReportCreate(BaseModel):
    reason: str = Field(min_length=3, max_length=100)
    details: Optional[str] = None


class ReportResponse(BaseModel):
    id: int
    reporter_id: int
    recipe_id: Optional[int] = None
    static_recipe_id: Optional[str] = None
    review_id: Optional[int] = None
    reason: str
    details: Optional[str] = None
    status: str
    resolved_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
