
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.db.database import Base


class RecipeIngredient(Base):

    __tablename__ = "recipe_ingredients"

    id = Column(Integer, primary_key=True, index=True)

    recipe_id = Column(
        Integer,
        ForeignKey("recipes.id", ondelete="CASCADE"),
        nullable=False
    )

    ingredient_name = Column(String(150), nullable=False)

    quantity = Column(String(50), nullable=True)

    unit = Column(String(50), nullable=True)

    recipe = relationship("Recipe", back_populates="ingredients")
