"""
Grading service — orchestrates the GraderAgent for submission evaluation.
"""

import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.assignment import Assignment
from app.models.submission import Submission
from app.models.user import User
from app.services.gamification.xp_engine import calculate_xp
from app.services.gamification.gold_engine import calculate_gold_earned

logger = logging.getLogger(__name__)


async def grade_submission(submission_id: UUID, db: AsyncSession) -> dict:
    """Grade a submission using the LLM-based grading pipeline.

    Steps:
    1. Load submission + assignment rubric
    2. Call LLM to evaluate against each rubric criterion
    3. Run consistency check (grade 3x, check variance)
    4. Update submission with ai_grade + feedback
    5. Award XP/Gold via engines
    """
    # 1. Load submission and assignment
    sub_result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = sub_result.scalar_one_or_none()
    if not submission:
        return {"error": "Submission not found"}

    assign_result = await db.execute(
        select(Assignment).where(Assignment.id == submission.assignment_id)
    )
    assignment = assign_result.scalar_one()

    rubric = assignment.rubric or {}
    criteria = rubric.get("criteria", [])
    if not criteria:
        criteria = [{"name": "Overall Quality", "max_score": 100, "description": "Overall quality of the response"}]

    submission_text = submission.content or ""
    if submission.content_json:
        submission_text += "\n" + str(submission.content_json)

    # 2. Grade against each criterion via LLM
    from llm import LLMRouter
    llm = LLMRouter(ollama_url=settings.ollama_base_url)

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
            f"## Assignment\nTitle: {assignment.title}\n"
            f"Description: {assignment.description or 'N/A'}\n\n"
            f"## Criterion\nName: {crit_name}\nDescription: {crit_desc}\n"
            f"Max Score: {crit_max}\n\n"
            f"## Student Submission\n{submission_text}\n\n"
            f"## Instructions\n"
            f"Respond with ONLY a JSON object (no markdown):\n"
            f'{{"score": <number 0 to {crit_max}>, "evidence": "<1-2 sentence justification>"}}'
        )

        try:
            response = await llm.complete(task_type="grading", prompt=prompt)
            import json
            # Parse the LLM response — extract JSON
            text = response.content.strip()
            # Try to extract JSON from the response
            if text.startswith("{"):
                parsed = json.loads(text)
            else:
                # Try to find JSON in the text
                start = text.find("{")
                end = text.rfind("}") + 1
                parsed = json.loads(text[start:end]) if start >= 0 else {"score": 0, "evidence": text}

            score = min(float(parsed.get("score", 0)), crit_max)
            evidence = parsed.get("evidence", "")
        except Exception as e:
            logger.warning("LLM grading failed for criterion %s: %s", crit_name, e)
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

    # 3. Consistency check — grade 2 more times for overall score, check variance
    overall_pct = total_score / total_max if total_max > 0 else 0.0
    regrade_scores = [overall_pct]

    for _ in range(2):
        try:
            verify_prompt = (
                f"You are an expert grader verifying a grade. "
                f"The assignment is: {assignment.title}\n"
                f"Student submission:\n{submission_text[:1000]}\n\n"
                f"Score this submission as a percentage (0-100). "
                f"Respond with ONLY a number."
            )
            resp = await llm.complete(task_type="grading", prompt=verify_prompt)
            import re
            nums = re.findall(r"[\d.]+", resp.content.strip())
            pct = float(nums[0]) / 100.0 if nums else overall_pct
            regrade_scores.append(min(pct, 1.0))
        except Exception:
            regrade_scores.append(overall_pct)

    variance = max(regrade_scores) - min(regrade_scores)
    needs_human_review = variance > 0.20

    # Use the average of all scores as the final
    final_pct = sum(regrade_scores) / len(regrade_scores)
    final_score = final_pct * total_max

    # 4. Update submission
    submission.ai_grade = {
        "overall_score": round(final_score, 2),
        "max_score": total_max,
        "criteria": grade_results,
        "consistency": {
            "scores": [round(s, 4) for s in regrade_scores],
            "variance": round(variance, 4),
            "passed": not needs_human_review,
        },
    }

    # Generate feedback
    feedback_prompt = (
        f"Based on these grading results, write 2-3 sentences of constructive feedback:\n\n"
        f"Assignment: {assignment.title}\n"
        f"Score: {round(final_pct * 100, 1)}%\n"
        f"Criteria results:\n"
    )
    for r in grade_results:
        feedback_prompt += f"- {r['name']}: {r['score']}/{r['max_score']} — {r['evidence']}\n"
    feedback_prompt += "\nBe encouraging and suggest specific improvements."

    try:
        feedback_resp = await llm.complete(task_type="grading", prompt=feedback_prompt)
        submission.feedback = feedback_resp.content.strip()
    except Exception:
        submission.feedback = "Your submission has been graded. Please review the criteria scores for details."

    # 5. Award XP/Gold
    hints_used = submission.hints_used if isinstance(submission.hints_used, list) else []
    user_result = await db.execute(select(User).where(User.id == submission.student_id))
    user = user_result.scalar_one()

    xp = calculate_xp(assignment.max_xp, final_pct, hints_used, user.current_streak)
    gold = calculate_gold_earned(assignment.max_gold, final_pct, final_pct >= 1.0, user.current_streak)

    submission.xp_awarded = xp
    submission.gold_awarded = gold
    user.xp_total += xp
    user.gold_balance += gold

    await db.flush()

    return {
        "submission_id": str(submission_id),
        "overall_score": round(final_score, 2),
        "max_score": total_max,
        "percentage": round(final_pct * 100, 1),
        "xp_awarded": xp,
        "gold_awarded": gold,
        "needs_human_review": needs_human_review,
    }
