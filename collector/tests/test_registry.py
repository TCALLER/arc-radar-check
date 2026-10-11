import json

import pytest

from arc_collector.registry import TIERS, RegistryError, load_registry

from .conftest import ROOT

GOOD = {"name": "Chan A", "tier": "high_signal", "reason": "fine", "handle": "chan_a"}


def write(tmp_path, channels):
    p = tmp_path / "r.json"
    p.write_text(json.dumps({"channels": channels}), encoding="utf-8")
    return p


def test_production_registry_loads():
    reg = load_registry(ROOT / "data" / "channels.json")
    assert {e.tier for e in reg.entries} == set(TIERS)  # every tier represented
    assert all("\n" not in e.reason and len(e.reason) <= 120 for e in reg.entries)


@pytest.mark.parametrize(
    ("bad", "msg"),
    [
        ({**GOOD, "tier": "tier_9"}, "tier must be"),
        ({**GOOD, "reason": "line one\nline two"}, "one line"),
        ({**GOOD, "reason": "x" * 121}, "one line"),
        ({**GOOD, "reason": " "}, "reason"),
        ({"name": "Chan A", "tier": "high_signal"}, "reason"),
        ({"name": "Chan A", "tier": "high_signal", "reason": "x"}, "public channels only"),
        ({**GOOD, "handle": ""}, "public channels only"),
        ({**GOOD, "name": "Bad <name>"}, "characters"),
        ({**GOOD, "extra": 1}, "unknown field"),
        ({**GOOD, "handle": "bad handle!"}, "handle"),
    ],
)
def test_bad_rows_rejected(tmp_path, bad, msg):
    with pytest.raises(RegistryError, match=msg):
        load_registry(write(tmp_path, [bad]))


def test_duplicate_name_or_handle_rejected(tmp_path):
    with pytest.raises(RegistryError, match="duplicate"):
        load_registry(write(tmp_path, [GOOD, {**GOOD, "name": "chan a"}]))
    rows = [GOOD, {**GOOD, "name": "B", "handle": "CHAN_A"}]
    with pytest.raises(RegistryError, match="duplicate"):
        load_registry(write(tmp_path, rows))


def test_unreadable_registry(tmp_path):
    with pytest.raises(RegistryError):
        load_registry(tmp_path / "missing.json")


def test_unknown_channel_defaults_to_unrated_and_anonymised(registry):
    info = registry.info_for("some channel")
    assert info.tier == "unrated"
    assert not info.registered
    assert info.name.startswith("unregistered-")
    assert len(info.name) == len("unregistered-") + 8
    assert registry.info_for("some channel") == info  # stable hash


def test_lookup_by_handle(tmp_path):
    reg = load_registry(write(tmp_path, [{**GOOD, "handle": "@chan_a_bot"}]))
    assert reg.info_for("chan_a_bot").name == "Chan A"


def test_csv_registry_matches_json(tmp_path):
    csv_path = tmp_path / "r.csv"
    csv_path.write_text(
        "name,tier,reason,handle\n"
        "Chan A,high_signal,fine,chan_a\n"
        'Chan B,promotional,"Sells signals, flags profit",chan_b\n',
        encoding="utf-8",
    )
    from_csv = load_registry(csv_path)
    from_json = load_registry(
        write(
            tmp_path,
            [
                GOOD,
                {
                    "name": "Chan B",
                    "tier": "promotional",
                    "reason": "Sells signals, flags profit",
                    "handle": "chan_b",
                },
            ],
        )
    )
    assert from_csv.entries == from_json.entries


def test_csv_registry_validates_like_json(tmp_path):
    bad = tmp_path / "bad.csv"
    bad.write_text("name,tier,reason,handle\nChan A,nonsense,fine,chan_a\n", encoding="utf-8")
    with pytest.raises(RegistryError, match="tier must be"):
        load_registry(bad)


def test_brief_tier_names_are_the_allowed_ones():
    from arc_collector.registry import TIERS

    assert {"high_signal", "neutral", "volume", "promotional", "paid_trending"} <= set(TIERS)


def test_real_registry_is_public_channels_only_with_paid_trending():
    reg = load_registry(ROOT / "data" / "channels.json")
    assert all(e.handle for e in reg.entries)
    paid = {e.handle for e in reg.entries if e.tier == "paid_trending"}
    assert paid == {"example_trend_alpha", "example_trend_beta"}


def test_csv_with_excel_bom_loads(tmp_path):
    path = tmp_path / "excel.csv"
    path.write_bytes("\ufeffname,tier,reason,handle\nChan A,volume,ok,chan_a\n".encode())
    assert load_registry(path).entries[0].name == "Chan A"


def test_public_registry_uses_only_made_up_names():
    """The repository is public: real channels must never be labelled here (requester's rule)."""
    reg = load_registry(ROOT / "data" / "channels.json")
    assert all(e.handle.startswith("example_") for e in reg.entries)
    assert all(e.name.startswith("Example ") for e in reg.entries)
