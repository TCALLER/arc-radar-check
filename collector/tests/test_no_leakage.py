"""Every string in the output must come from an allow-list; summary code cannot reach raw text."""

import ast
import re
from pathlib import Path

import pytest

from arc_collector.aggregate import iso
from arc_collector.extract import (
    domain_of,
    extract_contract_addresses,
    extract_tickers,
    extract_urls,
)
from arc_collector.normalize import clean_text

from .conftest import AS_OF, ROOT, load_messages

SRC = ROOT / "src" / "arc_collector"
INJECTION = ROOT / "fixtures" / "injection"
UNREGISTERED = re.compile(r"unregistered-[0-9a-f]{8}")
CONSTANTS = {
    "high_signal",
    "neutral",
    "volume",
    "promotional",
    "unrated",
    "paid_trending",
    "confirmed",
    "ticker",
    "conflicting",
    "obfuscated_text",
    "conflicting_contract_address",
    "unregistered_channel",
    "DEMO",
    "arc",
}


def strings_in(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for v in value.values():  # keys are fixed by the schema; values are what could leak
            yield from strings_in(v)
    elif isinstance(value, list):
        for v in value:
            yield from strings_in(v)


def allowed_strings(messages, token, registry):
    allowed = (
        set(CONSTANTS)
        | {iso(AS_OF)}
        | {e.name for e in registry.entries}
        | set(token.contract_addresses)
    )
    for m in messages:
        text, _ = clean_text(m.text)
        allowed.add(m.message_id)
        allowed.add(iso(m.date))
        allowed.update(extract_tickers(text))
        allowed.update(extract_contract_addresses(text))
        for url in extract_urls(text, m.entities):
            domain = domain_of(url)
            if domain:
                allowed.add(domain)
    return allowed


def check(summary, messages, token, registry):
    allowed = allowed_strings(messages, token, registry)
    bad = [s for s in strings_in(summary) if s not in allowed and not UNREGISTERED.fullmatch(s)]
    assert bad == []


def test_base_output_strings_are_allow_listed(base_summary, base_messages, token, registry):
    check(base_summary, base_messages, token, registry)


@pytest.mark.parametrize("path", sorted(INJECTION.glob("*.attack.json")), ids=lambda p: p.name)
def test_attack_output_strings_are_allow_listed(path, run, base_messages, token, registry):
    messages = base_messages + load_messages(path)
    check(run(messages), messages, token, registry)


def test_injected_phrases_never_appear_in_output(run, base_messages):
    phrases = ("ignore", "instructions", "system prompt", "admin", "reveal", "secrets", "official")
    for path in sorted(INJECTION.glob("*.attack.json")):
        dumped = repr(run(base_messages + load_messages(path))).lower()
        for phrase in phrases:
            assert phrase not in dumped, (path.name, phrase)


SUMMARY_SIDE = ["summary.py", "aggregate.py", "weighting.py", "policy.py"]
FORBIDDEN_ATTRS = {"text", "entities", "href", "raw"}
FORBIDDEN_IMPORTS = {"mentions", "extract", "normalize", "sources"}


@pytest.mark.parametrize("filename", SUMMARY_SIDE)
def test_summary_side_modules_cannot_reach_message_text(filename):
    tree = ast.parse((SRC / filename).read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.Attribute):
            assert node.attr not in FORBIDDEN_ATTRS, f"{filename} reads .{node.attr}"
        if isinstance(node, ast.ImportFrom) and node.level:
            imported = {node.module or ""} | {a.name for a in node.names}
            assert not imported & FORBIDDEN_IMPORTS, f"{filename} imports {imported}"


def test_mention_model_has_no_text_field():
    from dataclasses import fields

    from arc_collector.models import Mention

    assert not {f.name for f in fields(Mention)} & {"text", "raw", "entities", "href"}


def test_only_mentions_module_reads_message_text():
    readers = []
    for path in sorted(Path(SRC).glob("*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        if any(isinstance(n, ast.Attribute) and n.attr == "text" for n in ast.walk(tree)):
            readers.append(path.name)
    # collect.py reads it only as a deterministic tie-break between two edits of one message.
    assert set(readers) <= {"mentions.py", "extract.py", "collect.py", "sources.py", "token.py"}
