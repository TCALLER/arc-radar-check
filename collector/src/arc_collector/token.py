"""Target-token configuration (data file), so another token needs no code change."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

from .extract import is_evm_address, is_solana_address


class TokenConfigError(ValueError):
    pass


_TICKER = re.compile(r"[A-Z][A-Z0-9]{1,9}")  # same shape the extractor and schema accept
_CHAIN = re.compile(r"[a-z0-9]{2,20}")


@dataclass(frozen=True)
class Token:
    ticker: str
    chain: str
    contract_addresses: tuple[str, ...]
    aliases: tuple[str, ...] = ()

    @property
    def tags(self) -> frozenset[str]:
        return frozenset({self.ticker, *self.aliases})


def load_token(path: Path) -> Token:
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    except ValueError as exc:
        raise TokenConfigError(f"token config {path} is not valid JSON: {exc}") from exc
    try:
        return build_token(
            str(data["ticker"]),
            str(data["chain"]),
            list(data["contract_addresses"]),
            list(data.get("aliases", [])),
        )
    except (KeyError, TypeError) as exc:
        raise TokenConfigError(f"token config missing field: {exc}") from exc


def build_token(ticker: str, chain: str, raw_cas: list[str], raw_aliases: list[str] = ()) -> Token:
    """Validate and build a Token from plain values (config file or command-line options)."""
    ticker = ticker.upper()
    if not _TICKER.fullmatch(ticker):
        raise TokenConfigError("ticker must be 2-10 ASCII letters/digits starting with a letter")
    if not _CHAIN.fullmatch(chain):
        raise TokenConfigError("chain must be 2-20 lowercase letters/digits, e.g. arc")
    cas: list[str] = []
    for ca in raw_cas:
        if is_evm_address(ca):
            cas.append(ca.lower())
        elif is_solana_address(ca):
            cas.append(ca)
        else:
            raise TokenConfigError(f"not a valid contract address: {ca!r}")
    aliases = tuple(sorted({str(a).upper() for a in raw_aliases} - {ticker}))
    if not all(_TICKER.fullmatch(a) for a in aliases):
        raise TokenConfigError("aliases must be 2-10 ASCII letters/digits starting with a letter")
    return Token(ticker, chain, tuple(sorted(set(cas))), aliases)
