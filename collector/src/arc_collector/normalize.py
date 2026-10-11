"""Text and channel-name normalisation. Normalised text is used for matching only, never output."""

from __future__ import annotations

import unicodedata


def clean_text(text: str) -> tuple[str, int]:
    """NFKC-normalise and strip invisible/control characters.

    Returns the cleaned text and how many characters were removed (zero-width spaces, bidi
    marks, control characters). Whitespace is kept. Cyrillic/Greek look-alikes are NOT folded
    to Latin: a look-alike ticker simply fails to match.
    """
    normalised = unicodedata.normalize("NFKC", text)
    kept: list[str] = []
    removed = 0
    for ch in normalised:
        if ch.isspace():
            kept.append(ch)
        elif unicodedata.category(ch) in ("Cf", "Cc", "Co", "Cs"):
            removed += 1
        else:
            kept.append(ch)
    return "".join(kept), removed


def channel_key(name: str) -> str:
    """Exact-ish channel key: NFC, collapsed whitespace, casefolded. No compatibility folding,
    so a look-alike channel name does not collide with a registered one."""
    return " ".join(unicodedata.normalize("NFC", name).split()).casefold()
