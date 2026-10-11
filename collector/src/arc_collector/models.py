"""Plain data models. `Mention` is the only output of extraction and holds no message text."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class Entity:
    type: str
    text: str = ""
    href: str = ""


@dataclass(frozen=True)
class ForwardRef:
    channel: str
    message_id: str


@dataclass(frozen=True)
class Message:
    """One Telegram message as delivered by a MessageSource (untrusted content in `text`)."""

    channel: str
    message_id: str
    date: datetime
    text: str
    entities: tuple[Entity, ...] = ()
    forwarded_from: ForwardRef | None = None
    edited: datetime | None = None


@dataclass(frozen=True)
class Mention:
    """Structured facts extracted from one message. Deliberately has no text field."""

    channel_key: str
    message_id: str
    timestamp: datetime
    kind: str  # confirmed | ticker | conflicting
    tickers: tuple[str, ...]  # co-mentioned, excludes the target token
    contract_addresses: tuple[str, ...]
    link_domains: tuple[str, ...]
    link_count: int
    forwarded: bool
    obfuscated: bool


@dataclass(frozen=True)
class ChannelInfo:
    """How a channel is presented in the output."""

    name: str  # registry name, or unregistered-<hash>
    registered: bool
    tier: str
