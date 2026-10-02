"""
Badge eligibility engine — checks and awards badges.
"""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.badge import Badge
from app.models.hint_transaction import HintTransaction
from app.models.submission import Submission
from app.models.user import User

BADGE_DEFINITIONS = [
    {"name": "First Steps", "description": "Complete your first assignment", "icon": "rocket", "category": "mastery"},
    {"name": "Perseverance", "description": "Retry an assignment after failing", "icon": "shield", "category": "perseverance"},
    {"name": "Perfect Score", "description": "Score 100% on an assignment", "icon": "star", "category": "mastery"},
    {"name": "Streak Master", "description": "Maintain a 7-day streak", "icon": "flame", "category": "perseverance"},
    {"name": "Streak Legend", "description": "Maintain a 30-day streak", "icon": "crown", "category": "perseverance"},
    {"name": "Hint-Free", "description": "Complete 5 assignments without hints", "icon": "brain", "category": "mastery"},
    {"name": "Gold Saver", "description": "Accumulate 500 Gold", "icon": "coins", "category": "mastery"},
]


async def check_badge_eligibility(student_id: UUID, db: AsyncSession) -> list[dict]:
    """Check if student has earned any new badges.

    Returns list of newly awarded badges.
    """
    # Load student profile
    user_result = await db.execute(select(User).where(User.id == student_id))
    user = user_result.scalar_one_or_none()
    if not user:
        return []

    # Load existing badges to avoid duplicates
    existing_result = await db.execute(
        select(Badge.name).where(Badge.student_id == student_id)
    )
    existing_badges = set(existing_result.scalars().all())

    # Load submissions with a grade (completed assignments)
    subs_result = await db.execute(
        select(Submission).where(
            Submission.student_id == student_id,
            Submission.ai_grade.isnot(None),
        )
    )
    submissions = list(subs_result.scalars().all())

    # Count assignments that used hints
    hint_assignment_result = await db.execute(
        select(func.count(func.distinct(HintTransaction.assignment_id))).where(
            HintTransaction.student_id == student_id,
            HintTransaction.assignment_id.isnot(None),
        )
    )
    hint_assignment_count = hint_assignment_result.scalar() or 0

    # Evaluate each badge
    newly_awarded: list[dict] = []

    for badge_def in BADGE_DEFINITIONS:
        name = badge_def["name"]
        if name in existing_badges:
            continue

        earned = False

        if name == "First Steps":
            earned = len(submissions) >= 1

        elif name == "Perseverance":
            # Student retried an assignment after a failing attempt
            assignment_ids = {s.assignment_id for s in submissions}
            for aid in assignment_ids:
                attempts = [s for s in submissions if s.assignment_id == aid]
                has_fail = any(
                    s.ai_grade and s.ai_grade.get("correct") is False
                    for s in attempts
                )
                has_retry = len(attempts) >= 2
                if has_fail and has_retry:
                    earned = True
                    break

        elif name == "Perfect Score":
            earned = any(
                s.ai_grade and s.ai_grade.get("correct") is True
                for s in submissions
            )

        elif name == "Streak Master":
            earned = user.current_streak >= 7 or user.longest_streak >= 7

        elif name == "Streak Legend":
            earned = user.current_streak >= 30 or user.longest_streak >= 30

        elif name == "Hint-Free":
            graded_assignment_ids = {
                s.assignment_id for s in submissions if s.ai_grade
            }
            hint_free_count = len(graded_assignment_ids) - hint_assignment_count
            earned = hint_free_count >= 5

        elif name == "Gold Saver":
            earned = user.gold_balance >= 500

        if earned:
            badge = Badge(
                student_id=student_id,
                name=badge_def["name"],
                description=badge_def["description"],
                icon=badge_def["icon"],
                category=badge_def["category"],
            )
            db.add(badge)
            newly_awarded.append(badge_def)

    if newly_awarded:
        await db.flush()

    return newly_awarded
