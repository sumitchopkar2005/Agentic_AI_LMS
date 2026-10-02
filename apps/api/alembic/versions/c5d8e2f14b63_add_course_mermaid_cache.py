"""add course mermaid_cache column

Revision ID: c5d8e2f14b63
Revises: b4c9e1f03a52
Create Date: 2026-03-09 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "c5d8e2f14b63"
down_revision = "b4c9e1f03a52"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("courses", sa.Column("mermaid_cache", JSONB, nullable=True))


def downgrade() -> None:
    op.drop_column("courses", "mermaid_cache")
