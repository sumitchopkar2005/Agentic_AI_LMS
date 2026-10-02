from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import CurrentUser, get_current_faculty
from app.models.assignment import Assignment, AssignmentStatus
from app.models.submission import Submission
from app.models.user import User
from app.schemas.analytics import AtRiskResponse, CourseSummaryResponse, HeatmapResponse
from app.services.analytics.heatmap import generate_heatmap
from app.services.analytics.risk_detector import detect_at_risk_students

router = APIRouter()


@router.get("/courses/{course_id}/analytics/heatmap", response_model=HeatmapResponse)
async def get_concept_heatmap(
    course_id: UUID,
    faculty: CurrentUser = Depends(get_current_faculty),
    db: AsyncSession = Depends(get_db),
) -> HeatmapResponse:
    data = await generate_heatmap(course_id, db)
    return HeatmapResponse(
        course_id=course_id,
        concepts=data["concepts"],
        student_concept_matrix=data["student_concept_matrix"],
    )


@router.get("/courses/{course_id}/analytics/summary", response_model=CourseSummaryResponse)
async def get_course_summary(
    course_id: UUID,
    faculty: CurrentUser = Depends(get_current_faculty),
    db: AsyncSession = Depends(get_db),
) -> CourseSummaryResponse:
    # Get published assignments for this course
    assign_result = await db.execute(
        select(Assignment.id).where(
            Assignment.course_id == course_id,
            Assignment.status == AssignmentStatus.PUBLISHED,
        )
    )
    published_ids = [row[0] for row in assign_result.all()]

    # Active students (anyone with at least one submission)
    active_result = await db.execute(
        select(func.count(func.distinct(Submission.student_id))).where(
            Submission.assignment_id.in_(published_ids)
        )
    ) if published_ids else None
    active_students = active_result.scalar() if active_result else 0

    # Average score
    avg_score = 0.0
    if published_ids:
        score_result = await db.execute(
            select(
                func.avg(Submission.xp_awarded * 1.0 / func.greatest(Assignment.max_xp, 1))
            ).join(Assignment, Submission.assignment_id == Assignment.id).where(
                Submission.assignment_id.in_(published_ids),
                Submission.xp_awarded > 0,
            )
        )
        avg_score = float(score_result.scalar() or 0.0)

    # Completion rate
    completion_rate = 0.0
    if published_ids and active_students:
        distinct_completions = await db.execute(
            select(func.count()).select_from(
                select(Submission.student_id, Submission.assignment_id).where(
                    Submission.assignment_id.in_(published_ids)
                ).distinct().subquery()
            )
        )
        total_completions = distinct_completions.scalar() or 0
        completion_rate = total_completions / (active_students * len(published_ids)) if active_students else 0.0

    # Hint usage rate
    hint_usage_rate = 0.0
    if published_ids:
        total_subs = await db.execute(
            select(func.count()).where(Submission.assignment_id.in_(published_ids))
        )
        subs_with_hints = await db.execute(
            select(func.count()).where(
                Submission.assignment_id.in_(published_ids),
                Submission.hints_used.isnot(None),
            )
        )
        total = total_subs.scalar() or 0
        with_hints = subs_with_hints.scalar() or 0
        hint_usage_rate = with_hints / total if total else 0.0

    # At-risk count
    at_risk = await detect_at_risk_students(course_id, db)

    return CourseSummaryResponse(
        course_id=course_id,
        active_students=active_students or 0,
        average_score=round(avg_score, 3),
        completion_rate=round(min(completion_rate, 1.0), 3),
        hint_usage_rate=round(hint_usage_rate, 3),
        at_risk_count=len(at_risk),
    )


@router.get("/courses/{course_id}/analytics/at-risk", response_model=AtRiskResponse)
async def get_at_risk_students(
    course_id: UUID,
    faculty: CurrentUser = Depends(get_current_faculty),
    db: AsyncSession = Depends(get_db),
) -> AtRiskResponse:
    students = await detect_at_risk_students(course_id, db)
    return AtRiskResponse(course_id=course_id, students=students)
