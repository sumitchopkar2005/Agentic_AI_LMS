import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.institution import Institution
    from app.models.submission import Submission


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    FACULTY = "faculty"
    TA = "ta"
    STUDENT = "student"


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    institution_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("institutions.id"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    keycloak_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)

    # Gamification fields (for students)
    xp_total: Mapped[int] = mapped_column(Integer, default=0)
    gold_balance: Mapped[int] = mapped_column(Integer, default=100)  # Starting gold
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)
    badges: Mapped[dict | None] = mapped_column(JSONB, default=list)
    mastery_map: Mapped[dict | None] = mapped_column(JSONB, default=dict)

    # Relationships
    institution: Mapped["Institution"] = relationship(back_populates="users")
    submissions: Mapped[list["Submission"]] = relationship(back_populates="student")
