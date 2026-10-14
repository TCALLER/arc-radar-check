# Optional point 4: YouTube adapter (not built, not part of the $100)

The requester asked for a fixed price and timeline. This is the scope and effort estimate; the price is the
contractor's decision.

**Scope:** `YouTubeSource` implementing `MessageSource`, using the official YouTube Data API v3 (`search.list`
for videos matching the token's ticker/address, `videos.list` for titles and descriptions). Each video becomes a
`Message`: channel = YouTube channel handle, id = video id, date = publish time, text = title + description.
Extraction, weighting, registry and output are reused unchanged; YouTube channels get tiers in the same registry.

**Work items and effort:**
| Item | Hours |
|---|---|
| Source class, quota-aware paging, API key read from environment only | 3 |
| Mapping to Message, id/date/entity handling, description link entities | 2 |
| Tests with recorded-shape fake transport, no network (as for the Bot API source) | 3 |
| Injection fixtures specific to titles/descriptions (hidden links, "pinned comment" style text) | 2 |
| README, quota notes, review | 1 |
| **Total** | **about 11 hours (1.5 working days)** |

**Needs from the requester:** a YouTube Data API key supplied by them at run time (never committed), the quota
they expect (search.list costs 100 units per call out of 10,000 per day by default), and the list of channels to tier.
**Risk:** descriptions are long and link-heavy, so the link-domain and conflicting-address rules matter more there.
