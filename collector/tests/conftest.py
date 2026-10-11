from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

import pytest

from arc_collector.collect import collect
from arc_collector.policy import load_policy
from arc_collector.registry import load_registry
from arc_collector.sources import FixtureSource, parse_message
from arc_collector.token import load_token

ROOT = Path(__file__).resolve().parent.parent
AS_OF = datetime(2026, 10, 10, 12, 0, tzinfo=UTC)
DEMO_CA = "0x1234567890abcdef1234567890abcdef12345678"  # synthetic token on the arc chain
OTHER_CA = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
SOL_CA = "61V8vBaqAGMpgDQi4JcAwo1dmBGHsyhzodcPqnEVpump"  # Solana-format address (extractor tests)
SOL_OTHER = "So11111111111111111111111111111111111111112"


@pytest.fixture(scope="session")
def token():
    return load_token(ROOT / "data" / "tokens" / "demo.json")


@pytest.fixture(scope="session")
def registry():
    return load_registry(ROOT / "fixtures" / "registry.json")


@pytest.fixture(scope="session")
def policy():
    return load_policy(ROOT / "data" / "policy.json")


def load_messages(*folders_or_files: Path):
    out = []
    for p in folders_or_files:
        if p.is_dir():
            out.extend(FixtureSource(p).fetch(AS_OF, AS_OF))
        else:
            import json

            for i, raw in enumerate(json.loads(p.read_text(encoding="utf-8"))["messages"]):
                out.append(parse_message(raw, f"{p.name}[{i}]"))
    return out


@pytest.fixture(scope="session")
def base_messages():
    return load_messages(ROOT / "fixtures" / "base")


@pytest.fixture(scope="session")
def run(token, registry, policy):
    def _run(messages, window_hours=48):
        return collect(messages, token, registry, policy, AS_OF, window_hours)

    return _run


@pytest.fixture(scope="session")
def base_summary(run, base_messages):
    return run(base_messages)


def row(summary, channel):
    return next(r for r in summary["by_channel"] if r["channel"] == channel)
