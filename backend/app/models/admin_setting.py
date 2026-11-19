from sqlalchemy import Column, Integer, Boolean
from app.db.database import Base


class AdminSetting(Base):
    __tablename__ = "admin_settings"

    id = Column(Integer, primary_key=True, default=1)

    recipe_submissions = Column(
        Boolean,
        default=True,
        nullable=False
    )

    reviews_enabled = Column(
        Boolean,
        default=True,
        nullable=False
    )

    review_reports = Column(
        Boolean,
        default=True,
        nullable=False
    )

    automatic_approval = Column(
        Boolean,
        default=False,
        nullable=False
    )