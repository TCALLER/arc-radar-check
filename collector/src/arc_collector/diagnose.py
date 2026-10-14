"""Bot health check: asks Telegram about the bot itself. Never prints the key, never reads messages.

Run:  uv run python -m arc_collector.diagnose
It answers the usual reasons a live run sees 0 messages: group privacy mode, a webhook, a wrong bot.
"""

from __future__ import annotations

import os
import sys

from .botsource import Transport, clean_bot_token, http_transport
from .sources import SourceError


def describe(transport: Transport, token: str) -> list[str]:
    me = transport(token, "getMe", {})
    if not me.get("ok"):
        raise SourceError(
            f"Telegram refused getMe (code {me.get('error_code')}): wrong or revoked key?"
        )
    bot = me["result"]
    hook = transport(token, "getWebhookInfo", {})
    hook_url = (hook.get("result") or {}).get("url") if hook.get("ok") else None
    reads_all = bool(bot.get("can_read_all_group_messages"))
    lines = [
        f"Bot: @{bot.get('username', '?')} (id {bot.get('id', '?')})",
        f"Can be added to groups: {'yes' if bot.get('can_join_groups') else 'NO'}",
        "Reads ALL group messages (privacy mode off): "
        + (
            "yes"
            if reads_all
            else "NO - privacy mode is ON, so the bot only sees commands and replies"
        ),
        "Webhook set: " + ("YES - this blocks getUpdates (remove it)" if hook_url else "no"),
    ]
    if not reads_all:
        lines.append(
            "Fix: BotFather > /setprivacy > choose the bot > Disable, then remove the bot from the "
            "group and add it again."
        )
    return lines


def main(transport: Transport = http_transport) -> int:
    raw = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    try:
        if not raw:
            raise SourceError("environment variable TELEGRAM_BOT_TOKEN is not set")
        for line in describe(transport, clean_bot_token(raw)):
            print(line)
    except SourceError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
