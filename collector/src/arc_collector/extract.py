"""Pure extractors: cashtags, contract addresses, link domains. Return validated tokens only."""

from __future__ import annotations

import re
from collections.abc import Iterable
from urllib.parse import urlsplit

from .models import Entity

_B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
_B58_INDEX = {c: i for i, c in enumerate(_B58)}

_TAG = re.compile(r"(?<![\w$#])[$#]([A-Za-z][A-Za-z0-9]{1,9})(?!\w)")
_EVM = re.compile(r"(?<![0-9A-Za-z])0x[0-9a-fA-F]{40}(?![0-9A-Za-z])")
_SOL = re.compile(r"(?<![0-9A-Za-z])[1-9A-HJ-NP-Za-km-z]{32,44}(?![0-9A-Za-z])")
_URL = re.compile(r"(?:https?://|www\.)[^\s<>\"'\])}]+", re.IGNORECASE)
_HOST = re.compile(r"^[a-z0-9-]+(?:\.[a-z0-9-]+)+$")


def extract_tickers(text: str) -> tuple[str, ...]:
    """Cashtags/hashtags such as $DEMO or #STRK, upper-cased, de-duplicated, sorted."""
    return tuple(sorted({m.group(1).upper() for m in _TAG.finditer(text)}))


def is_solana_address(candidate: str) -> bool:
    """True if `candidate` is base58 and decodes to exactly 32 bytes."""
    if not 32 <= len(candidate) <= 44 or any(c not in _B58_INDEX for c in candidate):
        return False
    n = 0
    for ch in candidate:
        n = n * 58 + _B58_INDEX[ch]
    leading_zero_bytes = len(candidate) - len(candidate.lstrip("1"))
    body_len = (n.bit_length() + 7) // 8 if n else 0
    return leading_zero_bytes + body_len == 32


def is_evm_address(candidate: str) -> bool:
    return _EVM.fullmatch(candidate) is not None


def extract_contract_addresses(text: str) -> tuple[str, ...]:
    """Validated Solana (case kept) and EVM (lower-cased) addresses, de-duplicated, sorted."""
    found = {m.group(0).lower() for m in _EVM.finditer(text)}
    found.update(m.group(0) for m in _SOL.finditer(text) if is_solana_address(m.group(0)))
    return tuple(sorted(found))


def extract_urls(text: str, entities: Iterable[Entity]) -> frozenset[str]:
    urls = {m.group(0).rstrip(".,;:!?") for m in _URL.finditer(text)}
    for entity in entities:
        if entity.type == "url" and entity.text:
            urls.add(entity.text.strip())
        elif entity.type == "text_link" and entity.href:
            urls.add(entity.href.strip())
    return frozenset(urls)


def domain_of(url: str) -> str | None:
    """Lower-cased registrable-looking host for an http(s) URL, else None."""
    candidate = url if "://" in url else "http://" + url
    try:
        parts = urlsplit(candidate)
        host = parts.hostname
    except ValueError:
        return None
    if parts.scheme not in ("http", "https") or not host:
        return None
    host = host.lower().rstrip(".")
    if host.startswith("www."):
        host = host[4:]
    try:
        host = host.encode("idna").decode("ascii")
    except UnicodeError:
        return None
    return host if len(host) <= 253 and _HOST.fullmatch(host) else None
