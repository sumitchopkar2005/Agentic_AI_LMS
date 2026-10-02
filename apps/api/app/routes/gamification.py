from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import CurrentUser, get_current_student
from app.models.assignment import Assignment
from app.models.badge import Badge
from app.models.submission import Submission
from app.models.user import User
from app.schemas.gamification import (
    BadgeResponse,
    HintPreviewResponse,
    HintPurchaseRequest,
    HintPurchaseResponse,
    LeaderboardEntry,
    LeaderboardResponse,
    StudentProfileResponse,
)

from app.models.course import Course

router = APIRouter()


@router.get("/students/me/profile", response_model=StudentProfileResponse)
async def get_my_profile(
    student: CurrentUser = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
) -> User:
    result = await db.execute(select(User).where(User.id == student.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
    return user


@router.get("/courses/{course_id}/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    course_id: UUID,
    student: CurrentUser = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
) -> LeaderboardResponse:
    # Verify course exists and get its institution_id
    course_result = await db.execute(select(Course).where(Course.id == course_id))
    course = course_result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    # Get all students in the same institution, ranked by XP
    from app.models.user import UserRole
    result = await db.execute(
        select(User)
        .where(User.institution_id == course.institution_id, User.role == UserRole.STUDENT)
        .order_by(User.xp_total.desc(), User.full_name.asc())
    )
    students = list(result.scalars().all())

    entries = []
    my_rank = None
    for i, s in enumerate(students, start=1):
        entries.append(LeaderboardEntry(
            rank=i,
            student_id=s.id,
            full_name=s.full_name,
            xp_total=s.xp_total,
        ))
        if s.id == student.id:
            my_rank = i

    return LeaderboardResponse(course_id=course_id, entries=entries, my_rank=my_rank)


@router.get("/assignments/{assignment_id}/hint/preview", response_model=HintPreviewResponse)
async def preview_hint(
    assignment_id: UUID,
    tier: str = "NUDGE",
    student: CurrentUser = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
) -> HintPreviewResponse:
    result = await db.execute(select(User).where(User.id == student.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")

    # Load the assignment's hint config for base costs
    a_result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = a_result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    hint_cfg = assignment.hint_config or {}
    tier_costs = {
        "NUDGE": hint_cfg.get("tier1_cost", 10),
        "GUIDANCE": hint_cfg.get("tier2_cost", 30),
        "SOLUTION": hint_cfg.get("tier3_cost", 75),
    }
    base_cost = tier_costs.get(tier, 10)

    # Count student's attempts on this assignment
    from sqlalchemy import func as sqlfunc
    attempt_result = await db.execute(
        select(sqlfunc.count()).select_from(Submission)
        .where(Submission.assignment_id == assignment_id, Submission.student_id == student.id)
    )
    attempt_count = attempt_result.scalar() or 0

    # Apply dynamic pricing if enabled
    from app.services.gamification.hint_pricing import calculate_hint_cost
    dynamic_enabled = settings.enable_dynamic_hint_pricing or hint_cfg.get("dynamic_pricing_enabled", False)
    cost = calculate_hint_cost(base_cost, attempt_count, user.gold_balance, dynamic_enabled)

    return HintPreviewResponse(
        tier=tier,
        gold_cost=cost,
        current_balance=user.gold_balance,
        can_afford=user.gold_balance >= cost,
    )


@router.post("/assignments/{assignment_id}/hint", response_model=HintPurchaseResponse)
async def purchase_hint(
    assignment_id: UUID,
    body: HintPurchaseRequest,
    student: CurrentUser = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
) -> HintPurchaseResponse:
    result = await db.execute(select(User).where(User.id == student.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")

    tier_costs = {"NUDGE": 10, "GUIDANCE": 30, "SOLUTION": 75}
    cost = tier_costs.get(body.tier, 10)

    if user.gold_balance < cost:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient gold. Need {cost}, have {user.gold_balance}.",
        )

    # Load the assignment for context
    a_result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = a_result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    # Build context from assignment content
    content = assignment.content or {}
    context_parts = []
    if assignment.description:
        context_parts.append(assignment.description)
    if content.get("question"):
        context_parts.append(f"Question: {content['question']}")
    if content.get("options"):
        options_text = ", ".join(f"{k}: {v}" for k, v in content["options"].items())
        context_parts.append(f"Options: {options_text}")
    if content.get("scenario"):
        context_parts.append(f"Scenario: {content['scenario']}")
    if content.get("problem_statement"):
        context_parts.append(f"Problem: {content['problem_statement']}")
    context_str = "\n".join(context_parts) if context_parts else assignment.title

    # Build the prompt based on tier
    tier_prompts = {
        "NUDGE": (
            f"You are a helpful tutor. A student is stuck on this assignment:\n\n"
            f"{context_str}\n\n"
            f"The correct answer is: {content.get('correct_answer', 'unknown')}\n\n"
            f"Give a subtle one-sentence NUDGE hint that points the student in the right direction "
            f"WITHOUT revealing the answer. Be encouraging."
        ),
        "GUIDANCE": (
            f"You are a helpful tutor. A student is stuck on this assignment:\n\n"
            f"{context_str}\n\n"
            f"The correct answer is: {content.get('correct_answer', 'unknown')}\n\n"
            f"Give a 2-3 sentence GUIDANCE hint that explains the key concept they need to "
            f"understand to solve this, WITHOUT directly giving the answer."
        ),
        "SOLUTION": (
            f"You are a helpful tutor. A student is stuck on this assignment:\n\n"
            f"{context_str}\n\n"
            f"The correct answer is: {content.get('correct_answer', 'unknown')}\n\n"
            f"Provide a clear step-by-step explanation of the solution."
        ),
    }

    prompt = tier_prompts.get(body.tier, tier_prompts["NUDGE"])

    # Generate hint via LLM
    try:
        from llm import LLMRouter
        llm = LLMRouter(ollama_url=settings.ollama_base_url)
        response = await llm.complete(task_type="tutoring", prompt=prompt)
        hint_text = response.content.strip()
    except Exception:
        hint_text = "Think carefully about what makes each option different from the others."

    user.gold_balance -= cost
    await db.flush()

    return HintPurchaseResponse(
        hint_text=hint_text,
        gold_cost=cost,
        new_balance=user.gold_balance,
        tier=body.tier,
    )


@router.post("/students/me/streak-freeze")
async def purchase_streak_freeze(
    student: CurrentUser = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(User).where(User.id == student.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
    cost = 100
    if user.gold_balance < cost:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient gold. Streak freeze costs {cost} Gold.",
        )
    user.gold_balance -= cost
    await db.flush()
    return {"status": "streak_freeze_purchased", "new_balance": user.gold_balance}


@router.get("/students/me/badges", response_model=list[BadgeResponse])
async def get_my_badges(
    student: CurrentUser = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
) -> list[Badge]:
    result = await db.execute(
        select(Badge).where(Badge.student_id == student.id).order_by(Badge.created_at.desc())
    )
    return list(result.scalars().all())
