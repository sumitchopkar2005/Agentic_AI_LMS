import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Integer, String, Uuid
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.submission import Submission


class AssignmentType(str, enum.Enum):
    MCQ = "MCQ"
    SCENARIO = "SCENARIO"
    CODE_LAB = "CODE_LAB"
    DEBATE = "DEBATE"
    REVERSE_ESSAY = "REVERSE_ESSAY"
    CUSTOM = "CUSTOM"


class AssignmentSource(str, enum.Enum):
    AI_AGENT = "AI_AGENT"
    FACULTY_MANUAL = "FACULTY_MANUAL"


class AssignmentStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    FACULTY_REVIEW = "FACULTY_REVIEW"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class Assignment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "assignments"

    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(String(5000), nullable=True)
    type: Mapped[AssignmentType] = mapped_column(Enum(AssignmentType), nullable=False)
    generated_by: Mapped[AssignmentSource] = mapped_column(
        Enum(AssignmentSource), default=AssignmentSource.AI_AGENT
    )
    status: Mapped[AssignmentStatus] = mapped_column(
        Enum(AssignmentStatus), default=AssignmentStatus.DRAFT
    )
    content: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    rubric: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    concept_tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    hint_config: Mapped[dict | None] = mapped_column(
        JSONB,
        default=lambda: {
            "tier1_cost": 10,
            "tier2_cost": 30,
            "tier3_cost": 75,
            "dynamic_pricing_enabled": False,
        },
    )
    max_xp: Mapped[int] = mapped_column(Integer, default=100)
    max_gold: Mapped[int] = mapped_column(Integer, default=25)
    prerequisite_concepts: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    difficulty: Mapped[int] = mapped_column(Integer, default=1)  # 1-5 scale
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    unit_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    unit_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    group_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True, index=True)

    # Relationships
    course: Mapped["Course"] = relationship(back_populates="assignments")
    submissions: Mapped[list["Submission"]] = relationship(back_populates="assignment")
