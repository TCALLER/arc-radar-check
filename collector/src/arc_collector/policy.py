"""Weighting policy (data file): tier weights and mention-kind factors, as exact decimals."""

from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path

from .registry import TIERS, UNRATED

KINDS = ("confirmed", "ticker", "conflicting")


class PolicyError(ValueError):
    pass


@dataclass(frozen=True)
class Policy:
    tier_weights: dict[str, Decimal]
    kind_factors: dict[str, Decimal]


def _decimal(value: object, label: str) -> Decimal:
    try:
        number = Decimal(str(value))
    except InvalidOperation as exc:
        raise PolicyError(f"{label}: not a number: {value!r}") from exc
    if not number.is_finite() or not Decimal(0) <= number <= Decimal(1):
        raise PolicyError(f"{label}: must be between 0 and 1, got {value!r}")
    return number


def load_policy(path: Path) -> Policy:
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        raw_weights = data["tier_weights"]
        raw_factors = data["kind_factors"]
    except (OSError, ValueError, KeyError, TypeError) as exc:
        raise PolicyError(f"cannot read policy {path}: {exc}") from exc
    weights: dict[str, Decimal] = {}
    for tier in (*TIERS, UNRATED):
        if tier not in raw_weights:
            raise PolicyError(f"tier_weights missing '{tier}'")
        weights[tier] = _decimal(raw_weights[tier], f"tier_weights.{tier}")
    factors = {kind: _decimal(raw_factors.get(kind), f"kind_factors.{kind}") for kind in KINDS}
    if weights["paid_trending"] != 0:
        raise PolicyError("paid_trending must have weight 0: it is shown separately, never scored")
    if weights["excluded"] != 0:
        raise PolicyError("excluded must have weight 0")
    return Policy(weights, factors)
