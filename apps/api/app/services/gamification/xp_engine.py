"""
XP calculation engine — determines XP earned per assignment completion.
"""


def calculate_xp(
    max_xp: int,
    score_pct: float,
    hints_used: list[dict],
    streak_days: int,
) -> int:
    """Calculate XP earned for an assignment submission.

    Rules:
    - Base XP = max_xp * score_pct
    - Hint penalty: Tier 1 = -5%, Tier 2 = -15%, Tier 3 = -30%
    - Perfect score: 1.5x multiplier
    - Streak bonus (7+ days): 1.2x multiplier
    """
    base_xp = int(max_xp * score_pct)

    # Apply hint penalties
    hint_penalty = 0.0
    tier_penalties = {"NUDGE": 0.05, "GUIDANCE": 0.15, "SOLUTION": 0.30}
    for hint in hints_used:
        hint_penalty += tier_penalties.get(hint.get("tier", ""), 0.0)
    hint_penalty = min(hint_penalty, 0.75)  # Cap at 75% max penalty

    xp = int(base_xp * (1.0 - hint_penalty))

    # Perfect score multiplier
    if score_pct >= 1.0:
        xp = int(xp * 1.5)

    # Streak bonus
    if streak_days >= 7:
        xp = int(xp * 1.2)

    return max(0, xp)
