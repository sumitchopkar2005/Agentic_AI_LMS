"""add course_materials and assignment unit fields

Revision ID: a3f7b2c8d901
Revises: e8bc1d46a762
Create Date: 2026-03-10 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a3f7b2c8d901'
down_revision: Union[str, None] = 'e8bc1d46a762'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('course_materials',
        sa.Column('course_id', sa.Uuid(), nullable=False),
        sa.Column('filename', sa.String(length=500), nullable=False),
        sa.Column('file_type', sa.String(length=10), nullable=False),
        sa.Column('file_size', sa.BigInteger(), nullable=False),
        sa.Column('object_name', sa.String(length=1000), nullable=False),
        sa.Column('status', sa.Enum('UPLOADED', 'PARSING', 'COMPLETED', 'FAILED', name='materialstatus'), nullable=False),
        sa.Column('unit_number', sa.Integer(), nullable=True),
        sa.Column('unit_name', sa.String(length=255), nullable=True),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # Add unit fields to assignments table
    op.add_column('assignments', sa.Column('unit_number', sa.Integer(), nullable=True))
    op.add_column('assignments', sa.Column('unit_name', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('assignments', 'unit_name')
    op.drop_column('assignments', 'unit_number')
    op.drop_table('course_materials')
    op.execute("DROP TYPE IF EXISTS materialstatus")
