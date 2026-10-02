from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.assignment import AssignmentSource, AssignmentStatus, AssignmentType


class AssignmentGenerationConfig(BaseModel):
    types: list[AssignmentType] = [AssignmentType.MCQ, AssignmentType.SCENARIO]
    count_per_type: int = 3
    mcq_count: int | None = None  # Override count specifically for MCQs
    difficulty_range: tuple[int, int] = (1, 3)
    unit_number: int | None = None
    unit_name: str | None = None
    model: str | None = None  # Optional model override


class HintConfig(BaseModel):
    tier1_cost: int = 10
    tier2_cost: int = 30
    tier3_cost: int = 75
    dynamic_pricing_enabled: bool = False


class AssignmentUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    content: dict | None = None
    rubric: dict | None = None
    hint_config: HintConfig | None = None
    max_xp: int | None = None
    max_gold: int | None = None
    difficulty: int | None = None
    order_index: int | None = None


class AssignmentResponse(BaseModel):
    id: UUID
    course_id: UUID
    title: str
    description: str | None
    type: AssignmentType
    generated_by: AssignmentSource
    status: AssignmentStatus
    content: dict | None
    rubric: dict | None
    concept_tags: list[str] | None
    hint_config: dict | None
    max_xp: int
    max_gold: int
    difficulty: int
    order_index: int
    unit_number: int | None = None
    unit_name: str | None = None
    group_id: UUID | None = None

    model_config = ConfigDict(from_attributes=True)


class AssignmentGenerationResponse(BaseModel):
    course_id: UUID
    generated_count: int
    assignments: list[AssignmentResponse]
