"""Demo token = USDC on Arc (requester's choice); manual entry for paid-trending channels."""

import json

from arc_collector.cli import main
from arc_collector.token import load_token

from .conftest import ROOT

USDC_ADDRESS = "0x3600000000000000000000000000000000000000"


def test_usdc_config_route_matches_golden(capsys):
    args = [
        "--token",
        "USDC",
        "--fixtures",
        str(ROOT / "fixtures" / "demo_usdc"),
        "--registry",
        str(ROOT / "fixtures" / "registry.json"),
        "--policy",
        str(ROOT / "data" / "policy.json"),
        "--token-config",
        str(ROOT / "data" / "tokens" / "usdc.json"),
        "--as-of",
        "2026-10-10T12:00:00Z",
    ]
    assert main(args) == 0
    golden = (ROOT / "tests" / "golden" / "demo_usdc_summary.json").read_text(encoding="utf-8")
    assert capsys.readouterr().out == golden


def test_usdc_demo_scores_like_the_synthetic_demo(base_summary):
    usdc = json.loads((ROOT / "tests" / "golden" / "demo_usdc_summary.json").read_text())
    assert usdc["token"] == {"chain": "arc", "contract_addresses": [USDC_ADDRESS], "ticker": "USDC"}
    assert usdc["totals"] == base_summary["totals"]  # same hand-checked numbers (2.2)
    assert [(r["channel"], r["tier"], r["weighted_score"]) for r in usdc["by_channel"]] == [
        (r["channel"], r["tier"], r["weighted_score"]) for r in base_summary["by_channel"]
    ]


def test_usdc_token_is_the_requesters_example():
    token = load_token(ROOT / "data" / "tokens" / "usdc.json")
    assert (token.ticker, token.chain, token.contract_addresses) == ("USDC", "arc", (USDC_ADDRESS,))


def test_manual_paid_trending_template_shows_timestamps_and_is_never_scored(capsys):
    args = [
        "--token",
        "USDC",
        "--address",
        USDC_ADDRESS,
        "--fixtures",
        str(ROOT / "fixtures" / "manual_template"),
        "--registry",
        str(ROOT / "data" / "channels.json"),
        "--policy",
        str(ROOT / "data" / "policy.json"),
        "--as-of",
        "2026-10-10T18:00:00Z",
    ]
    assert main(args) == 0
    out = json.loads(capsys.readouterr().out)
    paid = {
        c["channel"]: [m["timestamp"] for m in c["mentions"]]
        for c in out["paid_trending"]["channels"]
    }
    assert paid == {
        "Example Trend Alpha": ["2026-10-10T14:05:00Z"],
        "Example Trend Beta": ["2026-10-10T16:40:00Z"],
    }
    assert out["totals"]["weighted_score"] == 0
    assert out["by_channel"] == []
