# Arc token Telegram collector

For a given **token on Arc** (Circle's USDC-native layer-1), extract mentions from Telegram
message data **deterministically in code**, weight them by source, and return an **attributed
summary as structured JSON** built only from structured fields. Raw message text never reaches
the output. There is no LLM anywhere in the pipeline, so there is no agent whose behaviour a
message could change.

## Telegram's terms (why there is no AI here)
Telegram's terms restrict using channel content for AI/ML processing and for building datasets from public channels
(see `../docs/TELEGRAM_TERMS_AND_ACCESS.md`). So this collector: uses **no LLM or ML at all** (a test fails if one is imported),
extracts facts **in code**, builds the summary **only from structured fields** (counts, sources, weights), **stores counts and
metadata, never message text**, and its registry lists **public channels only**.

## Run

**Demo token (requester's choice): USDC on Arc.**
```bash
uv run arc-collector --token USDC --address 0x3600000000000000000000000000000000000000 --fixtures fixtures/demo_usdc --registry fixtures/registry.json --as-of 2026-10-10T12:00:00Z
```
`fixtures/demo_usdc` is synthetic chatter about USDC (ticker plus its Arc address from the requester's README; verify against the official Arc docs). The unit tests also use a fully synthetic token, `DEMO`.

```bash
uv sync
uv run arc-collector --token DEMO --fixtures fixtures/base \
    --registry fixtures/registry.json --as-of 2026-10-10T12:00:00Z
uv run pytest --cov=arc_collector
```

`--as-of` is required (the collector never reads the clock). `--window-hours` defaults to 48.
Without `--registry` it uses `data/channels.json`, the real channel registry.
Any token on Arc can be checked straight from the command line, with no config file:
```bash
uv run arc-collector --token USDC --address 0x3600000000000000000000000000000000000000 --fixtures fixtures/base --registry fixtures/registry.json --as-of 2026-10-10T12:00:00Z
```
(`--token` is the ticker, `--address` the contract address on Arc and may be repeated, `--chain` defaults to `arc`.)
`DEMO` is a **synthetic** token on the `arc` chain (`data/tokens/demo.json`) used by the tests; `data/tokens/usdc.json` is a real-address example. Arc mainnet is chain ID 5042 (explorer https://explorer.arc.io; values from the requester's brief, verify with the official Arc docs). To use a real Arc
token, copy that file, set its `ticker`, its real `0x` contract address(es) from the Arc explorer, and
any alias tickers, then pass `--token <TICKER>`.

### Paid-trending channels are entered by hand
The requester confirmed that paid-trending channels (the example registry calls them `example_trend_alpha` and `example_trend_beta`) are gathered manually: someone reads them or records the screen and writes down **channel, time, ticker/address**. Copy `fixtures/manual_template/paid_trending_manual.json`, edit it (do not paste whole posts), and run the collector with `--fixtures <your folder>` and `--registry data/channels.json`. Those mentions appear in the separate `paid_trending` section with their timestamps and are never scored. This also keeps within Telegram's terms (no automated collection of those channels).

### Live Telegram (bot) source
Step-by-step guide for a non-programmer: `../docs/LIVE_BOT_TEST.md`.
```bash
# PowerShell:  $env:TELEGRAM_BOT_TOKEN = "<token from BotFather>"
uv run arc-collector --token DEMO --source bot --as-of now
```
The token is read from an environment variable only; it is never stored, logged, or put in code.
Limits: the bot sees only chats it belongs to (channels: as admin; groups: privacy mode off in
BotFather), `getUpdates` consumes updates (so use `--capture`), and updates expire after 24 hours.
A live run always saves extracted metadata to `fixtures/live/last_run.json` (or the file named by `--capture`): channel, id, time, tickers, addresses, link domains, never message text, and
messages that do not mention the token are not stored. `--as-of now` is resolved once at the edge; for reproducible runs pass an explicit time. `fixtures/live/` is git-ignored anyway.

## How it works

```
MessageSource ──► window + de-duplicate ──► extract (only code that reads text) ──► Mention
 (interface)        collect.py                mentions.py / extract.py          (no text field)
                                                                                     │
        JSON ◄── schema check ◄── summary.py ◄── aggregate.py + weighting.py ◄──────┘
```

| Piece | File | Role |
|---|---|---|
| Data source interface | `sources.py` | `MessageSource.fetch()`; `FixtureSource`, `InMemorySource` |
| Live source | `botsource.py` | Telegram Bot API `getUpdates` behind the same interface |
| Extraction | `extract.py`, `mentions.py`, `normalize.py` | Cashtags, Solana/EVM contract addresses (validated), link domains; invisible characters stripped |
| Channel registry | `data/channels.json` (or `.csv`) | `name`, `tier`, one-line `reason`, public `handle`; public channels only |
| Weighting policy | `data/policy.json` | Tier weights and mention-kind factors (exact decimals) |
| Token config | `data/tokens/<name>.json` | Ticker, chain, contract addresses |
| Output contract | `src/arc_collector/schema/output.schema.json` | `additionalProperties: false`; every string is a pattern or enum |

### Mention kinds
- `confirmed`: the configured contract address appears (factor 1.0)
- `ticker`: `$TICKER` / `#TICKER` only (factor 0.5)
- `conflicting`: the ticker next to a different contract address (factor 0, and a warning)

### Tiers
The brief's tier names: `high_signal` 1.0 (analysis, authoritative data) · `neutral` 0.6 (news and aggregators) ·
`volume` 0.3 (chatty, high-volume, low signal) · `unrated` 0.2 (channel not in the registry) ·
`promotional` 0.1 and **flagged** · `paid_trending` 0, **never scored**, listed in its own section
with every mention's timestamp · `excluded` ignored.
`data/channels.json` in this repository is an **example registry with made-up channel names** (every tier represented, including `paid_trending`). The real registry is kept private and loaded with `--registry <path>`; the format is identical.
Unregistered channels are shown as `unregistered-<hash>`, never by their claimed name.

## Why injected instructions have no effect
1. Message text is read in exactly one place (`mentions.py`/`extract.py`) and turned into a
   `Mention`, which has no text field.
2. The summary side (`aggregate.py`, `summary.py`, `weighting.py`, `policy.py`) cannot see text:
   a test parses their source and fails if they read it or import the extractors.
3. Tier and weight come from the registry file, never from message content. This holds for
   channel owners too: a registered channel's posts are still only parsed, never obeyed.
4. The output schema only allows patterns and enums, so free text cannot be expressed.
5. Tests pair each attack message with a clean twin and require identical output.
See `THREAT_MODEL.md`.

## Registry editing
Add an object to `data/channels.json`:
```json
{"name": "Example Channel", "handle": "example_handle", "tier": "neutral", "reason": "One line, 120 characters or fewer"}
```
Names may use letters, digits, spaces and `_.&':()[]+-`. The `handle` (public @username, no message content anywhere) is required.
Duplicates, bad tiers and missing handles are rejected at load time. A CSV file with the columns `name,tier,reason,handle` works the same way.

## Adding another source (for example YouTube)
Implement `MessageSource.fetch(since, until)` returning `Message` objects (channel, id, UTC date, text,
entities). Extraction, weighting and output need no change. See `docs/youtube-adapter-estimate.md`.

## Known limits
- `#TICKER` hashtags are treated as ticker mentions; another project sharing the ticker produces
  `ticker` mentions unless it carries a different contract address (then `conflicting`).
- Contract addresses inside URLs (including pair addresses on chart sites) are collected as addresses.
- Look-alike (Cyrillic/Greek) tickers are not folded to Latin: they do not match.
- The Bot API source passed a live run on 2026-10-11 (test bot in a test group; evidence in `docs/live-test-evidence.md`) and is otherwise unit-tested with a fake transport. Third-party public channels still need the owner's consent (a bot only sees chats it belongs to).
- The `tools/make_fixtures.py` generator documents how the synthetic fixtures were made.
