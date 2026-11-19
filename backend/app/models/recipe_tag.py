from sqlalchemy import Column, Integer, ForeignKey
from app.db.database import Base

class RecipeTag(Base):
    __tablename__ = "recipe_tag_map"

    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("dietary_tags.id", ondelete="CASCADE"), primary_key=True)