"""GraderAgent state definition."""

from typing import TypedDict


class GraderState(TypedDict):
    submission_id: str
    submission_content: str
    rubric: dict
    source_material: list[dict]
    grade_result: dict  # {overall_score, criteria: [{name, score, max, evidence}]}
    feedback: str
    consistency_check: dict  # {scores: [float], variance: float, passed: bool}
    remediation_quiz: dict | None
    current_step: str
    errors: list[str]
