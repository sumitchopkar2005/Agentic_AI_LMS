import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.assignment import Assignment
    from app.models.course_material import CourseMaterial
    from app.models.institution import Institution


class GamificationLevel(str, enum.Enum):
    OFF = "OFF"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class GradingStrictness(str, enum.Enum):
    LENIENT = "LENIENT"
    MEDIUM = "MEDIUM"
    STRICT = "STRICT"


class CourseStatus(str, enum.Enum):
    SETUP = "SETUP"
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"


class Course(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "courses"

    institution_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("institutions.id"), nullable=False
    )
    faculty_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    gamification_level: Mapped[GamificationLevel] = mapped_column(
        Enum(GamificationLevel), default=GamificationLevel.MEDIUM
    )
    grading_strictness: Mapped[GradingStrictness] = mapped_column(
        Enum(GradingStrictness), default=GradingStrictness.MEDIUM
    )
    knowledge_graph_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    vector_collection: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[CourseStatus] = mapped_column(Enum(CourseStatus), default=CourseStatus.SETUP)
    hints_enabled: Mapped[bool] = mapped_column(default=True)
    leaderboard_visible: Mapped[bool] = mapped_column(default=True)
    streak_tracking_active: Mapped[bool] = mapped_column(default=True)
    mermaid_cache: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    institution: Mapped["Institution"] = relationship(back_populates="courses")
    faculty: Mapped["User"] = relationship(foreign_keys=[faculty_id])
    assignments: Mapped[list["Assignment"]] = relationship(back_populates="course")
    materials: Mapped[list["CourseMaterial"]] = relationship(back_populates="course")
