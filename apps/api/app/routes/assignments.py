import asyncio
import logging
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory, get_db
from app.dependencies import CurrentUser, get_current_faculty, get_current_user
from app.models.assignment import Assignment, AssignmentStatus
from app.schemas.assignments import (
    AssignmentGenerationConfig,
    AssignmentResponse,
    AssignmentUpdateRequest,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# ── In-memory generation task store ──────────────────────────────────────────
_generation_tasks: dict[str, dict] = {}
# Hold strong refs to background tasks so they aren't garbage-collected mid-run
_background_tasks: set[asyncio.Task] = set()  # type: ignore[type-arg]


async def _run_generation(task_id: str, course_id: UUID, config_dict: dict) -> None:
    """Background coroutine that runs the designer agent with its own DB session."""
    try:
        async with async_session_factory() as db:
            from app.services.assignments.generator import generate_assignments as gen_assignments

            assignments = await gen_assignments(
                course_id=course_id,
                config=config_dict,
                db=db,
            )
            await db.commit()

            _generation_tasks[task_id].update(
                status="completed",
                result={
                    "course_id": str(course_id),
                    "generated_count": len(assignments),
                    "assignments": [
                        AssignmentResponse.model_validate(a).model_dump(mode="json")
                        for a in assignments
                    ],
                },
            )
            logger.info("Generation task %s completed — %d assignments", task_id, len(assignments))
    except Exception as exc:
        logger.exception("Generation task %s failed", task_id)
        _generation_tasks[task_id].update(status="failed", error=str(exc))


@router.post(
    "/courses/{course_id}/generate-assignments",
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_assignments(
    course_id: UUID,
    config: AssignmentGenerationConfig,
    faculty: CurrentUser = Depends(get_current_faculty),
) -> dict:
    task_id = str(uuid4())
    _generation_tasks[task_id] = {
        "task_id": task_id,
        "status": "running",
        "course_id": str(course_id),
        "result": None,
        "error": None,
    }
    task = asyncio.create_task(_run_generation(task_id, course_id, config.model_dump()))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    return {"task_id": task_id}


@router.get("/generation-tasks/{task_id}")
async def get_generation_task(
    task_id: str,
    faculty: CurrentUser = Depends(get_current_faculty),
) -> dict:
    task = _generation_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.get("/courses/{course_id}/assignments", response_model=list[AssignmentResponse])
async def list_assignments(
    course_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Assignment]:
    query = select(Assignment).where(Assignment.course_id == course_id)
    if user.role == "student":
        query = query.where(Assignment.status == AssignmentStatus.PUBLISHED)
    result = await db.execute(query.order_by(Assignment.order_index))
    return list(result.scalars().all())


@router.get("/assignments/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment(
    assignment_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Assignment:
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    if user.role == "student" and assignment.status != AssignmentStatus.PUBLISHED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    return assignment


@router.patch("/assignments/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: UUID,
    body: AssignmentUpdateRequest,
    faculty: CurrentUser = Depends(get_current_faculty),
    db: AsyncSession = Depends(get_db),
) -> Assignment:
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one()
    for field, value in body.model_dump(exclude_unset=True).items():
        if field == "hint_config" and value is not None:
            setattr(assignment, field, value.model_dump())
        else:
            setattr(assignment, field, value)
    await db.flush()
    return assignment


@router.post("/assignments/{assignment_id}/publish", response_model=AssignmentResponse)
async def publish_assignment(
    assignment_id: UUID,
    faculty: CurrentUser = Depends(get_current_faculty),
    db: AsyncSession = Depends(get_db),
) -> Assignment:
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one()
    assignment.status = AssignmentStatus.PUBLISHED
    await db.flush()
    return assignment


@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: UUID,
    faculty: CurrentUser = Depends(get_current_faculty),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    await db.delete(assignment)
    await db.flush()


@router.post("/assignments/group/{group_id}/publish", response_model=list[AssignmentResponse])
async def publish_group(
    group_id: UUID,
    faculty: CurrentUser = Depends(get_current_faculty),
    db: AsyncSession = Depends(get_db),
) -> list[Assignment]:
    result = await db.execute(
        select(Assignment).where(Assignment.group_id == group_id)
    )
    assignments = list(result.scalars().all())
    if not assignments:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    for a in assignments:
        a.status = AssignmentStatus.PUBLISHED
    await db.flush()
    return assignments


@router.delete("/assignments/group/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: UUID,
    faculty: CurrentUser = Depends(get_current_faculty),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Assignment).where(Assignment.group_id == group_id)
    )
    assignments = list(result.scalars().all())
    if not assignments:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    for a in assignments:
        await db.delete(a)
    await db.flush()
