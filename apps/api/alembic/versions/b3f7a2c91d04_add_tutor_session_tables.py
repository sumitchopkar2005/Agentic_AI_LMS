"""add tutor session tables

Revision ID: b3f7a2c91d04
Revises: e8bc1d46a762
Create Date: 2026-03-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b3f7a2c91d04'
down_revision: Union[str, None] = 'c5d8e2f14b63'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'tutor_sessions',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('student_id', sa.Uuid(), nullable=False),
        sa.Column('course_id', sa.Uuid(), nullable=False),
        sa.Column('assignment_id', sa.Uuid(), nullable=True),
        sa.Column('learning_summary', sa.Text(), server_default='', nullable=False),
        sa.Column('topics_covered', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=False),
        sa.Column('attempt_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['student_id'], ['users.id']),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id']),
        sa.ForeignKeyConstraint(['assignment_id'], ['assignments.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_tutor_sessions_student_course', 'tutor_sessions', ['student_id', 'course_id'])

    op.create_table(
        'tutor_messages',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('session_id', sa.Uuid(), nullable=False),
        sa.Column('role', sa.String(length=16), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('citations', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['tutor_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_tutor_messages_session_id', 'tutor_messages', ['session_id'])


def downgrade() -> None:
    op.drop_index('ix_tutor_messages_session_id', table_name='tutor_messages')
    op.drop_table('tutor_messages')
    op.drop_index('ix_tutor_sessions_student_course', table_name='tutor_sessions')
    op.drop_table('tutor_sessions')
