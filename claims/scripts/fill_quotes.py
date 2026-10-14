#!/usr/bin/env python3
"""Place verbatim quotes into the project JSON files, so nobody edits JSON by hand.

1. Open scripts/quotes.txt in a text editor.
2. For each claim, after the "|" paste the exact words copied from the source.
   One claim per line:   ARG-02 | exact words from the source
   Lines starting with # are notes. Lines with nothing after the "|" are skipped.
3. Run from the claims/ folder:
       python scripts/fill_quotes.py            (preview, changes nothing)
       python scripts/fill_quotes.py --write    (writes the quotes into the JSON files)
4. Run:  python scripts/validate.py --strict

The script checks that each quote is at most 25 words, removes surrounding quote marks and
code backticks, and sets quote_status to "verbatim". It does not check the quote against the
source: always copy it from the source yourself.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QUOTES = Path(__file__).resolve().parent / "quotes.txt"
MAX_WORDS = 25


def clean(text: str) -> str:
    text = text.strip()
    text = text.replace("`", "")
    text = re.sub(r"\s+", " ", text)
    pairs = [("\u201c", "\u201d"), ('"', '"'), ("\u2018", "\u2019"), ("'", "'")]
    for left, right in pairs:
        if len(text) > 1 and text.startswith(left) and text.endswith(right):
            text = text[1:-1].strip()
            break
    return text


def main(write: bool) -> int:
    if not QUOTES.exists():
        print(f"Missing {QUOTES}")
        return 1
    entries = {}
    for number, line in enumerate(QUOTES.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if "|" not in line:
            print(f"[LINE {number}] no '|' found, skipped: {line[:60]}")
            continue
        claim_id, _, text = line.partition("|")
        claim_id, text = claim_id.strip(), clean(text)
        if not text:
            continue
        entries[claim_id] = text

    problems = 0
    files = {p: json.loads(p.read_text(encoding="utf-8")) for p in sorted(ROOT.glob("*.json"))}
    placed = set()
    for path, data in files.items():
        for claim in data.get("claims", []):
            cid = claim["id"]
            if cid not in entries:
                continue
            text = entries[cid]
            words = len(text.split())
            if words > MAX_WORDS:
                print(f"[TOO LONG] {cid}: {words} words (limit {MAX_WORDS}). Shorten it to one clause or sentence.")
                problems += 1
                continue
            if "PENDING" in text.upper():
                print(f"[SKIPPED] {cid}: text still contains PENDING")
                problems += 1
                continue
            claim["quote"] = text
            claim["quote_status"] = "verbatim"
            placed.add(cid)
            print(f"[OK] {path.name}: {cid} ({words} words)")
    for cid in sorted(set(entries) - placed):
        if not any(cid == c["id"] for d in files.values() for c in d.get("claims", [])):
            print(f"[UNKNOWN ID] {cid} is not in any project file")
            problems += 1

    if write and placed:
        for path, data in files.items():
            path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"\nWrote {len(placed)} quotes. Now run: python scripts/validate.py --strict")
    elif placed:
        print(f"\nPreview only: {len(placed)} quotes would be written. Run again with --write.")
    else:
        print("\nNo quotes to place.")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(write="--write" in sys.argv))
