"""Derive the USDC-on-Arc demo fixtures (fixtures/demo_usdc) from the synthetic DEMO fixtures.

Run from the collector/ folder:  uv run python tools/make_demo_usdc.py
USDC is the demo token (requester's choice). Its Arc address comes from the requester's
README (verify against the official Arc docs). The messages stay synthetic; only the ticker and
address change, and the old co-mentioned USDC ticker becomes ETH so it cannot clash.
Also writes the manual-entry template for paid-trending channels.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEMO_CA = "0x1234567890abcdef1234567890abcdef12345678"
USDC_CA = "0x3600000000000000000000000000000000000000"


def convert(text: str) -> str:
    text = text.replace("USDC", "ETH")  # co-mentions in the DEMO set
    text = text.replace(DEMO_CA, USDC_CA)
    return text.replace("DEMO", "USDC")


def main() -> None:
    out = ROOT / "fixtures" / "demo_usdc"
    out.mkdir(parents=True, exist_ok=True)
    for src in sorted((ROOT / "fixtures" / "base").glob("*.json")):
        data = json.loads(convert(src.read_text(encoding="utf-8")))
        (out / src.name).write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    template = {
        "description": "TEMPLATE for entering paid-trending mentions by hand (screen recording or reading the channel). "
        "Copy this file into a folder, edit it, and run the collector with --fixtures <that folder>. "
        "Only the channel, the time and the ticker/address matter; do not paste the channel's full text.",
        "messages": [
            {
                "channel": "example_trend_alpha",
                "id": "manual-1",
                "date": "2026-10-10T14:05:00Z",
                "text": "$USDC trending",
            },
            {
                "channel": "example_trend_beta",
                "id": "manual-2",
                "date": "2026-10-10T16:40:00Z",
                "text": "$USDC trending 0x3600000000000000000000000000000000000000",
            },
        ],
    }
    folder = ROOT / "fixtures" / "manual_template"
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "paid_trending_manual.json").write_text(
        json.dumps(template, indent=2) + "\n", encoding="utf-8"
    )
    print("demo fixtures written")


if __name__ == "__main__":
    main()
