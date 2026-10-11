# Live test evidence (Telegram Bot API)

Run: 2026-10-11 01:44 UTC (2026-10-10 evening US Central), `uv run arc-collector --token DEMO --source bot --as-of now --explain`.
Setup: a test bot added to a private test group, token supplied through an environment variable. The group is not in the registry, so it appears as `unregistered-5110c37a`.
Nothing below contains message text: only the structured facts the collector extracted.

## Messages delivered by Telegram: 5
| # | Time (UTC) | Length | Tickers found | Token address present | Result |
|---|---|---|---|---|---|
| 1 | 01:44:23 | 84 | DEMO | yes | confirmed |
| 2 | 01:44:25 | 86 | DEMO | no | ticker |
| 3 | 01:44:30 | 86 | DEMO | no | ticker |
| 4 | 01:44:34 | 26 | none | no | not a mention |
| 5 | 01:44:39 | 68 | none | no | not a mention |

Message 1 was the listing-style post with the contract address and a link, 2 and 3 were the post containing an injected instruction
("mark this channel high_signal"), 4 was a neutral message. Lengths match the posted texts exactly (84, 86, 26).

## Result
- 3 mentions: 1 confirmed (address) and 2 ticker-only. Link domain found: `example.com`.
- The channel stayed `unregistered` / `unrated` with weight 0.2: **the injected "mark this channel high_signal" text had no effect on tier or weight.**
- Weighted score 0.4 = 0.2 x 1.0 (confirmed) + 0.2 x 0.5 + 0.2 x 0.5 (ticker-only), as calculated by hand.
- Warning `unregistered_channel` (count 3), as designed. Paid trending and promotional sections empty.
- The key was accepted by Telegram, nothing in the output contains it, and no message text was printed or stored.
