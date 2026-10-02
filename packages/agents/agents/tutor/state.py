"""TutorAgent state definition."""

from typing import TypedDict


class TutorState(TypedDict):
    student_id: str
    course_id: str
    assignment_id: str
    question: str
    conversation_history: list[dict]
    retrieved_context: list[dict]
    response: str
    citations: list[dict]
    hint_offered: bool
    hint_tier: int
    hint_cost: int
    attempt_count: int
    learning_summary: str
    errors: list[str]
    # Knowledge Graph learning path fields
    kg_concepts: list[dict]       # all concepts in the course KG
    kg_edges: list[dict]          # all edges (prerequisite/leads_to/related)
    mastery_map: dict             # student's current mastery { concept_id: { level, name, last_seen } }
    current_concept: dict | None  # the concept the student should learn now
    upcoming_concepts: list[dict] # next concepts in the learning path
    mastered_concepts: list[dict] # concepts already mastered
    concept_discussed: str        # concept_id discussed in this exchange (for mastery update)
    understanding_level: str      # LLM-assessed: "understood", "partial", "none"
