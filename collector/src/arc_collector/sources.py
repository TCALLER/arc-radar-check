"""Data sources behind one interface. The collector depends only on `MessageSource`."""

from __future__ import annotations

import json
import re
from collections.abc import Iterable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Protocol

from .models import Entity, ForwardRef, Message

_ID = re.compile(r"[A-Za-z0-9_-]{1,32}")


class SourceError(ValueError):
    pass


class MessageSource(Protocol):
    def fetch(self, since: datetime, until: datetime) -> Iterable[Message]:
        """Messages posted in [since, until]. Sources may over-deliver; the collector filters."""
        ...


def parse_timestamp(value: Any, label: str) -> datetime:
    if not isinstance(value, str):
        raise SourceError(f"{label}: timestamp must be an ISO-8601 string")
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError as exc:
        raise SourceError(f"{label}: bad timestamp {value!r}") from exc
    if parsed.tzinfo is None:
        raise SourceError(f"{label}: timestamp has no timezone: {value!r}")
    return parsed.astimezone(UTC)


def parse_message(raw: Any, label: str = "message") -> Message:
    if not isinstance(raw, dict):
        raise SourceError(f"{label}: must be an object")
    channel = raw.get("channel")
    text = raw.get("text", "")
    if not isinstance(channel, str) or not channel.strip():
        raise SourceError(f"{label}: missing channel")
    if not isinstance(text, str):
        raise SourceError(f"{label}: text must be a string")
    mid = str(raw.get("id", ""))
    if not _ID.fullmatch(mid):
        raise SourceError(f"{label}: id must match {_ID.pattern}, got {mid!r}")
    entities = tuple(
        Entity(str(e.get("type", "")), str(e.get("text", "")), str(e.get("href", "")))
        for e in raw.get("text_entities", [])
        if isinstance(e, dict)
    )
    fwd = raw.get("forwarded_from")
    forwarded = None
    if isinstance(fwd, dict) and "channel" in fwd and "message_id" in fwd:
        forwarded = ForwardRef(str(fwd["channel"]), str(fwd["message_id"]))
    edited = parse_timestamp(raw["edited"], label) if raw.get("edited") else None
    return Message(
        channel, mid, parse_timestamp(raw.get("date"), label), text, entities, forwarded, edited
    )


class FixtureSource:
    """Reads fixture files: each is JSON {"messages": [ ... ]}, shaped like a Telegram export."""

    def __init__(self, root: Path):
        self.root = Path(root)

    def fetch(self, since: datetime, until: datetime) -> Iterable[Message]:
        if not self.root.is_dir():
            raise SourceError(f"fixture folder not found: {self.root}")
        files = sorted(self.root.rglob("*.json"), key=lambda p: p.as_posix())
        for path in files:
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, ValueError) as exc:
                raise SourceError(f"{path}: {exc}") from exc
            for i, raw in enumerate(payload.get("messages", [])):
                yield parse_message(raw, f"{path.name}[{i}]")


class InMemorySource:
    """Source over a list of already-built messages (used by tests and library callers)."""

    def __init__(self, messages: Iterable[Message]):
        self._messages = list(messages)

    def fetch(self, since: datetime, until: datetime) -> Iterable[Message]:
        return list(self._messages)


class TelegramSource:
    """Placeholder for a live adapter - NOT wired in this release.

    Notes from plan step D-06: the Telegram MCP returns only `when` and `text` (plus `who`
    in groups), with no message id, entities, or forward info. A live adapter must therefore
    derive `id` as a hash of (channel, timestamp, text), recover URLs by regex only, and
    can only de-duplicate forwards by that hash. It must produce `Message` objects and
    nothing else; the collector needs no change.
    """

    def fetch(self, since: datetime, until: datetime) -> Iterable[Message]:
        raise NotImplementedError("live Telegram source is out of scope for this release")
