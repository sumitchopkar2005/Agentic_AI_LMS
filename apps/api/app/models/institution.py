import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.user import User


class DataResidency(str, enum.Enum):
    US_EAST = "US_EAST"
    US_WEST = "US_WEST"
    EU_WEST = "EU_WEST"
    AP_SOUTHEAST = "AP_SOUTHEAST"


class Institution(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "institutions"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    lti_config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    data_residency: Mapped[DataResidency] = mapped_column(
        Enum(DataResidency), default=DataResidency.US_EAST
    )
    llm_config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    courses: Mapped[list["Course"]] = relationship(back_populates="institution")
    users: Mapped[list["User"]] = relationship(back_populates="institution")
