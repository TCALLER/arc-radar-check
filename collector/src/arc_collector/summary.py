"""Builds the attributed summary from aggregated structured rows and validates it.

Nothing here can see message text: inputs are aggregate rows, counters and config.
"""

from __future__ import annotations

import json
from datetime import datetime
from decimal import ROUND_HALF_EVEN, Decimal
from pathlib import Path

from jsonschema import Draft202012Validator

from .aggregate import iso
from .token import Token

SCHEMA_PATH = Path(__file__).parent / "schema" / "output.schema.json"
_SCHEMA = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
_VALIDATOR = Draft202012Validator(_SCHEMA)
SCHEMA_VERSION = 1


def num(value: Decimal, places: int = 4) -> float:
    return float(value.quantize(Decimal(1).scaleb(-places), rounding=ROUND_HALF_EVEN))


def _public(row: dict) -> dict:
    return {k: v for k, v in row.items() if not k.startswith("_")}


def build_summary(
    *,
    token: Token,
    as_of: datetime,
    window_hours: int,
    rows: list[dict],
    counters: dict[str, int],
) -> dict:
    scored = [r for r in rows if r["tier"] != "paid_trending"]
    paid = [r for r in rows if r["tier"] == "paid_trending"]
    promo = [r for r in rows if r["flagged_promotional"]]
    kinds = [k for r in rows for k in r["_kinds"]]
    mentions_total = len(kinds)
    promo_mentions = sum(r["mention_count"] for r in promo)
    paid_mentions = sum(r["mention_count"] for r in paid)

    by_channel = []
    for row in scored:
        shown = _public(row)
        shown["weight"] = num(row["weight"])
        shown["weighted_score"] = num(shown.pop("weighted"))
        by_channel.append(shown)
    by_channel.sort(key=lambda r: (-r["weighted_score"], r["channel"]))

    warnings = []
    for row in rows:
        if row["_obfuscated"]:
            warnings.append(("obfuscated_text", row["channel"], row["_obfuscated"]))
        conflicting = row["_kinds"].count("conflicting")
        if conflicting:
            warnings.append(("conflicting_contract_address", row["channel"], conflicting))
        if not row["registered"]:
            warnings.append(("unregistered_channel", row["channel"], row["mention_count"]))
    warnings.sort()

    summary = {
        "schema_version": SCHEMA_VERSION,
        "token": {
            "ticker": token.ticker,
            "chain": token.chain,
            "contract_addresses": list(token.contract_addresses),
        },
        "as_of": iso(as_of),
        "window_hours": window_hours,
        "totals": {
            **counters,
            "mentions_total": mentions_total,
            "mentions_organic": mentions_total - promo_mentions - paid_mentions,
            "mentions_promotional": promo_mentions,
            "mentions_paid_trending": paid_mentions,
            "mentions_confirmed": kinds.count("confirmed"),
            "mentions_ticker": kinds.count("ticker"),
            "mentions_conflicting": kinds.count("conflicting"),
            "weighted_score": num(sum((r["weighted"] for r in scored), Decimal(0))),
        },
        "by_channel": by_channel,
        "promotional": {
            "channels": sorted(r["channel"] for r in promo),
            "mention_count": promo_mentions,
            "share_of_mentions": num(Decimal(promo_mentions) / Decimal(mentions_total))
            if mentions_total
            else 0.0,
        },
        "paid_trending": {
            "channels": [
                {
                    "channel": r["channel"],
                    "tier": r["tier"],
                    "mention_count": r["mention_count"],
                    "mentions": [
                        {"message_id": m["message_id"], "timestamp": m["timestamp"]}
                        for m in r["mentions"]
                    ],
                }
                for r in sorted(paid, key=lambda r: r["channel"])
            ],
        },
        "warnings": [{"code": c, "channel": ch, "count": n} for c, ch, n in warnings],
    }
    validate(summary)
    return summary


def validate(summary: dict) -> None:
    """Raise jsonschema.ValidationError if the summary breaks the output contract."""
    _VALIDATOR.validate(summary)


def to_json(summary: dict) -> str:
    return json.dumps(summary, indent=2, sort_keys=True, ensure_ascii=True) + "\n"
