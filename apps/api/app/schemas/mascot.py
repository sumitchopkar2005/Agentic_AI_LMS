"""Pydantic schemas for mascot endpoints."""

from pydantic import BaseModel


class MascotTip(BaseModel):
    id: str
    text: str
    type: str  # tip, hint, celebration, warning, greeting
    priority: str  # high, medium, low
    action_label: str | None = None
    action_href: str | None = None


class MascotTipsResponse(BaseModel):
    tips: list[MascotTip]


class InteractionLog(BaseModel):
    interaction_type: str  # TIP_SHOWN, TIP_DISMISSED, TIP_ACTED, HINT_DELIVERED, etc.
    tip_id: str | None = None
    context: dict | None = None
