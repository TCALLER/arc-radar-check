"""Channel registry (data file, JSON or CSV): name, tier, one-line reason, public handle.

Public channels only: every row needs the channel's public @username. The registry holds
channel metadata and the reason for the tier, never message content.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path

from .models import ChannelInfo
from .normalize import channel_key

TIERS = ("high_signal", "neutral", "volume", "promotional", "paid_trending", "excluded")
UNRATED = "unrated"
NAME_PATTERN = r"[A-Za-z0-9 _.&':()\[\]+\-]{1,64}"
_NAME = re.compile(NAME_PATTERN)
_HANDLE = re.compile(r"[A-Za-z0-9_\[\]:\-]{1,64}")
MAX_REASON = 120


class RegistryError(ValueError):
    pass


@dataclass(frozen=True)
class ChannelEntry:
    name: str
    tier: str
    reason: str
    handle: str = ""


class Registry:
    def __init__(self, entries: list[ChannelEntry]):
        self.entries = tuple(entries)
        self._by_key: dict[str, ChannelEntry] = {}
        for entry in entries:
            for label in (entry.name, entry.handle):
                if not label:
                    continue
                key = channel_key(label)
                if key in self._by_key and self._by_key[key] is not entry:
                    raise RegistryError(f"duplicate channel name/handle: {label!r}")
                self._by_key[key] = entry

    def lookup(self, key: str) -> ChannelEntry | None:
        return self._by_key.get(key)

    def info_for(self, key: str) -> ChannelInfo:
        """Presentation info for a normalised channel key. Unknown channels are anonymised."""
        entry = self.lookup(key)
        if entry is not None:
            return ChannelInfo(entry.name, True, entry.tier)
        digest = hashlib.sha256(key.encode("utf-8")).hexdigest()[:8]
        return ChannelInfo(f"unregistered-{digest}", False, UNRATED)


def load_registry(path: Path) -> Registry:
    try:
        text = Path(path).read_text(encoding="utf-8-sig")  # Excel adds a BOM to CSV
        if Path(path).suffix.lower() == ".csv":
            rows = list(csv.DictReader(text.splitlines()))
        else:
            rows = json.loads(text)["channels"]
    except (OSError, ValueError, KeyError, TypeError) as exc:
        raise RegistryError(f"cannot read registry {path}: {exc}") from exc
    entries: list[ChannelEntry] = []
    for i, row in enumerate(rows):
        where = f"channels[{i}]"
        if not isinstance(row, dict):
            raise RegistryError(f"{where}: must be an object")
        extra = set(row) - {"name", "tier", "reason", "handle"}
        if extra:
            raise RegistryError(f"{where}: unknown field(s) {sorted(extra)}")
        for field in ("name", "tier", "reason", "handle"):
            if not isinstance(row.get(field), str) or not row[field].strip():
                raise RegistryError(f"{where}: missing or empty '{field}' (public channels only)")
        if not _NAME.fullmatch(row["name"]):
            raise RegistryError(f"{where}: name has characters outside {NAME_PATTERN}")
        if row["tier"] not in TIERS:
            raise RegistryError(f"{where}: tier must be one of {TIERS}, got {row['tier']!r}")
        reason = row["reason"]
        if "\n" in reason or "\r" in reason or len(reason) > MAX_REASON:
            raise RegistryError(f"{where}: reason must be one line of {MAX_REASON} chars or fewer")
        handle = row["handle"].strip().lstrip("@")
        if not _HANDLE.fullmatch(handle):
            raise RegistryError(f"{where}: invalid handle {handle!r}")
        entries.append(ChannelEntry(row["name"], row["tier"], reason, handle))
    return Registry(entries)
