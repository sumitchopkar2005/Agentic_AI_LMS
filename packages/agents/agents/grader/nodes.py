"""GraderAgent graph nodes — evaluate_criteria, generate_feedback, check_consistency."""

import json
import logging
import re

from agents.grader.state import GraderState

logger = logging.getLogger(__name__)


async def _call_llm(prompt: str) -> str:
    """Call the LLM router for grading tasks."""
    from llm import LLMRouter
    llm = LLMRouter(ollama_url="http://localhost:11434/v1")
    response = await llm.complete(task_type="grading", prompt=prompt)
    return response.content.strip()


async def evaluate_criteria(state: GraderState) -> GraderState:
    """Evaluate submission against each rubric criterion."""
    rubric = state["rubric"]
    criteria = rubric.get("criteria", [
        {"name": "Overall Quality", "max_score": 100, "description": "Overall quality of the response"}
    ])
    submission_text = state["submission_content"]
    source_snippets = "\n".join(
        s.get("text", "")[:500] for s in state.get("source_material", [])[:3]
    )

    grade_results = []
    total_score = 0.0
    total_max = 0.0

    for criterion in criteria:
        crit_name = criterion.get("name", "Unknown")
        crit_max = criterion.get("max_score", 100)
        crit_desc = criterion.get("description", crit_name)

        prompt = (
            f"You are an expert academic grader. Grade the following student submission "
            f"against the given criterion.\n\n"
            f"## Criterion\nName: {crit_name}\nDescription: {crit_desc}\n"
            f"Max Score: {crit_max}\n\n"
            f"## Source Material (if available)\n{source_snippets or 'None provided'}\n\n"
            f"## Student Submission\n{submission_text[:2000]}\n\n"
            f"Respond with ONLY a JSON object (no markdown):\n"
            f'{{"score": <number 0 to {crit_max}>, "evidence": "<1-2 sentence justification>"}}'
        )

        try:
            text = await _call_llm(prompt)
            if text.startswith("{"):
                parsed = json.loads(text)
            else:
                start = text.find("{")
                end = text.rfind("}") + 1
                parsed = json.loads(text[start:end]) if start >= 0 else {"score": 0, "evidence": text}

            score = min(float(parsed.get("score", 0)), crit_max)
            evidence = parsed.get("evidence", "")
        except Exception as e:
            logger.warning("Grading failed for criterion %s: %s", crit_name, e)
            score = 0.0
            evidence = "Grading failed — requires manual review"

        grade_results.append({
            "name": crit_name,
            "score": score,
            "max_score": crit_max,
            "evidence": evidence,
        })
        total_score += score
        total_max += crit_max

    overall_pct = total_score / total_max if total_max > 0 else 0.0

    return {
        **state,
        "current_step": "evaluate_criteria",
        "grade_result": {
            "overall_score": round(total_score, 2),
            "max_score": total_max,
            "overall_pct": round(overall_pct, 4),
            "criteria": grade_results,
        },
    }


async def check_consistency(state: GraderState) -> GraderState:
    """Run consistency check — grade 3x and check variance."""
    original_pct = state["grade_result"].get("overall_pct", 0.0)
    submission_text = state["submission_content"][:1000]
    scores = [original_pct]

    for _ in range(2):
        try:
            prompt = (
                f"Score this student submission as a percentage (0-100). "
                f"Respond with ONLY a number.\n\n"
                f"Submission:\n{submission_text}"
            )
            text = await _call_llm(prompt)
            nums = re.findall(r"[\d.]+", text)
            pct = float(nums[0]) / 100.0 if nums else original_pct
            scores.append(min(pct, 1.0))
        except Exception:
            scores.append(original_pct)

    variance = max(scores) - min(scores)
    passed = variance <= 0.20

    return {
        **state,
        "current_step": "check_consistency",
        "consistency_check": {
            "scores": [round(s, 4) for s in scores],
            "variance": round(variance, 4),
            "passed": passed,
        },
    }


async def generate_feedback(state: GraderState) -> GraderState:
    """Generate prescriptive feedback based on grading results."""
    grade_result = state["grade_result"]
    criteria_text = "\n".join(
        f"- {c['name']}: {c['score']}/{c['max_score']} — {c['evidence']}"
        for c in grade_result.get("criteria", [])
    )

    prompt = (
        f"Based on these grading results, write 2-3 sentences of constructive feedback.\n\n"
        f"Score: {grade_result.get('overall_pct', 0) * 100:.1f}%\n"
        f"Criteria:\n{criteria_text}\n\n"
        f"Be encouraging and suggest specific improvements."
    )

    try:
        feedback = await _call_llm(prompt)
    except Exception:
        feedback = "Your submission has been graded. Please review the criteria scores for details."

    return {**state, "current_step": "generate_feedback", "feedback": feedback}
