from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.submission import AppealStatus


class SubmissionCreateRequest(BaseModel):
    content: str | None = None
    content_json: dict | None = None


class GradeCriterion(BaseModel):
    name: str
    score: float
    max_score: float
    evidence: str


class AIGradeResponse(BaseModel):
    overall_score: float
    max_score: float
    criteria: list[GradeCriterion]


class SubmissionResponse(BaseModel):
    id: UUID
    assignment_id: UUID
    student_id: UUID
    content: str | None
    content_json: dict | None = None
    ai_grade: dict | None
    human_override: dict | None
    hints_used: list | dict | None
    xp_awarded: int
    gold_awarded: int
    feedback: str | None
    appeal_status: AppealStatus
    attempt_number: int

    model_config = ConfigDict(from_attributes=True)


class AppealRequest(BaseModel):
    reason: str


class CodeExecutionRequest(BaseModel):
    code: str
    language: str = "python"
    assignment_id: UUID | None = None


class TestResult(BaseModel):
    name: str
    passed: bool
    output: str | None = None
    error: str | None = None


class CodeExecutionResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    test_results: list[TestResult] | None = None
    execution_time_ms: int
