"""Tutor service — manages session persistence and learning summaries."""

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.tutor_session import TutorMessage, TutorSession

logger = logging.getLogger(__name__)


async def get_or_create_session(
    db: AsyncSession,
    student_id: uuid.UUID,
    course_id: uuid.UUID,
    assignment_id: uuid.UUID | None = None,
) -> TutorSession:
    """Get existing tutor session or create a new one."""
    stmt = (
        select(TutorSession)
        .options(selectinload(TutorSession.messages))
        .where(
            TutorSession.student_id == student_id,
            TutorSession.course_id == course_id,
        )
    )
    if assignment_id:
        stmt = stmt.where(TutorSession.assignment_id == assignment_id)

    result = await db.execute(stmt)
    session = result.scalar_one_or_none()

    if session is None:
        session = TutorSession(
            student_id=student_id,
            course_id=course_id,
            assignment_id=assignment_id,
            learning_summary="",
            topics_covered=[],
            attempt_count=0,
        )
        db.add(session)
        await db.flush()
        # Re-fetch with eagerly loaded messages to avoid lazy load issues
        result = await db.execute(
            select(TutorSession)
            .options(selectinload(TutorSession.messages))
            .where(TutorSession.id == session.id)
        )
        session = result.scalar_one()

    return session


def build_conversation_history(session: TutorSession, limit: int = 20) -> list[dict]:
    """Build conversation history dicts from the last N messages."""
    messages = session.messages[-limit:] if session.messages else []
    return [{"role": m.role, "content": m.content} for m in messages]


async def save_message(
    db: AsyncSession,
    session: TutorSession,
    role: str,
    content: str,
    citations: list[dict] | None = None,
) -> TutorMessage:
    """Persist a message to the tutor session."""
    msg = TutorMessage(
        session_id=session.id,
        role=role,
        content=content,
        citations=citations,
    )
    db.add(msg)
    return msg


async def update_learning_summary(
    db: AsyncSession,
    session: TutorSession,
    question: str,
    response: str,
) -> str:
    """Generate an updated learning summary after each exchange."""
    from agents.tutor.prompts import PROMPTS
    from llm.router import LLMRouter

    prompt = PROMPTS["learning_summary"].format(
        previous_summary=session.learning_summary or "(No previous learning)",
        question=question,
        response=response,
    )

    try:
        router = LLMRouter(ollama_url="http://localhost:11434/v1")
        result = await router.complete(
            task_type="tutoring",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=512,
        )
        session.learning_summary = result.content
        return result.content
    except Exception as e:
        logger.warning("Learning summary generation failed: %s", e)
        return session.learning_summary or ""


async def increment_attempt(db: AsyncSession, session: TutorSession) -> int:
    """Increment the attempt counter for the session."""
    session.attempt_count = (session.attempt_count or 0) + 1
    return session.attempt_count
