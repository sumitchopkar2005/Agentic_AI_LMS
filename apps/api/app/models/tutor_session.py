import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class TutorSession(Base, UUIDMixin, TimestampMixin):
    """Persistent tutor conversation session per student per course."""

    __tablename__ = "tutor_sessions"

    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id"), nullable=False)
    assignment_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("assignments.id"), nullable=True
    )
    learning_summary: Mapped[str] = mapped_column(Text, default="")
    topics_covered: Mapped[list] = mapped_column(JSONB, default=list)
    attempt_count: Mapped[int] = mapped_column(default=0)

    messages: Mapped[list["TutorMessage"]] = relationship(
        back_populates="session", order_by="TutorMessage.created_at"
    )


class TutorMessage(Base, UUIDMixin, TimestampMixin):
    """Individual message in a tutor conversation."""

    __tablename__ = "tutor_messages"

    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tutor_sessions.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(16), nullable=False)  # "student" or "tutor"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    citations: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    session: Mapped["TutorSession"] = relationship(back_populates="messages")
