import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.models.assignment import Assignment
from app.models.user import User


class AppealStatus(str, enum.Enum):
    NONE = "NONE"
    PENDING = "PENDING"
    REVIEWED = "REVIEWED"
    OVERTURNED = "OVERTURNED"


class Submission(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "submissions"

    assignment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assignments.id"), nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ai_grade: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    human_override: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    hints_used: Mapped[dict | None] = mapped_column(JSONB, default=list)
    xp_awarded: Mapped[int] = mapped_column(Integer, default=0)
    gold_awarded: Mapped[int] = mapped_column(Integer, default=0)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    appeal_status: Mapped[AppealStatus] = mapped_column(
        Enum(AppealStatus), default=AppealStatus.NONE
    )
    attempt_number: Mapped[int] = mapped_column(Integer, default=1)

    # Relationships
    assignment: Mapped["Assignment"] = relationship(back_populates="submissions")
    student: Mapped["User"] = relationship(back_populates="submissions")
