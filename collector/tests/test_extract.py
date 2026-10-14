import pytest

from arc_collector.extract import (
    domain_of,
    extract_contract_addresses,
    extract_tickers,
    extract_urls,
    is_evm_address,
    is_solana_address,
)
from arc_collector.models import Entity
from arc_collector.normalize import channel_key, clean_text

from .conftest import SOL_CA, SOL_OTHER

EVM = "0xDc45b71d7203c2e8baafC43A19BcA0Eb993bB54E"


@pytest.mark.parametrize(
    "text,expected",
    [
        ("$DEMO to the moon", ("DEMO",)),
        ("$demo lower case", ("DEMO",)),
        ("#STRK/USDT signal", ("STRK",)),
        ("$DEMO\U0001f680 and ($SOL)", ("DEMO", "SOL")),
        ("price is $100 or $5", ()),
        ("US$DEMO glued", ()),
        ("$A single letter", ()),
        ("$TOOLONGTICKERX", ()),
        ("$DEMO\u0445 cyrillic tail", ()),
        ("no tags here", ()),
    ],
)
def test_tickers(text, expected):
    assert extract_tickers(text) == expected


def test_solana_addresses_valid_and_invalid():
    assert is_solana_address(SOL_CA)
    assert is_solana_address(SOL_OTHER)
    assert not is_solana_address("short")
    assert not is_solana_address("0" * 40)  # 0 is not base58
    assert not is_solana_address("z" * 44)  # decodes to more than 32 bytes
    assert not is_solana_address("1" * 31)


def test_contract_addresses_extraction():
    text = f"a {SOL_CA}, b ({EVM}) c {SOL_OTHER}."
    assert extract_contract_addresses(text) == tuple(sorted([SOL_CA, EVM.lower(), SOL_OTHER]))


def test_addresses_embedded_in_words_do_not_match():
    assert extract_contract_addresses(f"x{SOL_CA}") == ()
    assert extract_contract_addresses(f"{SOL_CA}x") == ()
    assert extract_contract_addresses("a" * 45) == ()
    assert not is_evm_address("0x" + "g" * 40)


def test_urls_and_domains():
    ents = [Entity("text_link", "click", "https://Sub.Example.COM/x"), Entity("url", "t.me/abc")]
    urls = extract_urls("see https://www.example.com/a, and www.example.org.", ents)
    assert domain_of("https://www.Example.com/a") == "example.com"
    assert {domain_of(u) for u in urls} == {"example.com", "example.org", "sub.example.com", "t.me"}


@pytest.mark.parametrize(
    "bad",
    [
        "javascript:alert(1)",
        "ftp://example.com",
        "http://localhost",
        "http://",
        "https://exa mple.com",
    ],
)
def test_bad_domains_rejected(bad):
    assert domain_of(bad) is None


def test_clean_text_strips_invisible_and_counts():
    cleaned, removed = clean_text("$D\u200bE\u202eMO\x00 ok\n")
    assert cleaned == "$DEMO ok\n" and removed == 3


def test_clean_text_does_not_fold_lookalikes():
    cleaned, _ = clean_text("$D\u0415MO")
    assert cleaned != "$DEMO"


def test_channel_key_exactness():
    assert channel_key("  Fixture  Tier1 News ") == "fixture tier1 news"
    assert channel_key("Fixture Tier1 N\u0435ws") != channel_key("Fixture Tier1 News")
    assert channel_key("\uff26ixture Tier1 News") != channel_key("Fixture Tier1 News")
