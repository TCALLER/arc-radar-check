"""Messages carrying injected instructions must have no effect: attack == clean twin."""

import pytest

from arc_collector.normalize import channel_key
from arc_collector.summary import to_json

from .conftest import ROOT, load_messages, row

INJECTION = ROOT / "fixtures" / "injection"
NAMES = sorted({p.name.split(".")[0] for p in INJECTION.glob("*.attack.json")})


def test_every_attack_has_a_clean_twin():
    assert len(NAMES) >= 12
    for name in NAMES:
        assert (INJECTION / f"{name}.clean.json").exists()


@pytest.mark.parametrize("name", NAMES)
def test_attack_equals_clean_twin(name, run, base_messages):
    attack = run(base_messages + load_messages(INJECTION / f"{name}.attack.json"))
    clean = run(base_messages + load_messages(INJECTION / f"{name}.clean.json"))
    assert to_json(attack) == to_json(clean)


@pytest.mark.parametrize("name", NAMES)
def test_attack_never_changes_other_channels(name, run, registry, base_messages, base_summary):
    path = INJECTION / f"{name}.attack.json"
    host = load_messages(path)[0].channel
    host_name = registry.info_for(channel_key(host)).name
    attack = run(base_messages + load_messages(path))
    base_rows = {r["channel"]: r for r in base_summary["by_channel"]}
    for r in attack["by_channel"]:
        if r["channel"] != host_name and r["channel"] in base_rows:
            assert r == base_rows[r["channel"]]
    others = [r for r in attack["by_channel"] if r["channel"] != host_name]
    assert {r["channel"] for r in others} <= set(base_rows)
    assert attack["paid_trending"] == base_summary["paid_trending"]


def test_tier_claim_and_ignore_instructions_do_not_change_tier_or_weight(run, base_messages):
    for name in ("ignore_previous", "tier_claim", "json_in_text", "output_manipulation"):
        s = run(base_messages + load_messages(INJECTION / f"{name}.attack.json"))
        tier3 = row(s, "Fixture Tier3 Chat")
        assert tier3["tier"] == "volume" and tier3["weight"] == 0.3
        assert s["totals"]["weighted_score"] == pytest.approx(2.2 + 0.3 * 0.5)


def test_impersonated_channel_gets_no_high_signal_status(run, base_messages):
    s = run(base_messages + load_messages(INJECTION / "channel_impersonation.attack.json"))
    impostor = [
        r
        for r in s["by_channel"]
        if not r["registered"]
        and r["mention_count"] == 1
        and r["first_seen"] == "2026-10-09T20:00:00Z"
    ]
    assert len(impostor) == 1
    assert impostor[0]["tier"] == "unrated" and impostor[0]["weight"] == 0.2
    assert row(s, "Fixture Tier1 News")["mention_count"] == 2  # real channel unchanged


def test_homoglyph_ticker_is_not_a_mention(run, base_messages, base_summary):
    s = run(base_messages + load_messages(INJECTION / "homoglyph_ticker.attack.json"))
    assert s["by_channel"] == base_summary["by_channel"]


def test_zero_width_ticker_counts_but_is_warned(run, base_messages):
    s = run(base_messages + load_messages(INJECTION / "zero_width.attack.json"))
    assert {"channel": "Fixture Tier3 Chat", "code": "obfuscated_text", "count": 1} in s["warnings"]
    assert row(s, "Fixture Tier3 Chat")["mention_count"] == 2


def test_lookalike_address_is_conflicting_not_confirmed(run, base_messages):
    s = run(base_messages + load_messages(INJECTION / "lookalike_ca.attack.json"))
    assert s["totals"]["mentions_conflicting"] == 2
    assert s["totals"]["mentions_confirmed"] == 3


def test_disguised_link_reports_the_real_domain(run, base_messages):
    s = run(base_messages + load_messages(INJECTION / "disguised_link.attack.json"))
    domains = row(s, "Fixture Tier3 Chat")["link_domains"]
    assert "binance.com.evil.example" in domains
    assert "binance.com" not in domains


def test_fake_paid_trending_claim_stays_in_its_real_tier(run, base_messages):
    s = run(base_messages + load_messages(INJECTION / "fake_paid_trending_claim.attack.json"))
    assert s["totals"]["mentions_paid_trending"] == 2
    assert len(s["paid_trending"]["channels"]) == 1
    assert row(s, "Fixture Tier2 Digest")["mention_count"] == 2
