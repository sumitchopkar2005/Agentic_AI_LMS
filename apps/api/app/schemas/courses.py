from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.course import CourseStatus, GamificationLevel, GradingStrictness
from app.models.course_material import MaterialStatus


class CourseCreateRequest(BaseModel):
    title: str
    description: str | None = None
    gamification_level: GamificationLevel = GamificationLevel.MEDIUM
    grading_strictness: GradingStrictness = GradingStrictness.MEDIUM
    hints_enabled: bool = True
    leaderboard_visible: bool = True
    streak_tracking_active: bool = True


class CourseUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    gamification_level: GamificationLevel | None = None
    grading_strictness: GradingStrictness | None = None
    hints_enabled: bool | None = None
    leaderboard_visible: bool | None = None
    streak_tracking_active: bool | None = None


class CourseResponse(BaseModel):
    id: UUID
    institution_id: UUID
    faculty_id: UUID
    title: str
    description: str | None
    gamification_level: GamificationLevel
    grading_strictness: GradingStrictness
    status: CourseStatus
    hints_enabled: bool
    leaderboard_visible: bool
    streak_tracking_active: bool

    model_config = ConfigDict(from_attributes=True)


class IngestionStatusResponse(BaseModel):
    course_id: UUID
    status: str  # parsing, chunking, embedding, graph_building, completed, failed
    progress_pct: int
    current_step: str
    estimated_remaining_seconds: int | None = None


class CourseMaterialResponse(BaseModel):
    id: UUID
    course_id: UUID
    filename: str
    file_type: str
    file_size: int
    object_name: str
    status: MaterialStatus
    unit_number: int | None = None
    unit_name: str | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
