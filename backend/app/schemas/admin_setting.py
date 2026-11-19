from pydantic import BaseModel
from typing import Optional


class AdminSettingUpdate(BaseModel):
    recipe_submissions: Optional[bool] = None
    reviews_enabled: Optional[bool] = None
    review_reports: Optional[bool] = None
    automatic_approval: Optional[bool] = None


class AdminSettingResponse(BaseModel):
    recipe_submissions: bool
    reviews_enabled: bool
    review_reports: bool
    automatic_approval: bool

    class Config:
        from_attributes = True