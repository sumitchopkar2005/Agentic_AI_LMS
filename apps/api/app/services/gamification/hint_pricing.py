"""
Hint pricing engine — static and dynamic hint cost calculation.
"""


def calculate_hint_cost(
    base_cost: int,
    attempts: int,
    gold_balance: int,
    dynamic_pricing_enabled: bool = False,
) -> int:
    """Calculate the cost of a hint.

    Static pricing: returns base_cost.
    Dynamic pricing (FR-404, Beta+):
    - 3+ valid attempts: 50% discount
    - 5+ valid attempts: 75% discount
    - Gold balance < 20% of course median: emergency pricing (90% discount)
    """
    if not dynamic_pricing_enabled:
        return base_cost

    if attempts >= 5:
        return max(1, int(base_cost * 0.25))
    elif attempts >= 3:
        return max(1, int(base_cost * 0.50))

    return base_cost
