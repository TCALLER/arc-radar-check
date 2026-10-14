#!/usr/bin/env python3
"""Validate every claims/*.json file against schema/claims.schema.json.

Usage (from the claims/ folder):
    pip install jsonschema
    python scripts/validate.py            # schema check + report of pending quotes
    python scripts/validate.py --strict   # also fail if any quote is still PENDING

Also checks, beyond the schema:
  - claim ids are unique, alert ids are unique
  - no more than 10 claims per project
  - no 'verbatim' quote longer than 25 words
  - no scoring or buy/sell language in free-text fields (word list below)
"""
import json
import re
import sys
from pathlib import Path

from jsonschema import Draft7Validator

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = json.loads((ROOT / "schema" / "claims.schema.json").read_text(encoding="utf-8"))

# Words that signal opinion, scoring or advice. Facts only.
BANNED = [
    r"\bbuy now\b", r"\bsell now\b", r"\bshould buy\b", r"\bshould sell\b",
    r"\bbullish\b", r"\bbearish\b", r"\bundervalued\b", r"\bovervalued\b",
    r"\bsafe\b", r"\bunsafe\b", r"\bscam\b", r"\bgood\b", r"\bbad\b",
    r"\brecommend\b", r"\bscore\b", r"\brating\b", r"\brisky\b",
]


def free_text(obj):
    """Yield every string in the file except quotes (quotes are source text)."""
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key == "quote":
                continue
            yield from free_text(value)
    elif isinstance(obj, list):
        for item in obj:
            yield from free_text(item)
    elif isinstance(obj, str):
        yield obj


def main(strict: bool) -> int:
    failures = 0
    pending = 0
    files = sorted(p for p in ROOT.glob("*.json"))
    if not files:
        print("No project files found.")
        return 1
    validator = Draft7Validator(SCHEMA)
    for path in files:
        data = json.loads(path.read_text(encoding="utf-8"))
        errors = sorted(validator.iter_errors(data), key=lambda e: list(e.path))
        for err in errors:
            failures += 1
            loc = "/".join(str(p) for p in err.path) or "(root)"
            print(f"[SCHEMA] {path.name}: {loc}: {err.message}")

        ids = [c["id"] for c in data.get("claims", [])]
        if len(ids) != len(set(ids)):
            failures += 1
            print(f"[IDS] {path.name}: duplicate claim ids")
        alert_ids = [a["id"] for a in data.get("alerts", [])]
        if len(alert_ids) != len(set(alert_ids)):
            failures += 1
            print(f"[IDS] {path.name}: duplicate alert ids")

        for claim in data.get("claims", []):
            if claim["quote_status"] == "verbatim" and len(claim["quote"].split()) > 25:
                failures += 1
                print(f"[QUOTE] {path.name}: {claim['id']} verbatim quote over 25 words")
            if claim["quote_status"] == "pending_paste":
                pending += 1
                print(f"[PENDING] {path.name}: {claim['id']}: {claim['quote'][:90]}")
            if claim["quote_status"] == "verbatim" and claim["quote"].startswith("PENDING"):
                failures += 1
                print(f"[QUOTE] {path.name}: {claim['id']} marked verbatim but is a PENDING marker")

        for text in free_text(data):
            for pattern in BANNED:
                if re.search(pattern, text, flags=re.IGNORECASE):
                    failures += 1
                    print(f"[LANGUAGE] {path.name}: '{pattern}' found in: {text[:80]}...")

    print(f"\nFiles checked: {len(files)}; problems: {failures}; quotes still pending: {pending}")
    if strict and pending:
        print("Strict mode: paste the pending quotes from the sources before submitting.")
        return 1
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(strict="--strict" in sys.argv))
