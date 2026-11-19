
from sqlalchemy import Column, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.db.database import Base


class RecipeStep(Base):

    __tablename__ = "recipe_steps"

    id = Column(Integer, primary_key=True, index=True)

    recipe_id = Column(
        Integer,
        ForeignKey("recipes.id", ondelete="CASCADE"),
        nullable=False
    )

    step_number = Column(Integer, nullable=False)

    instruction = Column(Text, nullable=False)

    recipe = relationship("Recipe", back_populates="steps")
