
from sqlalchemy import (
    Column, Integer, String, Text, ForeignKey,
    DateTime, Boolean
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class Recipe(Base):

    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)

    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    category_id = Column(
        Integer,
        ForeignKey("recipe_categories.id"),
        nullable=False
    )

    title = Column(String(200), nullable=False)

    description = Column(Text, nullable=True)

    image_url = Column(String(500), nullable=True)

    prep_time_minutes = Column(Integer, nullable=True)

    cook_time_minutes = Column(Integer, nullable=True)

    servings = Column(Integer, default=1, nullable=False)

    difficulty = Column(String(30), default="easy", nullable=False)

    status = Column(String(30), default="draft", nullable=False)

    # Featured recipe setting
    is_featured = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    author = relationship("User", back_populates="recipes")

    category = relationship("Category", back_populates="recipes")

    ingredients = relationship(
        "RecipeIngredient",
        back_populates="recipe",
        cascade="all, delete-orphan"
    )

    steps = relationship(
        "RecipeStep",
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="RecipeStep.step_number"
    )
