"""Command line.

Fixtures:  arc-collector --token DEMO --fixtures fixtures/base --as-of 2026-10-10T12:00:00Z
Live bot:  TELEGRAM_BOT_TOKEN=... arc-collector --token DEMO --source bot --as-of <now, UTC>
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

from jsonschema import ValidationError

from .botsource import BotApiSource, clean_bot_token
from .collect import collect_detailed
from .mentions import explain
from .normalize import channel_key
from .policy import PolicyError, load_policy
from .registry import RegistryError, load_registry
from .sources import (
    FixtureSource,
    SourceError,
    parse_timestamp,
)
from .summary import to_json
from .token import TokenConfigError, build_token, load_token

LIVE_CAPTURE = Path("fixtures/live/last_run.json")  # getUpdates consumes messages, so a live run
# always saves its (metadata-only) records unless --capture names another file


def resolve_as_of(value: str) -> datetime:
    """An explicit ISO-8601 time, or the word 'now' (resolved here, at the edge, once).

    Reproducible runs should pass an explicit time; 'now' is a convenience for live use and
    the resolved time is printed in the output's as_of field.
    """
    if value.strip().lower() == "now":
        return datetime.now(UTC).replace(microsecond=0)
    return parse_timestamp(value, "--as-of")


def _window_hours(value: str) -> int:
    try:
        hours = int(value)
    except ValueError:
        raise argparse.ArgumentTypeError(f"not a whole number: {value!r}") from None
    if not 1 <= hours <= 8760:
        raise argparse.ArgumentTypeError("must be between 1 and 8760")
    return hours


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="arc-collector", description=__doc__)
    p.add_argument(
        "--token", required=True, help="token name, e.g. DEMO (selects data/tokens/demo.json)"
    )
    p.add_argument("--token-config", type=Path, help="override path to the token config")
    p.add_argument(
        "--address",
        action="append",
        help="contract address of the token (repeatable); with this, --token is the ticker\n"
        "and no token config file is needed",
    )
    p.add_argument("--chain", default="arc", help="chain name used with --address (default: arc)")
    p.add_argument("--source", choices=["fixtures", "bot"], default="fixtures")
    p.add_argument("--fixtures", type=Path, help="folder of fixture JSON files (--source fixtures)")
    p.add_argument(
        "--bot-token-env",
        default="TELEGRAM_BOT_TOKEN",
        help="name of the environment variable holding the bot token (--source bot)",
    )
    p.add_argument(
        "--capture",
        type=Path,
        help="save extracted metadata (NO text); live runs default to fixtures/live/last_run.json",
    )
    p.add_argument("--registry", type=Path, default=Path("data/channels.json"))
    p.add_argument("--policy", type=Path, default=Path("data/policy.json"))
    p.add_argument("--as-of", required=True, help="end of window: ISO-8601 with timezone, or now")
    p.add_argument(
        "--explain",
        action="store_true",
        help="print to stderr what was found in each message (tickers, addresses, length; no text)",
    )
    p.add_argument("--window-hours", type=_window_hours, default=48, help="1 to 8760")
    return p


def _messages(args, since, as_of):
    if args.source == "bot":
        token = os.environ.get(args.bot_token_env, "")
        if not token:
            raise SourceError(f"environment variable {args.bot_token_env} is not set")
        return list(BotApiSource(clean_bot_token(token)).fetch(since, as_of))
    if args.fixtures is None:
        raise SourceError("--fixtures is required with --source fixtures")
    return list(FixtureSource(args.fixtures).fetch(since, as_of))


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    config = args.token_config or Path("data/tokens") / f"{args.token.lower()}.json"
    try:
        if args.address:
            token = build_token(args.token, args.chain, args.address)
        else:
            token = load_token(config)
        registry = load_registry(args.registry)
        policy = load_policy(args.policy)
        as_of = resolve_as_of(args.as_of)
        if token.ticker != args.token.upper():
            raise TokenConfigError(f"config ticker {token.ticker} does not match --token")
        messages = _messages(args, as_of - timedelta(hours=args.window_hours), as_of)
        if args.explain:
            for number, message in enumerate(messages, 1):
                facts = explain(message, token)
                where = registry.info_for(channel_key(message.channel)).name
                stamp = message.date.strftime("%Y-%m-%dT%H:%M:%SZ")
                print(f"message {number}: {where} {stamp} {json.dumps(facts)}", file=sys.stderr)
            if not messages:
                print("no messages were delivered by the source", file=sys.stderr)
        summary, pairs = collect_detailed(
            messages, token, registry, policy, as_of, args.window_hours
        )
        capture = args.capture or (LIVE_CAPTURE if args.source == "bot" else None)
        if capture:
            records = [
                {
                    "channel": info.name,
                    "message_id": mention.message_id,
                    "timestamp": mention.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "kind": mention.kind,
                    "tickers": list(mention.tickers),
                    "contract_addresses": list(mention.contract_addresses),
                    "link_domains": list(mention.link_domains),
                    "link_count": mention.link_count,
                }
                for info, mention in pairs
            ]
            payload = {"description": "metadata only, no message text", "records": records}
            capture.parent.mkdir(parents=True, exist_ok=True)
            capture.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    except (TokenConfigError, RegistryError, PolicyError, SourceError, OSError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    except ValidationError as exc:
        print(f"error: output broke the schema: {exc.message}", file=sys.stderr)
        return 3
    sys.stdout.write(to_json(summary))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
