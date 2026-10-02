from uuid import UUID

from pydantic import BaseModel, ConfigDict


class StudentProfileResponse(BaseModel):
    id: UUID
    full_name: str
    xp_total: int
    gold_balance: int
    current_streak: int
    longest_streak: int
    badges: list[dict] | None
    mastery_map: dict | None

    model_config = ConfigDict(from_attributes=True)


class LeaderboardEntry(BaseModel):
    rank: int
    student_id: UUID
    full_name: str
    xp_total: int


class LeaderboardResponse(BaseModel):
    course_id: UUID
    entries: list[LeaderboardEntry]
    my_rank: int | None = None


class HintPreviewResponse(BaseModel):
    tier: str
    gold_cost: int
    current_balance: int
    can_afford: bool


class HintPurchaseRequest(BaseModel):
    tier: str  # NUDGE, GUIDANCE, SOLUTION


class HintPurchaseResponse(BaseModel):
    hint_text: str
    gold_cost: int
    new_balance: int
    tier: str


class BadgeResponse(BaseModel):
    id: UUID
    name: str
    description: str
    icon: str
    category: str

    model_config = ConfigDict(from_attributes=True)
