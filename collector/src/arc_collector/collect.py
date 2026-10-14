"""Orchestration: window -> de-duplicate -> classify channels -> extract -> aggregate -> summary.

Deterministic: no clock reads, no randomness, no network. `as_of` is always passed in.
"""

from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime, timedelta

from .aggregate import aggregate
from .mentions import extract_mention
from .models import ChannelInfo, Mention, Message
from .normalize import channel_key
from .policy import Policy
from .registry import Registry
from .sources import MessageSource
from .summary import build_summary
from .token import Token


def _version_key(message: Message) -> tuple:
    # Latest edit wins; text is only a final tie-break so the choice never depends on input order.
    return (message.edited or message.date, message.date, message.text)


def _deduplicate(messages: list[Message]) -> tuple[list[Message], int]:
    latest: dict[tuple[str, str], Message] = {}
    dropped = 0
    for message in messages:
        key = (channel_key(message.channel), message.message_id)
        if key in latest:
            dropped += 1
            if _version_key(message) > _version_key(latest[key]):
                latest[key] = message
        else:
            latest[key] = message
    kept = []
    for message in latest.values():
        origin = message.forwarded_from
        if origin is not None and (channel_key(origin.channel), origin.message_id) in latest:
            dropped += 1  # the original is in the data set: count it once, not twice
            continue
        kept.append(message)
    kept.sort(key=lambda m: (channel_key(m.channel), m.message_id))
    return kept, dropped


def collect_detailed(
    messages: Iterable[Message],
    token: Token,
    registry: Registry,
    policy: Policy,
    as_of: datetime,
    window_hours: int = 48,
) -> tuple[dict, list[tuple[ChannelInfo, Mention]]]:
    """The summary plus the (channel, mention) pairs it was built from, after window,
    de-duplication and exclusion rules. Used by --capture so it never disagrees with the summary."""
    since = as_of - timedelta(hours=window_hours)
    everything = list(messages)
    in_window = [m for m in everything if since <= m.date <= as_of]
    kept, dropped = _deduplicate(in_window)

    infos = {}
    mentions = []
    pairs: list[tuple[ChannelInfo, Mention]] = []
    excluded = 0
    for message in kept:
        key = channel_key(message.channel)
        info = infos.setdefault(key, registry.info_for(key))
        if info.tier == "excluded":
            excluded += 1
            continue
        mention = extract_mention(message, token)
        if mention is not None:
            mentions.append(mention)
            pairs.append((info, mention))

    rows = aggregate(mentions, infos, policy)
    counters = {
        "messages_scanned": len(everything),
        "messages_in_window": len(in_window),
        "duplicates_dropped": dropped,
        "excluded_messages": excluded,
    }
    summary = build_summary(
        token=token,
        as_of=as_of,
        window_hours=window_hours,
        rows=rows,
        counters=counters,
    )
    return summary, pairs


def collect(
    messages: Iterable[Message],
    token: Token,
    registry: Registry,
    policy: Policy,
    as_of: datetime,
    window_hours: int = 48,
) -> dict:
    return collect_detailed(messages, token, registry, policy, as_of, window_hours)[0]


def collect_from_source(
    source: MessageSource,
    token: Token,
    registry: Registry,
    policy: Policy,
    as_of: datetime,
    window_hours: int = 48,
) -> dict:
    since = as_of - timedelta(hours=window_hours)
    return collect(source.fetch(since, as_of), token, registry, policy, as_of, window_hours)
