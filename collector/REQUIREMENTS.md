# Requirements

Source: the requester's brief (screenshots in `The main objectives.docx`) and the messages of 7-8 October 2026.

| ID | Requirement | Where | Proven by |
|---|---|---|---|
| R1 | For a given Arc token, extract mentions deterministically in code (no LLM) | `mentions.py`, `extract.py`, `token.py` | `test_determinism.py`, `test_properties.py` |
| R2 | Capture source channel, timestamp, tickers and contract addresses, links, counts | `aggregate.py`, `summary.py` | `test_extract.py`, golden snapshot (`tests/golden`) |
| R3 | Apply source weighting | `weighting.py`, `data/policy.json` | `test_weighting.py` |
| R4 | Flag promotional channels | `weighting.py`, `summary.py` | `test_weighting.py` |
| R5 | Attributed summary as structured JSON built only from structured fields, never raw text | `summary.py`, `schema/output.schema.json` | `test_no_leakage.py`, `test_schema.py` |
| R6 | Data source behind an interface | `sources.py` (`MessageSource`), `botsource.py` | `test_sources.py`, `test_botsource.py` |
| R7 | Tests use fixture data | `fixtures/`, `tests/` | whole suite |
| R8 | Every message is untrusted (including channel owners); injected instructions change neither the summary nor behaviour | `fixtures/injection/` | `test_injection.py`, `test_properties.py` |
| R9 | Channel registry as a data file: name, tier, one-line reason | `data/channels.json`, `registry.py` | `test_registry.py` |
| R10 | "Paid trending" (e.g. example_trend_alpha, example_trend_beta) is its own tier, shown separately with timestamps | `summary.py`, `data/channels.json` | `test_weighting.py` |
| R11 | Gathers posts from Telegram | `botsource.py`, CLI `--source bot` | `test_botsource.py` (fake transport only; NOT run live) |
| R12 | Delivery as a pull request in a `collector/` folder, no keys or secrets in the code | repo layout, `.gitignore` | `test_no_secrets.py` |
| R14 | Telegram terms: no AI on raw channel text; extract in code; summary only from structured fields (counts, sources, weights); store counts and metadata, not full message text | whole design; `--capture` is metadata only | `test_no_ai.py`, `test_no_leakage.py`, `test_botsource.py` |
| R15 | Registry (JSON or CSV): channel name, tier (high signal / neutral / volume / promotional, plus paid trending), one-line reason from channel behaviour; public channels only, no message content | `registry.py`, `data/channels.json` | `test_registry.py` |
| R13 (optional) | YouTube adapter, quoted separately | `docs/youtube-adapter-estimate.md` | not built |
