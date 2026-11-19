"""add static recipe review rating report support

Revision ID: 63484a803d60
Revises: 73d0fbecaf45
Create Date: 2026-11-13 09:09:31.989246

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '63484a803d60'
down_revision: Union[str, Sequence[str], None] = '73d0fbecaf45'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "reviews", "recipe_id",
        existing_type=sa.Integer(),
        nullable=True
    )
    op.add_column(
        "reviews",
        sa.Column("static_recipe_id", sa.String(100), nullable=True)
    )
    op.create_index(
        "ix_reviews_static_recipe_id",
        "reviews",
        ["static_recipe_id"]
    )

    op.alter_column(
        "ratings", "recipe_id",
        existing_type=sa.Integer(),
        nullable=True
    )
    op.add_column(
        "ratings",
        sa.Column("static_recipe_id", sa.String(100), nullable=True)
    )
    op.create_index(
        "ix_ratings_static_recipe_id",
        "ratings",
        ["static_recipe_id"]
    )
    op.create_unique_constraint(
        "unique_user_static_rating",
        "ratings",
        ["user_id", "static_recipe_id"]
    )

    op.add_column(
        "content_reports",
        sa.Column("static_recipe_id", sa.String(100), nullable=True)
    )
    op.create_index(
        "ix_content_reports_static_recipe_id",
        "content_reports",
        ["static_recipe_id"]
    )

def downgrade() -> None:
    op.drop_index(
        "ix_content_reports_static_recipe_id",
        table_name="content_reports"
    )
    op.drop_column("content_reports", "static_recipe_id")

    op.drop_constraint(
        "unique_user_static_rating",
        "ratings",
        type_="unique"
    )
    op.drop_index(
        "ix_ratings_static_recipe_id",
        table_name="ratings"
    )
    op.drop_column("ratings", "static_recipe_id")
    op.alter_column(
        "ratings", "recipe_id",
        existing_type=sa.Integer(),
        nullable=False
    )

    op.drop_index(
        "ix_reviews_static_recipe_id",
        table_name="reviews"
    )
    op.drop_column("reviews", "static_recipe_id")
    op.alter_column(
        "reviews", "recipe_id",
        existing_type=sa.Integer(),
        nullable=False
    )