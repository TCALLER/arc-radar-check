"""Delivery rule: no keys or secrets in the code. Scans every tracked-style file in collector/."""

import re
from pathlib import Path

from .conftest import ROOT

SKIP_DIRS = {".venv", ".git", "__pycache__", ".pytest_cache", ".ruff_cache", ".hypothesis", "live"}
PATTERNS = {
    "telegram bot token": re.compile(r"\b\d{8,10}:[A-Za-z0-9_-]{30,}\b"),
    "private key block": re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    "generic api key assignment": re.compile(
        r"(?i)\b(api[_-]?key|secret|passwd|password)\b\s*[:=]\s*[\"'][A-Za-z0-9_\-]{16,}[\"']"
    ),
    "google api key": re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"),
    "github token": re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36,}\b"),
}


def project_files():
    for path in ROOT.rglob("*"):
        if path == Path(__file__) or not path.is_file():
            continue  # this file holds the sample strings the scanner is tested with
        if not SKIP_DIRS & set(path.relative_to(ROOT).parts):
            if path.suffix.lower() in {".py", ".json", ".md", ".toml", ".txt", ".lock", ".yml"}:
                yield path


def test_no_secrets_in_collector_folder():
    hits = []
    for path in project_files():
        text = path.read_text(encoding="utf-8", errors="ignore")
        for label, pattern in PATTERNS.items():
            if pattern.search(text):
                hits.append(f"{path.relative_to(ROOT)}: {label}")
    assert hits == []


def test_scanner_would_catch_a_token():
    assert PATTERNS["telegram bot token"].search("123456789:" + "A" * 35)
    assert PATTERNS["generic api key assignment"].search('api_key = "abcdefghijklmnop1234"')


def test_token_only_comes_from_environment():
    source = (ROOT / "src" / "arc_collector" / "cli.py").read_text(encoding="utf-8")
    assert "os.environ.get(args.bot_token_env" in source
