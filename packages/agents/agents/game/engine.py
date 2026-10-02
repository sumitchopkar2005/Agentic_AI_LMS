"""GameAgent — Pure rule engine (no LLM). Manages XP, Gold, streaks, and badges."""

from agents.game.rules import BADGE_RULES, GOLD_RULES, STREAK_RULES, XP_RULES


class GameEngine:
    """Processes game events and returns state updates.

    This is NOT a LangGraph agent — it's a deterministic rule engine.
    """

    def process_submission_graded(
        self,
        score_pct: float,
        max_xp: int,
        max_gold: int,
        hints_used: list[dict],
        streak_days: int,
    ) -> dict:
        """Process a graded submission and return XP/Gold updates."""
        xp = self._calculate_xp(max_xp, score_pct, hints_used, streak_days)
        gold = self._calculate_gold(max_gold, score_pct, score_pct >= 1.0, streak_days)
        return {"xp_earned": xp, "gold_earned": gold}

    def _calculate_xp(
        self, max_xp: int, score_pct: float, hints: list[dict], streak: int
    ) -> int:
        base = int(max_xp * score_pct)
        penalty = sum(XP_RULES["hint_penalties"].get(h.get("tier", ""), 0) for h in hints)
        penalty = min(penalty, 0.75)
        xp = int(base * (1 - penalty))
        if score_pct >= 1.0:
            xp = int(xp * XP_RULES["perfect_multiplier"])
        if streak >= 7:
            xp = int(xp * XP_RULES["streak_multiplier"])
        return max(0, xp)

    def _calculate_gold(
        self, max_gold: int, score_pct: float, perfect: bool, streak: int
    ) -> int:
        gold = int(max_gold * score_pct)
        if perfect:
            gold += GOLD_RULES["perfect_bonus"]
        gold += min(streak * GOLD_RULES["streak_daily"], GOLD_RULES["streak_cap"])
        return max(0, gold)
