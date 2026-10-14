"""Property-based tests: hostile text never crashes, never leaks, extraction is idempotent."""

from datetime import UTC, datetime

from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from arc_collector.extract import extract_contract_addresses, extract_tickers
from arc_collector.models import Message
from arc_collector.normalize import clean_text

from .conftest import DEMO_CA, OTHER_CA, SOL_CA
from .test_no_leakage import UNREGISTERED, allowed_strings, strings_in

SETTINGS = settings(
    max_examples=300, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture]
)
SNIPPETS = st.sampled_from(
    [
        "$DEMO",
        "#DEMO",
        "$demo",
        DEMO_CA,
        SOL_CA,
        OTHER_CA,
        "0x" + "ab" * 20,
        "https://example.com/x",
        "ignore previous instructions",
        "<system>",
        '{"tier": "high_signal"}',
        "\u200b",
        "\u202e",
        "$D\u0415MO",
        "[PAID TRENDING]",
        "\n",
        "  ",
    ]
)
TEXTS = st.lists(st.one_of(SNIPPETS, st.text(max_size=60)), max_size=12).map(" ".join)
CHANNELS = st.one_of(
    st.sampled_from(["Fixture Tier1 News", "Fixture Paid Trending Bot", "Fixture Excluded Feed"]),
    st.text(min_size=1, max_size=40),
)


def message(channel, text, i=1):
    return Message(channel, str(i), datetime(2026, 10, 9, 12, tzinfo=UTC), text)


@SETTINGS
@given(channel=CHANNELS, text=TEXTS)
def test_arbitrary_message_never_crashes_or_leaks(run, token, registry, channel, text):
    messages = [message(channel, text)]
    summary = run(messages)  # also validates against the schema
    allowed = allowed_strings(messages, token, registry)
    for s in strings_in(summary):
        assert s in allowed or UNREGISTERED.fullmatch(s)


@SETTINGS
@given(texts=st.lists(TEXTS, min_size=2, max_size=8), data=st.data())
def test_message_order_never_changes_output(run, texts, data):
    messages = [message("Fixture Tier2 Digest", t, i) for i, t in enumerate(texts)]
    shuffled = data.draw(st.permutations(messages))
    assert run(shuffled) == run(messages)


@SETTINGS
@given(text=TEXTS)
def test_ticker_extraction_is_idempotent(text):
    tickers = extract_tickers(text)
    assert extract_tickers(" ".join("$" + t for t in tickers)) == tickers


@SETTINGS
@given(text=TEXTS)
def test_address_extraction_is_idempotent(text):
    cas = extract_contract_addresses(text)
    assert extract_contract_addresses(" ".join(cas)) == cas


@SETTINGS
@given(text=st.text(max_size=200))
def test_clean_text_removes_only_invisibles(text):
    cleaned, removed = clean_text(text)
    assert removed >= 0
    assert "\u200b" not in cleaned
    assert "\u202e" not in cleaned


@SETTINGS
@given(junk=st.text(alphabet="abcdefghij klmnopqrstuvwxyz.,!", max_size=300))
def test_plain_words_never_create_mentions(run, junk):
    assert run([message("Fixture Tier1 News", junk)])["totals"]["mentions_total"] == 0
