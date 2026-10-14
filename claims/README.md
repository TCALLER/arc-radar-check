# Claims: verifiable promises of crypto projects

This folder holds one JSON file per project. Each file lists the verifiable promises a project makes in its own public documents (burns, buybacks, supply, allocation, team allocation and vesting, liquidity locks, fees and taxes), traced to the source sentence and location, plus a short log of alerts.

**Facts only.** The files do not score, rank, rate, or advise. They do not use buy, sell or hold language. They do not report live on-chain values; they say whether a promise can be checked on-chain and where to look.

This method is adapted from the developer offer comparison method used for housing-society redevelopment letters: fill in only what the document says, write "Not stated" for gaps, flag conflicts without resolving them, and never carry a conclusion from one document to another.

## Contents

| File | What it is |
|---|---|
| `schema/claims.schema.json` | JSON Schema every project file must follow |
| `scripts/validate.py` | Checks schema, unique ids, quote length, banned language; lists quotes still pending |
| `scripts/fill_quotes.py` | Places copied quotes into the JSON files from a simple text list (`scripts/quotes.txt`, a working file, not for the pull request) |
| `argus.json` | Argus launchpad on Arc (primary source: official repository README) |
| `tolly.json` | Tolly launchpad on Arc (primary source: official guide) |
| `arc-token-whitepaper.json` | Circle's proposed ARC token (primary source: whitepaper PDF and FAQ) |

## Rules

1. **Source everything.** Each promise carries a source URL, a location (page, section, heading or line), and the date accessed. A value with no source does not go in.
2. **"Not stated".** If a source does not address a field, write `"Not stated"`. Do not fill it from memory, from another project, or from a secondary article. "Not stated" is not evidence that nothing exists.
3. **Primary sources first.** Use the project's own documents (whitepaper, official docs, official repository, official announcement). Secondary sources (news, aggregators, explainers) are listed as `secondary` and are used only for cross-checks and alerts, never as the promise itself.
4. **Conflicts are flagged, not resolved.** If two statements disagree, log a Contradiction alert quoting both locations. Do not pick one.
5. **Context-dependent terminology.** Do not map a project's term to a standard concept just because the words look alike. Decide for this document using its own definition, amounts, structure and role. If the evidence is thin, keep the document's own wording and prefix `terminology_note` with: `Potentially equivalent - [standard term] - human verification required:`, and add a Question for Human Review alert saying what evidence would settle it. Example: a source says "buy and remove", not "burn".
6. **No transfer between projects.** A term mapping or fact established for one project does not carry over to another, even if the wording matches. Test each project against its own documents.
7. **Keep qualifiers.** Keep words like "up to", "approximately", "maximum", "proposed" in the text. Do not reduce a range to one number.
8. **Maximum 10 promises per project**, in this priority order: burns, buybacks, total supply and allocation, team allocation and vesting, liquidity locks, fees and taxes. Categories the source does not address go in `not_stated_categories`.
9. **Quotes.** `quote` holds a short verbatim fragment from the source (at most about 25 words; keep it as short as possible). If the exact wording has not been copied yet, set `quote_status` to `pending_paste` and leave a `PENDING:` marker saying what to paste and from where. Never write a quote from memory.
10. **No on-chain values.** Say whether a promise is checkable on-chain and how (contract, event, address, explorer). Do not report balances, supplies or transaction results.

## Method (repeat for any new project)

1. **Pick sources.** Find the project's own whitepaper, documentation, official repository or announcement. Record each in `sources` with type `primary` or `secondary`, date accessed, and the document's own date ("Not stated" if none).
2. **Read one document at a time**, in full, before moving to the next.
3. **Extract promises** in the priority order above, one claim per promise, up to 10. For each claim fill: `id`, `category`, `promise` (in your words, adding nothing the source does not say), `quote`, `source` (URL, location, date accessed), `numbers`, `dates`, `checkable_onchain`, `how_to_check`.
4. **Apply the terminology rules** (rules 5 and 6 above) to every term that might match a standard concept.
5. **List what is missing** in `not_stated_categories`.
6. **Write alerts** (see below). One or two sentences each: the fact, and what needs verifying. No opinions.
7. **Record checks** in `checks_performed`: what you compared and what you did not.
8. **Add quotes:** copy each quote from the source into `scripts/quotes.txt`, then run `python scripts/fill_quotes.py --write`.
9. **Validate:** `pip install jsonschema` then `python scripts/validate.py`. Before submitting, run `python scripts/validate.py --strict` so no pending quotes remain.

## Alert categories

| Category | Use when |
|---|---|
| **Hidden Condition** | A headline promise has a condition elsewhere in the source that changes its practical meaning (a cap, an exemption, a maximum, a delayed release, a "proposed" design). |
| **Contradiction** | Two statements conflict within one project's documents, or between its documents (for example whitepaper vs later announcement). Includes ambiguity where it is unclear which statement applies. State both and do not resolve. |
| **Missing Information** | A standard field in the priority list is not addressed at all (for example no vesting schedule, no lock terms, no platform-token terms). |
| **Question for Human Review** | Something needs a person, the project's own written clarification, or a primary source not yet seen: unresolved "Potentially equivalent" terms, unreviewed document sections, unverified addresses, unclear dates, unverified domains. |

## Field guide

| Field | Meaning |
|---|---|
| `category` | One of `burn`, `buyback`, `supply`, `allocation`, `team_vesting`, `liquidity_lock`, `fees_taxes`, `other` |
| `checkable_onchain` | `yes` = the promise can be verified from contract code, events or balances; `partial` = only some elements can; `no` = cannot (for example the token does not exist yet, or the promise is about an announcement) |
| `how_to_check` | Where to look: contract name and address, event name, explorer page. Addresses are those published by the project; confirm them independently on the explorer |
| `terminology_note` | Used only when a term is a "Potentially equivalent" call |

## Glossary

Definitions are general; each project's own definition wins for that project.

- **Allocation:** how a token supply is divided between groups (for example ecosystem, company, reserve).
- **Basis points (bps):** one hundredth of a percent. 100 bps = 1%; 10,000 bps = 100%.
- **Block explorer:** a website that shows contracts, transactions and token data for a chain. Read-only. Never connect a wallet or sign anything to use it for this work.
- **Burn:** permanently removing tokens from supply, usually by sending them to an address nobody controls or by a contract function that destroys them. A project's word for the same idea may differ ("remove", "retire"); check its definition.
- **Buyback:** using money (here, fees) to buy a project's own token on the market. A buyback does not by itself reduce supply; a buyback followed by a burn does.
- **Buyback and burn:** buying tokens and then burning them.
- **Chain ID:** a number identifying a blockchain network (for example Arc mainnet is stated as 5042 in the Tolly guide).
- **Circulating supply:** tokens that can currently be traded or moved. Not the same as total supply.
- **Cliff:** a period at the start of a vesting schedule during which nothing unlocks.
- **Contract address:** the on-chain address of a smart contract. Published addresses should be confirmed on the explorer.
- **Dead address:** an address with no known controlling key, used to hold burned tokens.
- **Fully diluted valuation (FDV):** token price multiplied by total supply. A calculated figure; it is not a promise.
- **Hook (Uniswap v4):** a contract attached to a pool that can run logic on swaps, for example charging a tax.
- **Inflation (token):** new tokens issued over time, for example to pay validators.
- **Initial supply:** the supply at the start. It is not the same as a fixed or maximum supply when inflation exists.
- **Interface fee:** a fee charged by an app or router for a trade, separate from the pool fee.
- **Liquidity lock:** liquidity-pool tokens or positions held in a contract so they cannot be withdrawn, either permanently or until a date. Check who can release them and when.
- **Liquidity pool (pool):** funds in a smart contract that allow a token to be swapped.
- **Mint:** create new tokens.
- **On-chain checkable:** see the field guide above.
- **Pool fee:** a percentage taken by the pool on each swap (for example 1%).
- **Presale:** a sale of tokens or rights to tokens before a public launch.
- **Protocol token / platform token:** the token of the platform itself, as opposed to tokens launched on the platform. Terms for one do not apply to the other.
- **Snipe tax:** an extra, short-lived tax at the start of trading intended to discourage immediate bot buying.
- **Supply (total):** all tokens that exist, including locked ones.
- **Swap tax / buy tax / sell tax:** a percentage taken on buys or sells of a token.
- **TGE (token generation event):** the moment a token is created or first distributed.
- **Unlock / release schedule:** when locked tokens become transferable.
- **Vesting:** releasing allocated tokens gradually over time, often after a cliff.

## Sources note

Each project file's `source_access` states how each source was read and what has to be checked against the original before the data is published. Contract addresses and page or line references taken from notes (not from the file itself) are marked as such and must be re-checked.
