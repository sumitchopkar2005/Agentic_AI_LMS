"""Mascot API endpoints — Rune's tips and interaction logging."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import CurrentUser, get_current_user
from app.schemas.mascot import InteractionLog, MascotTipsResponse
from app.services.mascot import evaluate_tips, log_interaction

router = APIRouter()


@router.get("/mascot/tips", response_model=MascotTipsResponse)
async def get_tips(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MascotTipsResponse:
    """Return contextual tips for the current user."""
    tips = await evaluate_tips(user.id, user.role, db)
    return MascotTipsResponse(tips=tips)


@router.post("/mascot/interactions", status_code=204)
async def post_interaction(
    body: InteractionLog,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Log a mascot interaction (tip shown, dismissed, acted upon)."""
    await log_interaction(
        student_id=user.id,
        interaction_type=body.interaction_type,
        tip_id=body.tip_id,
        context=body.context,
        db=db,
    )
