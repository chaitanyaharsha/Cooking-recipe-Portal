from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.database import Base


class ContentReport(Base):
    __tablename__ = "content_reports"

    id = Column(Integer, primary_key=True, index=True)

    reporter_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    recipe_id = Column(
        Integer,
        ForeignKey("recipes.id"),
        nullable=True
    )

    static_recipe_id = Column(String(100), nullable=True, index=True)

    review_id = Column(
        Integer,
        ForeignKey("reviews.id"),
        nullable=True
    )

    reason = Column(String(150), nullable=False)
    details = Column(Text, nullable=True)
    status = Column(String(30), default="pending", nullable=False)

    resolved_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now())