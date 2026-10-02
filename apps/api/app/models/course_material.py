import enum
import uuid

from sqlalchemy import BigInteger, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class MaterialStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    PARSING = "PARSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class CourseMaterial(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "course_materials"

    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id"), nullable=False)
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(10), nullable=False)  # pdf, pptx, docx
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    object_name: Mapped[str] = mapped_column(String(1000), nullable=False)  # MinIO path
    status: Mapped[MaterialStatus] = mapped_column(
        Enum(MaterialStatus), default=MaterialStatus.UPLOADED
    )
    unit_number: Mapped[int | None] = mapped_column(nullable=True)
    unit_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    course: Mapped["Course"] = relationship(back_populates="materials")
