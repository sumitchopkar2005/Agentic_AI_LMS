"""DesignerAgent state definition."""

from typing import TypedDict


class DesignerState(TypedDict):
    course_id: str
    knowledge_graph: dict
    config: dict  # gamification_level, grading_strictness, types, count, mcq_count, model, unit_number, unit_name
    ollama_base_url: str
    existing_assignments: list[dict]  # previously generated — used for dedup
    generated_assignments: list[dict]
    generated_rubrics: list[dict]
    current_step: str
    errors: list[str]
