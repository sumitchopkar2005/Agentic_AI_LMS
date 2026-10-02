"""
At-risk student detection — flags students based on engagement patterns.
"""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.submission import Submission
from app.models.assignment import Assignment, AssignmentStatus
from app.models.user import User


async def detect_at_risk_students(course_id: UUID, db: AsyncSession) -> list[dict]:
    """Identify students at risk of falling behind.

    Risk factors (each 0.0-1.0, higher = more at risk):
    - Assignment completion rate < 50%
    - High hint dependency (> 3 hints per assignment avg)
    - Declining score trend
    - Streak breaks (current_streak == 0 and has submissions)
    """
    # Get published assignments for this course
    assign_result = await db.execute(
        select(Assignment.id).where(
            Assignment.course_id == course_id,
            Assignment.status == AssignmentStatus.PUBLISHED,
        )
    )
    published_ids = [row[0] for row in assign_result.all()]
    total_assignments = len(published_ids)

    if total_assignments == 0:
        return []

    # Get students who have submitted anything for this course
    sub_result = await db.execute(
        select(Submission.student_id).where(
            Submission.assignment_id.in_(published_ids)
        ).distinct()
    )
    student_ids = [row[0] for row in sub_result.all()]

    if not student_ids:
        return []

    at_risk = []

    for sid in student_ids:
        reasons = []
        risk_score = 0.0

        # Fetch student
        user_result = await db.execute(select(User).where(User.id == sid))
        student = user_result.scalar_one_or_none()
        if not student:
            continue

        # Completion rate
        completed_result = await db.execute(
            select(func.count(func.distinct(Submission.assignment_id))).where(
                Submission.student_id == sid,
                Submission.assignment_id.in_(published_ids),
            )
        )
        completed_count = completed_result.scalar() or 0
        completion_rate = completed_count / total_assignments

        if completion_rate < 0.5:
            risk_score += 0.3
            reasons.append(f"Low completion rate ({completion_rate:.0%})")

        # Average score
        score_result = await db.execute(
            select(Submission.xp_awarded, Assignment.max_xp).join(
                Assignment, Submission.assignment_id == Assignment.id
            ).where(
                Submission.student_id == sid,
                Submission.assignment_id.in_(published_ids),
                Submission.xp_awarded > 0,
            )
        )
        scores = score_result.all()
        if scores:
            avg_pct = sum(s[0] / max(s[1], 1) for s in scores) / len(scores)
            if avg_pct < 0.4:
                risk_score += 0.25
                reasons.append(f"Low average score ({avg_pct:.0%})")

        # Streak check
        if student.current_streak == 0 and completed_count > 0:
            risk_score += 0.2
            reasons.append("Broken streak")

        # Hint dependency
        hint_result = await db.execute(
            select(Submission.hints_used).where(
                Submission.student_id == sid,
                Submission.assignment_id.in_(published_ids),
            )
        )
        hint_rows = hint_result.scalars().all()
        total_hints = sum(
            len(h) if isinstance(h, (list, dict)) else 0
            for h in hint_rows if h
        )
        if completed_count > 0 and total_hints / completed_count > 3:
            risk_score += 0.25
            reasons.append("High hint dependency")

        if risk_score >= 0.3 and reasons:
            at_risk.append({
                "student_id": str(sid),
                "full_name": student.full_name,
                "risk_score": round(min(risk_score, 1.0), 2),
                "reasons": reasons,
            })

    at_risk.sort(key=lambda x: x["risk_score"], reverse=True)
    return at_risk
