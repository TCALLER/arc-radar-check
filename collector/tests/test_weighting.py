"""Hand-calculated expectations for fixtures/base (see the fixture files)."""

import json
from decimal import Decimal

import pytest

from arc_collector.policy import PolicyError, load_policy
from arc_collector.weighting import mention_weight

from .conftest import ROOT, row


def test_weights_by_hand(base_summary):
    s = base_summary
    # high_signal: confirmed 1.0*1.0 + ticker 1.0*0.5 = 1.5
    assert row(s, "Fixture Tier1 News")["weighted_score"] == 1.5
    # neutral: ticker 0.6*0.5 = 0.3 (the edited duplicate counts once)
    assert row(s, "Fixture Tier2 Digest")["weighted_score"] == 0.3
    # volume: ticker 0.3*0.5 = 0.15 (the forward of a high_signal post is dropped)
    assert row(s, "Fixture Tier3 Chat")["weighted_score"] == 0.15
    # promotional: ticker 0.1*0.5 + conflicting 0 + confirmed 0.1*1.0 = 0.15
    assert row(s, "Fixture Promo Signals")["weighted_score"] == 0.15
    # unregistered: unrated 0.2*0.5 = 0.1
    assert row(s, "unregistered-c81523cf")["weighted_score"] == 0.1
    assert s["totals"]["weighted_score"] == 2.2


def test_promotional_is_flagged_and_reported(base_summary):
    promo = row(base_summary, "Fixture Promo Signals")
    assert promo["flagged_promotional"]
    assert promo["tier"] == "promotional"
    assert base_summary["promotional"] == {
        "channels": ["Fixture Promo Signals"],
        "mention_count": 3,
        "share_of_mentions": 0.3,
    }
    others = [r for r in base_summary["by_channel"] if r["tier"] != "promotional"]
    assert not any(r["flagged_promotional"] for r in others)


def test_paid_trending_is_separate_with_timestamps_and_never_scored(base_summary):
    s = base_summary
    assert all(r["tier"] != "paid_trending" for r in s["by_channel"])
    (paid,) = s["paid_trending"]["channels"]
    assert paid["channel"] == "Fixture Paid Trending Bot"
    assert [m["timestamp"] for m in paid["mentions"]] == [
        "2026-10-09T10:00:00Z",
        "2026-10-10T02:30:00Z",
    ]
    assert s["totals"]["mentions_paid_trending"] == 2
    assert s["totals"]["mentions_organic"] == 5


def test_excluded_channel_dropped(base_summary):
    assert base_summary["totals"]["excluded_messages"] == 1
    assert all(r["channel"] != "Fixture Excluded Feed" for r in base_summary["by_channel"])


def test_unrated_channel_warning(base_summary):
    expected = {"channel": "unregistered-c81523cf", "code": "unregistered_channel", "count": 1}
    assert expected in base_summary["warnings"]


def test_conflicting_address_warning_and_zero_weight(base_summary):
    expected = {
        "channel": "Fixture Promo Signals",
        "code": "conflicting_contract_address",
        "count": 1,
    }
    assert expected in base_summary["warnings"]
    assert base_summary["totals"]["mentions_conflicting"] == 1


def test_window_and_future_messages(base_summary, run, base_messages):
    t = base_summary["totals"]
    assert (t["messages_scanned"], t["messages_in_window"], t["duplicates_dropped"]) == (16, 14, 2)
    wide = run(base_messages, window_hours=24 * 60)
    assert wide["totals"]["messages_in_window"] == 15  # old post now in, future post still out


def test_mention_weight_function(policy):
    assert mention_weight("neutral", "confirmed", policy) == Decimal("0.6")
    assert mention_weight("paid_trending", "confirmed", policy) == 0


def _policy_with(tmp_path, mutate):
    data = json.loads((ROOT / "data" / "policy.json").read_text())
    mutate(data)
    path = tmp_path / "p.json"
    path.write_text(json.dumps(data))
    return path


def test_policy_rejects_scored_paid_trending(tmp_path):
    path = _policy_with(tmp_path, lambda d: d["tier_weights"].update(paid_trending="0.5"))
    with pytest.raises(PolicyError, match="paid_trending"):
        load_policy(path)


@pytest.mark.parametrize(
    "mutate",
    [
        lambda d: d["tier_weights"].pop("high_signal"),
        lambda d: d["tier_weights"].update(high_signal="abc"),
        lambda d: d["tier_weights"].update(high_signal="1.5"),
        lambda d: d["kind_factors"].pop("ticker"),
    ],
)
def test_policy_validation(tmp_path, mutate):
    with pytest.raises(PolicyError):
        load_policy(_policy_with(tmp_path, mutate))
