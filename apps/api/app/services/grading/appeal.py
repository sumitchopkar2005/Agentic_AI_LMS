"""
Appeal workflow service — handles student grade appeals.
"""

import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assignment import Assignment
from app.models.submission import AppealStatus, Submission
from app.models.user import User
from app.services.gamification.xp_engine import calculate_xp
from app.services.gamification.gold_engine import calculate_gold_earned

logger = logging.getLogger(__name__)


async def submit_appeal(submission_id: UUID, reason: str, db: AsyncSession) -> None:
    """Submit a grade appeal — routes to faculty review queue."""
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    if not submission:
        raise ValueError("Submission not found")

    if submission.appeal_status != AppealStatus.NONE:
        raise ValueError(f"Appeal already in status: {submission.appeal_status.value}")

    submission.appeal_status = AppealStatus.PENDING

    # Store the appeal reason in human_override field (faculty will see it)
    submission.human_override = submission.human_override or {}
    submission.human_override = {
        **submission.human_override,
        "appeal_reason": reason,
        "appeal_status": "PENDING",
    }

    await db.flush()

    # Publish event for faculty notification
    try:
        from app.events.publisher import publish_event
        from app.events.event_types import SubmissionReceived
        await publish_event(SubmissionReceived(
            submission_id=str(submission_id),
            assignment_id=str(submission.assignment_id),
            student_id=str(submission.student_id),
        ))
    except Exception:
        logger.warning("Failed to publish appeal event for submission %s", submission_id)


async def review_appeal(
    submission_id: UUID, faculty_id: UUID, override_grade: dict | None, db: AsyncSession
) -> None:
    """Faculty reviews an appeal and optionally overrides the AI grade."""
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    if not submission:
        raise ValueError("Submission not found")

    if submission.appeal_status != AppealStatus.PENDING:
        raise ValueError("No pending appeal to review")

    if override_grade:
        # Faculty overrides the grade
        new_score = override_grade.get("overall_score", 0)
        max_score = override_grade.get("max_score", 100)
        rationale = override_grade.get("rationale", "")

        submission.human_override = {
            **(submission.human_override or {}),
            "faculty_id": str(faculty_id),
            "override_score": new_score,
            "override_max": max_score,
            "rationale": rationale,
        }
        submission.appeal_status = AppealStatus.OVERTURNED

        # Recalculate XP/Gold based on the new score
        assign_result = await db.execute(
            select(Assignment).where(Assignment.id == submission.assignment_id)
        )
        assignment = assign_result.scalar_one()

        user_result = await db.execute(select(User).where(User.id == submission.student_id))
        user = user_result.scalar_one()

        new_pct = new_score / max_score if max_score > 0 else 0.0
        hints_used = submission.hints_used if isinstance(submission.hints_used, list) else []

        new_xp = calculate_xp(assignment.max_xp, new_pct, hints_used, user.current_streak)
        new_gold = calculate_gold_earned(assignment.max_gold, new_pct, new_pct >= 1.0, user.current_streak)

        # Adjust user totals (remove old, add new)
        user.xp_total -= submission.xp_awarded
        user.gold_balance -= submission.gold_awarded
        user.xp_total += new_xp
        user.gold_balance += new_gold

        submission.xp_awarded = new_xp
        submission.gold_awarded = new_gold
    else:
        # Faculty reviewed but upheld original grade
        submission.appeal_status = AppealStatus.REVIEWED
        submission.human_override = {
            **(submission.human_override or {}),
            "faculty_id": str(faculty_id),
            "rationale": "Appeal reviewed — original grade upheld.",
        }

    await db.flush()
