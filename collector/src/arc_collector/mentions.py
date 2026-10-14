"""Turns one untrusted Message into a structured Mention. The only place message text is read."""

from __future__ import annotations

from .extract import (
    domain_of,
    extract_contract_addresses,
    extract_tickers,
    extract_urls,
)
from .models import Entity, Mention, Message
from .normalize import channel_key, clean_text
from .token import Token


def classify(tickers: tuple[str, ...], addresses: tuple[str, ...], token: Token) -> str | None:
    """confirmed: configured contract address present. ticker: cashtag only.
    conflicting: cashtag next to a different contract address. None: not about the token."""
    if any(a in token.contract_addresses for a in addresses):
        return "confirmed"
    if token.tags & set(tickers):
        return "conflicting" if addresses else "ticker"
    return None


def extract_mention(message: Message, token: Token) -> Mention | None:
    text, removed = clean_text(message.text)
    entities = [
        Entity(e.type, clean_text(e.text)[0], clean_text(e.href)[0]) for e in message.entities
    ]
    hrefs = "\n".join(e.href for e in entities)
    tickers = extract_tickers(text)
    addresses = extract_contract_addresses(text + "\n" + hrefs)
    kind = classify(tickers, addresses, token)
    if kind is None:
        return None
    urls = extract_urls(text, entities)
    domains = tuple(sorted({d for d in map(domain_of, urls) if d}))
    return Mention(
        channel_key=channel_key(message.channel),
        message_id=message.message_id,
        timestamp=message.date,
        kind=kind,
        tickers=tuple(t for t in tickers if t not in token.tags),
        contract_addresses=addresses,
        link_domains=domains,
        link_count=len(urls),
        forwarded=message.forwarded_from is not None,
        obfuscated=removed > 0,
    )


def explain(message: Message, token: Token) -> dict:
    """What the extractor saw in one message, without any of its text (for --explain)."""
    text, removed = clean_text(message.text)
    tickers = extract_tickers(text)
    addresses = extract_contract_addresses(text)
    return {
        "has_text": bool(text.strip()),
        "length": len(text),
        "tickers_found": list(tickers),
        "addresses_found": len(addresses),
        "token_address_present": any(a in token.contract_addresses for a in addresses),
        "token_ticker_present": bool(token.tags & set(tickers)),
        "invisible_characters_removed": removed,
        "result": classify(tickers, addresses, token) or "not a mention",
    }
