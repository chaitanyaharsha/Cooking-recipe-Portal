from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    DateTime,
    UniqueConstraint,
    CheckConstraint
)
from sqlalchemy.sql import func
from app.db.database import Base


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    recipe_id = Column(
        Integer,
        ForeignKey("recipes.id", ondelete="CASCADE"),
        nullable=True
    )

    static_recipe_id = Column(String(100), nullable=True, index=True)

    score = Column(Integer, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "recipe_id",
            name="unique_user_rating"
        ),
        UniqueConstraint(
            "user_id",
            "static_recipe_id",
            name="unique_user_static_rating"
        ),
        CheckConstraint(
            "score >= 1 AND score <= 5",
            name="valid_rating_score"
        ),
    )