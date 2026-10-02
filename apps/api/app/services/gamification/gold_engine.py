"""
Gold economy engine — manages earning and spending of Gold currency.
"""


def calculate_gold_earned(
    max_gold: int,
    score_pct: float,
    is_perfect: bool,
    streak_days: int,
) -> int:
    """Calculate Gold earned for an assignment completion.

    Rules:
    - Base: max_gold * score_pct (scaled by difficulty)
    - Perfect score: +25 Gold bonus
    - Daily streak: +5 Gold/day (capped at +50/day)
    """
    gold = int(max_gold * score_pct)

    if is_perfect:
        gold += 25

    streak_bonus = min(streak_days * 5, 50)
    gold += streak_bonus

    return max(0, gold)
