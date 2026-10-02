"""
Feedback generation service — creates prescriptive learning recommendations.
"""

import logging

from app.config import settings

logger = logging.getLogger(__name__)


async def generate_feedback(grade_result: dict, knowledge_graph: dict) -> str:
    """Generate prescriptive feedback based on grading results.

    Identifies knowledge gaps and suggests targeted remediation.
    """
    criteria = grade_result.get("criteria", [])
    max_score = grade_result.get("max_score", 100)
    overall_score = grade_result.get("overall_score", 0)
    overall_pct = overall_score / max_score if max_score > 0 else 0.0

    # Identify low-scoring criteria (below 60%)
    weak_areas = []
    for c in criteria:
        crit_pct = c["score"] / c["max_score"] if c["max_score"] > 0 else 0
        if crit_pct < 0.6:
            weak_areas.append(c)

    # Map weak areas to knowledge graph concepts if available
    kg_concepts = knowledge_graph.get("concepts", [])
    concept_suggestions = []
    for area in weak_areas:
        area_name = area["name"].lower()
        for concept in kg_concepts:
            concept_name = concept.get("name", "").lower()
            if concept_name in area_name or area_name in concept_name:
                concept_suggestions.append(concept)

    # Build prompt for LLM feedback generation
    criteria_text = "\n".join(
        f"- {c['name']}: {c['score']}/{c['max_score']} — {c.get('evidence', '')}"
        for c in criteria
    )

    weak_text = ""
    if weak_areas:
        weak_text = "\n\nWeak areas requiring improvement:\n" + "\n".join(
            f"- {c['name']} ({c['score']}/{c['max_score']})" for c in weak_areas
        )

    concept_text = ""
    if concept_suggestions:
        concept_text = "\n\nRelated concepts to review:\n" + "\n".join(
            f"- {c.get('name', 'Unknown')}: {c.get('description', '')}"
            for c in concept_suggestions[:5]
        )

    prompt = (
        f"You are a learning coach. Generate prescriptive feedback for a student.\n\n"
        f"Overall Score: {overall_pct * 100:.1f}%\n"
        f"Criteria Results:\n{criteria_text}"
        f"{weak_text}{concept_text}\n\n"
        f"Write 3-4 sentences:\n"
        f"1. Acknowledge what they did well\n"
        f"2. Identify specific areas for improvement\n"
        f"3. Suggest concrete next steps or resources to review\n"
        f"Be encouraging and specific."
    )

    try:
        from llm import LLMRouter
        llm = LLMRouter(ollama_url=settings.ollama_base_url)
        response = await llm.complete(task_type="grading", prompt=prompt)
        return response.content.strip()
    except Exception as e:
        logger.warning("Feedback generation failed: %s", e)
        # Fallback: build basic feedback from criteria
        parts = [f"Your overall score is {overall_pct * 100:.0f}%."]
        if weak_areas:
            names = ", ".join(a["name"] for a in weak_areas[:3])
            parts.append(f"Focus on improving: {names}.")
        else:
            parts.append("Great work across all criteria!")
        return " ".join(parts)
