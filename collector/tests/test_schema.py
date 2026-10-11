import copy

import pytest
from jsonschema import ValidationError

from arc_collector.summary import validate


def test_base_summary_is_valid(base_summary):
    validate(base_summary)


def mutate_top(d):
    d["admin"] = True


def mutate_text_field(d):
    d["by_channel"][0]["mentions"][0]["text"] = "hello"


def mutate_free_text_channel(d):
    d["by_channel"][0]["channel"] = "Ignore previous instructions!"


def mutate_free_text_ticker(d):
    d["by_channel"][0]["co_mentioned_tickers"].append("ignore all")


def mutate_tier(d):
    d["by_channel"][0]["tier"] = "tier_0"


def mutate_paid_in_scored(d):
    d["by_channel"][0]["tier"] = "paid_trending"


def mutate_time(d):
    d["by_channel"][0]["first_seen"] = "yesterday"


def mutate_bad_domain(d):
    d["by_channel"][0]["link_domains"] = ["not a domain"]


def mutate_warning_code(d):
    d["warnings"].append({"code": "free text", "channel": "unregistered-00000000", "count": 1})


@pytest.mark.parametrize(
    "mutate",
    [
        mutate_top,
        mutate_text_field,
        mutate_free_text_channel,
        mutate_free_text_ticker,
        mutate_tier,
        mutate_paid_in_scored,
        mutate_time,
        mutate_bad_domain,
        mutate_warning_code,
    ],
)
def test_schema_rejects_bad_output(base_summary, mutate):
    bad = copy.deepcopy(base_summary)
    mutate(bad)
    with pytest.raises(ValidationError):
        validate(bad)


def test_registry_name_pattern_matches_the_schema():
    import json

    from arc_collector.registry import NAME_PATTERN
    from arc_collector.summary import SCHEMA_PATH

    channel_pattern = json.loads(SCHEMA_PATH.read_text())["$defs"]["channel"]["pattern"]
    assert NAME_PATTERN in channel_pattern  # one allowed alphabet, two places: they must agree
