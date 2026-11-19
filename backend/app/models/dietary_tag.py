from sqlalchemy import Column, Integer, String, Text
from app.db.database import Base

class DietaryTag(Base):
    __tablename__ = "dietary_tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)