"""Source weighting. Works on structured values only (tier names, mention kinds)."""

from __future__ import annotations

from decimal import Decimal

from .policy import Policy

FLAGGED_TIERS = frozenset({"promotional"})
SEPARATE_TIERS = frozenset({"paid_trending"})


def mention_weight(tier: str, kind: str, policy: Policy) -> Decimal:
    return policy.tier_weights[tier] * policy.kind_factors[kind]


def is_flagged_promotional(tier: str) -> bool:
    return tier in FLAGGED_TIERS


def is_separate(tier: str) -> bool:
    return tier in SEPARATE_TIERS
