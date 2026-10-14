"""Live source: Telegram Bot API `getUpdates` behind the MessageSource interface.

The bot token is passed in by the caller (the CLI reads it from an environment variable). It is
never stored, logged, or included in an error message.

Limits of the Bot API that matter here:
- The bot only sees chats it is a member of (channels: it must be an admin). In groups, privacy
  mode must be disabled in BotFather or the bot only sees commands.
- `getUpdates` is destructive: confirming an offset makes Telegram forget older updates, and
  updates expire after 24 hours. Use the CLI `--capture` option to save extracted metadata
  (never message text) before they are gone.
- getUpdates cannot be used while a webhook is set for the bot.
"""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from collections.abc import Callable, Iterable
from datetime import UTC, datetime
from typing import Any

from .models import Entity, ForwardRef, Message
from .sources import SourceError

Transport = Callable[[str, str, dict[str, Any]], dict[str, Any]]
_KINDS = ("message", "channel_post", "edited_message", "edited_channel_post")
_CHAT_TYPES = ("group", "supergroup", "channel")
MAX_RESPONSE_BYTES = 5_000_000


_TOKEN = re.compile(r"\d{6,12}:[A-Za-z0-9_-]{30,}")


def mask_shape(text: str) -> str:
    """Show only the structure of a value: digits become 9, letters become a, whitespace is named.

    Safe to print or share: no letter or digit of the original survives.
    """
    shape = re.sub(r"[0-9]", "9", text)
    shape = re.sub(r"[A-Za-z]", "a", shape)
    for char, name in (("\r", "<CR>"), ("\n", "<LF>"), (" ", "<SP>"), ("\t", "<TAB>")):
        shape = shape.replace(char, name)
    return shape if len(shape) <= 120 else shape[:120] + "..."


def clean_bot_token(raw: str) -> str:
    """Pull the bot key out of whatever was pasted (label, quotes, spaces, line break around it).

    Exactly one key-shaped value is required. Errors describe the problem, never echo the value.
    """
    found = set(_TOKEN.findall(raw))
    if not found:  # a key split by a stray space or line break (copied from a wrapped line)
        found = set(_TOKEN.findall(re.sub(r"\s+", "", raw)))
    if len(found) == 1:
        return found.pop()
    stripped = raw.strip()
    raise SourceError(
        "the bot key does not look right: expected digits, a colon, then 30+ letters/numbers "
        f"(found {len(stripped)} characters, {len(found)} key-shaped value(s); "
        f"shape with letters and digits hidden: {mask_shape(stripped)}). "
        "Copy only the key from the file again"
    )


def http_transport(token: str, method: str, payload: dict[str, Any]) -> dict[str, Any]:
    """POST to the Bot API. Any failure becomes a SourceError that cannot contain the token
    (the URL holds it, so exception text and chained tracebacks are never passed on)."""
    try:
        request = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/{method}",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read(MAX_RESPONSE_BYTES).decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise SourceError(f"Telegram API returned HTTP {exc.code}") from None
    except Exception as exc:  # InvalidURL, URLError, timeouts, TLS errors: all may quote the URL
        raise SourceError(f"Telegram API request failed ({type(exc).__name__})") from None


def _chat_name(chat: dict[str, Any]) -> str:
    """Identify a chat by its public username, else by its numeric id.

    A chat title is chosen by whoever creates the chat, so it must never be used to look up a
    registry entry: a group titled like a registered channel would inherit that channel's tier.
    Numeric ids contain a hyphen, which a Telegram username cannot, so they never match a handle.
    """
    username = chat.get("username")
    if username:
        return str(username)
    if "id" in chat:
        return f"chat-{abs(int(chat['id']))}"
    return ""


def _utf16_slice(text: str, offset: int, length: int) -> str:
    raw = text.encode("utf-16-le")
    return raw[offset * 2 : (offset + length) * 2].decode("utf-16-le", errors="ignore")


def update_to_message(update: dict[str, Any]) -> Message | None:
    """Convert one Bot API update into a Message, or None if it is not a group/channel text post."""
    for kind in _KINDS:
        raw = update.get(kind)
        if isinstance(raw, dict):
            break
    else:
        return None
    chat = raw.get("chat") or {}
    channel = _chat_name(chat)
    if chat.get("type") not in _CHAT_TYPES or not channel or "message_id" not in raw:
        return None
    text = raw.get("text") or raw.get("caption") or ""
    entities = []
    for ent in raw.get("entities") or raw.get("caption_entities") or []:
        if ent.get("type") in ("url", "text_link"):
            entities.append(
                Entity(
                    ent["type"],
                    _utf16_slice(text, int(ent.get("offset", 0)), int(ent.get("length", 0))),
                    str(ent.get("url", "")),
                )
            )
    forwarded = None
    origin = raw.get("forward_origin") or {}
    if isinstance(origin.get("chat"), dict) and "message_id" in origin:
        forwarded = ForwardRef(_chat_name(origin["chat"]), str(origin["message_id"]))
    elif isinstance(raw.get("forward_from_chat"), dict) and "forward_from_message_id" in raw:
        forwarded = ForwardRef(
            _chat_name(raw["forward_from_chat"]), str(raw["forward_from_message_id"])
        )
    edit_date = raw.get("edit_date")
    return Message(
        channel=channel,
        message_id=str(raw["message_id"]),
        date=datetime.fromtimestamp(int(raw["date"]), UTC),
        text=str(text),
        entities=tuple(entities),
        forwarded_from=forwarded,
        edited=datetime.fromtimestamp(int(edit_date), UTC) if edit_date else None,
    )


class BotApiSource:
    def __init__(self, token: str, transport: Transport = http_transport, max_pages: int = 50):
        if not token:
            raise SourceError("bot token is empty")
        self._token = token
        self._transport = transport
        self._max_pages = max_pages

    def fetch(self, since: datetime, until: datetime) -> Iterable[Message]:
        offset: int | None = None
        messages: list[Message] = []
        for _ in range(self._max_pages):
            payload: dict[str, Any] = {"timeout": 0, "limit": 100, "allowed_updates": list(_KINDS)}
            if offset is not None:
                payload["offset"] = offset
            data = self._transport(self._token, "getUpdates", payload)
            if not data.get("ok"):
                raise SourceError(
                    f"Telegram API refused the request (code {data.get('error_code')})"
                )
            updates = data.get("result") or []
            if not updates:
                break
            for update in updates:
                offset = int(update["update_id"]) + 1
                message = update_to_message(update)
                if message is not None and since <= message.date <= until:
                    messages.append(message)
        return messages
