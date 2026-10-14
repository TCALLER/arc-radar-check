from datetime import UTC, datetime

import pytest

from arc_collector.collect import collect_from_source
from arc_collector.sources import (
    FixtureSource,
    InMemorySource,
    SourceError,
    TelegramSource,
    parse_message,
    parse_timestamp,
)

from .conftest import AS_OF, ROOT, load_messages


def test_in_memory_and_fixture_sources_give_identical_summaries(token, registry, policy):
    base = ROOT / "fixtures" / "base"
    a = collect_from_source(FixtureSource(base), token, registry, policy, AS_OF)
    b = collect_from_source(InMemorySource(load_messages(base)), token, registry, policy, AS_OF)
    assert a == b


def test_telegram_source_is_a_stub():
    with pytest.raises(NotImplementedError):
        TelegramSource().fetch(AS_OF, AS_OF)


@pytest.mark.parametrize(
    "raw",
    [
        "not an object",
        {"id": 1, "date": "2026-10-09T00:00:00Z", "text": "x"},  # no channel
        {"channel": "c", "id": "bad id!", "date": "2026-10-09T00:00:00Z", "text": "x"},
        {"channel": "c", "id": 1, "date": "2026-10-09T00:00:00", "text": "x"},  # no timezone
        {"channel": "c", "id": 1, "date": "yesterday", "text": "x"},
        {"channel": "c", "id": 1, "date": 5, "text": "x"},
        {"channel": "c", "id": 1, "date": "2026-10-09T00:00:00Z", "text": 7},
    ],
)
def test_bad_messages_rejected(raw):
    with pytest.raises(SourceError):
        parse_message(raw)


def test_timestamps_become_utc():
    assert parse_timestamp("2026-10-09T05:00:00-05:00", "t") == datetime(
        2026, 10, 9, 10, tzinfo=UTC
    )


def test_bad_fixture_file(tmp_path):
    (tmp_path / "x.json").write_text("{not json", encoding="utf-8")
    with pytest.raises(SourceError):
        list(FixtureSource(tmp_path).fetch(AS_OF, AS_OF))
