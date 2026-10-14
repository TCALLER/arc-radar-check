"""Per-channel aggregation of Mentions. Structured fields only; no message text is reachable."""

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime
from decimal import Decimal

from .models import ChannelInfo, Mention
from .policy import Policy
from .weighting import is_flagged_promotional, mention_weight


def iso(moment: datetime) -> str:
    return moment.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def aggregate(mentions: list[Mention], infos: dict[str, ChannelInfo], policy: Policy) -> list[dict]:
    """One row per channel, sorted by channel name. Weighted scores are exact Decimals."""
    grouped: dict[str, list[Mention]] = defaultdict(list)
    for mention in mentions:
        grouped[mention.channel_key].append(mention)
    rows = []
    for key, items in grouped.items():
        info = infos[key]
        items = sorted(items, key=lambda m: (m.timestamp, m.message_id))
        weights = [mention_weight(info.tier, m.kind, policy) for m in items]
        rows.append(
            {
                "channel": info.name,
                "registered": info.registered,
                "tier": info.tier,
                "weight": policy.tier_weights[info.tier],
                "flagged_promotional": is_flagged_promotional(info.tier),
                "mention_count": len(items),
                "weighted": sum(weights, Decimal(0)),
                "first_seen": iso(items[0].timestamp),
                "last_seen": iso(items[-1].timestamp),
                "co_mentioned_tickers": sorted({t for m in items for t in m.tickers}),
                "contract_addresses": sorted({a for m in items for a in m.contract_addresses}),
                "link_domains": sorted({d for m in items for d in m.link_domains}),
                "link_count": sum(m.link_count for m in items),
                "mentions": [
                    {
                        "message_id": m.message_id,
                        "timestamp": iso(m.timestamp),
                        "kind": m.kind,
                        "forwarded": m.forwarded,
                    }
                    for m in items
                ],
                "_kinds": [m.kind for m in items],
                "_obfuscated": sum(1 for m in items if m.obfuscated),
            }
        )
    rows.sort(key=lambda r: (r["channel"], r["registered"]))
    return rows
