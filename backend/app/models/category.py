
from sqlalchemy import Column, Integer, String, Text

from app.db.database import Base
from sqlalchemy.orm import relationship


class Category(Base):

    __tablename__ = "recipe_categories"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(100), unique=True, nullable=False)

    description = Column(Text, nullable=True)

    status = Column(String(20), default="active", nullable=False)

    recipes = relationship("Recipe", back_populates="category")
