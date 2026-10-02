"""
Assignment generation service — orchestrates the DesignerAgent.
"""

import json
import logging
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.assignment import Assignment, AssignmentSource, AssignmentStatus, AssignmentType

logger = logging.getLogger(__name__)


async def generate_assignments(
    course_id: UUID,
    config: dict,
    db: AsyncSession,
) -> list[Assignment]:
    """Generate assignments by calling the DesignerAgent.

    Steps:
    1. Load Knowledge Graph for the course from Neo4j
    2. Load course config (gamification level, strictness)
    3. Call DesignerAgent with KG + config
    4. Store in DB with status=FACULTY_REVIEW
    """
    from kg.client import KGClient
    from agents.designer.agent import DesignerAgent

    # 1. Load Knowledge Graph (optionally filtered by unit)
    kg = KGClient(uri=settings.neo4j_uri, user=settings.neo4j_user, password=settings.neo4j_password)
    try:
        unit_number = config.get("unit_number")
        if unit_number is not None:
            graph = await kg.get_unit_graph(str(course_id), unit_number)
        else:
            graph = await kg.get_course_graph(str(course_id))
    finally:
        await kg.close()

    # 2. Load course config
    from sqlalchemy import select
    from app.models.course import Course
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one()

    # 2b. Load existing assignments for dedup — send titles/descriptions to the agent
    existing_rows = await db.execute(
        select(Assignment).where(Assignment.course_id == course_id)
    )
    existing_assignments = []
    for a in existing_rows.scalars().all():
        existing_assignments.append({
            "type": a.type.value,
            "title": a.title,
            "description": (a.description or "")[:200],
        })

    # 3. Run DesignerAgent
    agent = DesignerAgent()
    mcq_count = config.get("mcq_count") or config.get("count_per_type", 3)
    # Ensure types are plain strings (not enum objects) for agent node comparisons
    raw_types = config.get("types", ["MCQ", "SCENARIO"])
    str_types = [t.value if hasattr(t, 'value') else str(t) for t in raw_types]

    designer_config = {
        "gamification_level": course.gamification_level.value,
        "grading_strictness": course.grading_strictness.value,
        "types": str_types,
        "count_per_type": config.get("count_per_type", 3),
        "mcq_count": mcq_count,
        "difficulty_range": config.get("difficulty_range", (1, 3)),
        "unit_number": config.get("unit_number"),
        "unit_name": config.get("unit_name"),
        "model": config.get("model"),
    }

    agent_result = await agent.run({
        "course_id": str(course_id),
        "knowledge_graph": graph,
        "config": designer_config,
        "ollama_base_url": settings.ollama_base_url,
        "existing_assignments": existing_assignments,
        "generated_assignments": [],
        "generated_rubrics": [],
        "current_step": "",
        "errors": [],
    })

    # 4. Store generated assignments
    generated = agent_result.get("generated_assignments", [])
    assignments = []
    order_idx = 0
    unit_number = config.get("unit_number")
    unit_name = config.get("unit_name")

    # MCQs generated together share a group_id
    mcq_group_id = uuid4() if any(item.get("type") == "MCQ" for item in generated) else None

    for item in generated:
        a_type = item.get("type", "MCQ")
        try:
            assignment_type = AssignmentType(a_type)
        except ValueError:
            assignment_type = AssignmentType.MCQ

        assignment = Assignment(
            course_id=course_id,
            title=item.get("title", f"Generated {a_type} Assignment"),
            description=item.get("description"),
            type=assignment_type,
            generated_by=AssignmentSource.AI_AGENT,
            status=AssignmentStatus.FACULTY_REVIEW,
            content=item.get("content"),
            rubric=item.get("rubric"),
            concept_tags=item.get("concept_tags", []),
            max_xp=item.get("max_xp", 100),
            max_gold=item.get("max_gold", 25),
            difficulty=item.get("difficulty", 2),
            order_index=order_idx,
            unit_number=unit_number,
            unit_name=unit_name,
            group_id=mcq_group_id if assignment_type == AssignmentType.MCQ else None,
        )
        db.add(assignment)
        assignments.append(assignment)
        order_idx += 1

    await db.flush()
    logger.info("Generated %d assignments for course %s", len(assignments), course_id)
    return assignments
