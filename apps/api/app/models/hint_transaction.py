import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class HintTier(str, enum.Enum):
    NUDGE = "NUDGE"
    GUIDANCE = "GUIDANCE"
    SOLUTION = "SOLUTION"


class HintTransaction(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "hint_transactions"

    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    assignment_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("assignments.id"), nullable=True)
    tier: Mapped[HintTier] = mapped_column(Enum(HintTier), nullable=False)
    gold_cost: Mapped[int] = mapped_column(Integer, nullable=False)
    hint_text: Mapped[str] = mapped_column(Text, nullable=False)
    dynamic_price_applied: Mapped[bool] = mapped_column(Boolean, default=False)
    student_attempt_count: Mapped[int] = mapped_column(Integer, default=0)
