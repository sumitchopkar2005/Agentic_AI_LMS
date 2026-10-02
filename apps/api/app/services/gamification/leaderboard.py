"""
Leaderboard service — Valkey sorted set backed class rankings.
"""

import logging
from uuid import UUID

from app.events.publisher import get_valkey_client

logger = logging.getLogger(__name__)


async def update_leaderboard(course_id: UUID, student_id: UUID, xp_total: int) -> None:
    """Update student's XP on the course leaderboard."""
    try:
        client = await get_valkey_client()
        await client.zadd(f"leaderboard:{course_id}", {str(student_id): xp_total})
    except Exception:
        logger.warning("Failed to update Valkey leaderboard for course %s", course_id, exc_info=True)


async def get_leaderboard(course_id: UUID, limit: int = 10) -> list[dict]:
    """Get top N students on the leaderboard."""
    try:
        client = await get_valkey_client()
        results = await client.zrevrange(
            f"leaderboard:{course_id}", 0, limit - 1, withscores=True
        )
        return [
            {"student_id": member, "xp_total": int(score)}
            for member, score in results
        ]
    except Exception:
        logger.warning("Failed to read Valkey leaderboard for course %s", course_id, exc_info=True)
        return []


async def get_rank(course_id: UUID, student_id: UUID) -> int | None:
    """Get student's rank on the leaderboard (1-indexed)."""
    try:
        client = await get_valkey_client()
        rank = await client.zrevrank(f"leaderboard:{course_id}", str(student_id))
        return rank + 1 if rank is not None else None
    except Exception:
        logger.warning("Failed to get Valkey rank for student %s", student_id, exc_info=True)
        return None
