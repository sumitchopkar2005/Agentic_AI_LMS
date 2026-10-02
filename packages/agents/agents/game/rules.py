"""Game rules configuration — XP, Gold, streaks, badges."""

XP_RULES = {
    "daily_login": 5,
    "hint_penalties": {
        "NUDGE": 0.05,
        "GUIDANCE": 0.15,
        "SOLUTION": 0.30,
    },
    "perfect_multiplier": 1.5,
    "streak_multiplier": 1.2,  # Applied when streak >= 7 days
}

GOLD_RULES = {
    "perfect_bonus": 25,
    "streak_daily": 5,
    "streak_cap": 50,
    "hint_costs": {
        "NUDGE": 10,
        "GUIDANCE": 30,
        "SOLUTION": 75,
    },
    "streak_freeze_cost": 100,
    "retry_cost": 50,
}

STREAK_RULES = {
    "freeze_duration_days": 1,
    "max_freezes_per_week": 2,
}

BADGE_RULES = {
    "first_steps": {"condition": "submissions_count >= 1"},
    "perseverance": {"condition": "retry_after_fail"},
    "perfect_score": {"condition": "score_pct == 1.0"},
    "streak_master": {"condition": "current_streak >= 7"},
    "streak_legend": {"condition": "current_streak >= 30"},
    "hint_free": {"condition": "assignments_without_hints >= 5"},
    "gold_saver": {"condition": "gold_balance >= 500"},
}
