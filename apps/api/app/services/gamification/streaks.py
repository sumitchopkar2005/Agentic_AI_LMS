"""
Streak tracking service — manages daily learning streaks.
"""

from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.submission import Submission
from app.models.user import User


async def update_streak(student_id: UUID, db: AsyncSession) -> dict:
    """Update the student's streak based on activity today.

    Returns {"current_streak": int, "longest_streak": int, "streak_extended": bool}
    """
    user_result = await db.execute(select(User).where(User.id == student_id))
    user = user_result.scalar_one_or_none()
    if not user:
        return {"current_streak": 0, "longest_streak": 0, "streak_extended": False}

    # Find the student's most recent submission date (last activity)
    last_sub_result = await db.execute(
        select(Submission.created_at)
        .where(Submission.student_id == student_id)
        .order_by(Submission.created_at.desc())
        .limit(1)
    )
    last_activity_row = last_sub_result.scalar_one_or_none()

    today = date.today()
    yesterday = today - timedelta(days=1)

    if last_activity_row is None:
        # First ever activity — start streak at 1
        user.current_streak = 1
        user.longest_streak = max(user.longest_streak, 1)
        await db.flush()
        return {
            "current_streak": user.current_streak,
            "longest_streak": user.longest_streak,
            "streak_extended": True,
        }

    last_date = last_activity_row.date() if hasattr(last_activity_row, "date") else last_activity_row

    if last_date == today:
        # Already counted today — no change
        return {
            "current_streak": user.current_streak,
            "longest_streak": user.longest_streak,
            "streak_extended": False,
        }

    streak_extended = False

    if last_date == yesterday:
        # Consecutive day — increment streak
        user.current_streak += 1
        streak_extended = True
    elif last_date < yesterday:
        # Streak broken — reset to 1 (today's activity starts a new streak)
        user.current_streak = 1
        streak_extended = True

    # Update longest streak if current exceeds it
    if user.current_streak > user.longest_streak:
        user.longest_streak = user.current_streak

    await db.flush()

    return {
        "current_streak": user.current_streak,
        "longest_streak": user.longest_streak,
        "streak_extended": streak_extended,
    }
