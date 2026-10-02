from uuid import UUID

from pydantic import BaseModel


class ConceptMastery(BaseModel):
    concept_id: str
    concept_name: str
    mastery_level: float  # 0.0 - 1.0
    student_count: int


class HeatmapResponse(BaseModel):
    course_id: UUID
    concepts: list[ConceptMastery]
    student_concept_matrix: list[dict]


class CourseSummaryResponse(BaseModel):
    course_id: UUID
    active_students: int
    average_score: float
    completion_rate: float
    hint_usage_rate: float
    at_risk_count: int


class AtRiskStudent(BaseModel):
    student_id: UUID
    full_name: str
    risk_score: float
    reasons: list[str]


class AtRiskResponse(BaseModel):
    course_id: UUID
    students: list[AtRiskStudent]
