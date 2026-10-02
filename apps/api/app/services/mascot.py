"""Mascot tip evaluation engine and interaction logging."""

import uuid
from datetime import datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mascot_interaction import MascotInteraction, InteractionType
from app.models.user import User
from app.models.submission import Submission
from app.models.hint_transaction import HintTransaction
from app.schemas.mascot import MascotTip


async def evaluate_tips(
    student_id: uuid.UUID,
    role: str,
    db: AsyncSession,
) -> list[MascotTip]:
    """Evaluate tip rules for a student/faculty and return applicable tips."""
    tips: list[MascotTip] = []

    # Load user profile
    user = await db.get(User, student_id)
    if not user:
        return tips

    if role == "student":
        tips.extend(await _student_tips(user, student_id, db))
    elif role == "faculty":
        tips.extend(_faculty_tips(user))

    return tips


async def _student_tips(
    user: User, student_id: uuid.UUID, db: AsyncSession
) -> list[MascotTip]:
    tips: list[MascotTip] = []

    # Gold low warning
    if user.gold_balance < 20:
        tips.append(MascotTip(
            id="gold_low",
            text=f"Running low on Gold ({user.gold_balance}G)! Complete quests to stock up.",
            type="warning",
            priority="medium",
        ))

    # Level near (within 50 XP)
    level = (user.xp_total // 500) + 1
    next_level_xp = level * 500
    xp_needed = next_level_xp - user.xp_total
    if 0 < xp_needed <= 50:
        tips.append(MascotTip(
            id="level_near",
            text=f"Just {xp_needed} XP until Level {level + 1}! You're almost there.",
            type="tip",
            priority="medium",
            action_label="View Quests",
            action_href="/student/dashboard",
        ))

    # Streak encouragement
    if user.current_streak >= 7:
        tips.append(MascotTip(
            id="streak_strong",
            text=f"Amazing {user.current_streak}-day streak! Keep it going.",
            type="celebration",
            priority="low",
        ))

    # Struggling detection (3+ submissions on same assignment with low scores)
    struggling_query = (
        select(Submission.assignment_id, func.count())
        .where(Submission.student_id == student_id)
        .where(Submission.score_pct < 0.5)
        .group_by(Submission.assignment_id)
        .having(func.count() >= 3)
        .limit(1)
    )
    result = await db.execute(struggling_query)
    struggling = result.first()
    if struggling:
        tips.append(MascotTip(
            id="struggling",
            text="Tough one, huh? A Nudge hint might help — only 10 Gold.",
            type="tip",
            priority="high",
        ))

    return tips


def _faculty_tips(user: User) -> list[MascotTip]:
    tips: list[MascotTip] = []

    tips.append(MascotTip(
        id="faculty_greeting",
        text="Your scholars are counting on you, Guild Master!",
        type="greeting",
        priority="low",
    ))

    return tips


async def log_interaction(
    student_id: uuid.UUID,
    interaction_type: str,
    tip_id: str | None,
    context: dict | None,
    db: AsyncSession,
) -> None:
    """Log a mascot interaction for memory/analytics."""
    interaction = MascotInteraction(
        student_id=student_id,
        interaction_type=interaction_type,
        tip_id=tip_id,
        context=context,
    )
    db.add(interaction)
    await db.commit()
