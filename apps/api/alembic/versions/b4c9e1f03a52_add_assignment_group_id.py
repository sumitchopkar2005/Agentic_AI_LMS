"""add assignment group_id column

Revision ID: b4c9e1f03a52
Revises: a3f7b2c8d901
Create Date: 2026-03-09 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b4c9e1f03a52'
down_revision: Union[str, None] = 'a3f7b2c8d901'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('assignments', sa.Column('group_id', sa.Uuid(), nullable=True))
    op.create_index('ix_assignments_group_id', 'assignments', ['group_id'])


def downgrade() -> None:
    op.drop_index('ix_assignments_group_id', table_name='assignments')
    op.drop_column('assignments', 'group_id')
