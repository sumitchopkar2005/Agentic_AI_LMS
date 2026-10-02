"""
Assignment publishing service — manages status transitions.
"""

import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assignment import Assignment, AssignmentStatus

logger = logging.getLogger(__name__)


async def publish_assignment(assignment_id: UUID, db: AsyncSession) -> None:
    """Transition assignment from DRAFT/FACULTY_REVIEW to PUBLISHED."""
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise ValueError("Assignment not found")

    # Validate assignment has rubric
    if not assignment.rubric:
        raise ValueError("Cannot publish: assignment has no rubric defined")

    # Validate concept_tags are non-empty
    if not assignment.concept_tags:
        raise ValueError("Cannot publish: assignment has no concept tags")

    # Validate current status allows publishing
    if assignment.status == AssignmentStatus.PUBLISHED:
        raise ValueError("Assignment is already published")
    if assignment.status == AssignmentStatus.ARCHIVED:
        raise ValueError("Cannot publish an archived assignment")

    # Update status to PUBLISHED
    assignment.status = AssignmentStatus.PUBLISHED
    await db.flush()

    # Emit assignment.published event
    try:
        from app.events.publisher import publish_event
        from app.events.event_types import AssignmentPublished
        await publish_event(AssignmentPublished(
            assignment_id=str(assignment_id),
            course_id=str(assignment.course_id),
        ))
    except Exception:
        logger.warning("Failed to publish event for assignment %s", assignment_id)
