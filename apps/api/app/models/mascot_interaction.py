"""Mascot interaction tracking — Rune's memory of past interactions."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from . import Base


class InteractionType(str, enum.Enum):
    TIP_SHOWN = "TIP_SHOWN"
    TIP_DISMISSED = "TIP_DISMISSED"
    TIP_ACTED = "TIP_ACTED"
    HINT_DELIVERED = "HINT_DELIVERED"
    CELEBRATION = "CELEBRATION"
    GREETING = "GREETING"


class MascotInteraction(Base):
    __tablename__ = "mascot_interactions"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    interaction_type: Mapped[InteractionType] = mapped_column(
        String(30), nullable=False
    )
    tip_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    context: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, nullable=False
    )
