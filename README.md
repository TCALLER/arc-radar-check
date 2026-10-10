# Arc Radar Check - front-end test task

Test task for: front-end page for a pay-per-check token verification service on Arc.
Deadline: **Sunday 12 October 2026**
Budget: fixed price, max 3 hours ($90)

## What to build

One web page (Next.js) that:

1. Lets a user enter a token address on Arc mainnet (validate it as an EVM address before sending).
2. Calls the check endpoint and shows the result clearly for a non-technical user:
   verdict, holder distribution, burn/buyback verification and risk flags.
3. Lets the user connect a wallet on Arc mainnet and shows their USDC balance.
4. Shows a clear placeholder for the "Pay per check" button (the x402 payment flow is built by us).
5. Is mobile-first and works in light and dark mode.

Until the endpoint is live, work against the files in `samples/`. Make the endpoint URL configurable via an environment variable.

## States the page must handle

| Sample file | Situation |
|---|---|
| `samples/check-ok.json` | Normal result |
| `samples/check-hostile.json` | Hostile token metadata (must render safely) |
| `samples/check-error.json` | Error (e.g. token not found) |
| `samples/check-payment-required.json` | HTTP 402: payment required, show pay button placeholder |

Plus: loading state, network/timeout error, and wallet connected to the wrong network.

## Security rules (non-negotiable)

- **Every string in the response is untrusted**, including token name, symbol, holder labels, risk flag texts, summary and source labels.
- Render all strings as plain text. Never use `dangerouslySetInnerHTML` or equivalent.
- Only render links with an `https:` URL. Anything else (e.g. `javascript:`) is shown as plain text or dropped.
- Long strings must not break the layout (truncate with full value available on hover or tap).
- Invisible or direction-changing Unicode characters (e.g. U+202E) must not alter how other text displays.
- No keys, secrets or private RPC URLs in the code. Use environment variables and an `.env.example`.

## Arc mainnet configuration

| Setting | Value |
|---|---|
| Chain ID | 5042 (hex 0x13b2) |
| Gas / native currency | USDC (native balance uses 18 decimals) |
| USDC ERC-20 interface | 0x3600000000000000000000000000000000000000 (6 decimals) |
| Explorer | https://explorer.arc.io |
| RPC | via env var `NEXT_PUBLIC_ARC_RPC_URL` (public endpoints may be permissioned; use your own free endpoint for development) |

Show the USDC balance via the ERC-20 interface (6 decimals).
These values were collected from third-party documentation on 07/10/2026. Check them against the official Arc docs before relying on them.

## Response schema (v0.1)

| Field | Type | Notes |
|---|---|---|
| `status` | `ok` / `error` / `payment_required` | Drives which view to show |
| `sample` | boolean | `true` in all sample files; show a visible "Sample data" badge when true |
| `chain` | object | `name`, `chain_id` |
| `token` | object | `address`, `name`*, `symbol`*, `decimals`, `total_supply` (string) |
| `verdict` | object | `level` (`ok` / `caution` / `danger` / `unknown`), `score` (0-100), `headline`* |
| `holders` | object | `count`, `top10_share_pct`, `top_holders[]` (`address`, `share_pct`, `label`* or null) |
| `burns` | object | `claimed`, `verified`, `total_burned`, `burned_pct_of_supply`, `events[]` |
| `buybacks` | object | `claimed`, `verified`, `note`* or null |
| `risk_flags[]` | array | `code`, `severity` (`info` / `low` / `medium` / `high`), `title`*, `explanation`* |
| `summary` | string* | Plain-language summary |
| `sources[]` | array | `type`, `label`*, `url`* (only render as link if https) |
| `error` | object | Only when `status` is `error`: `code`, `message`* |
| `payment` | object | Only when `status` is `payment_required`: `price_usdc`, `network`, `chain_id` |

`*` = untrusted text. Large numbers are strings; do not convert them to JS numbers.

## Out of scope

- The x402 payment flow itself
- Backend, database, authentication
- Telegram Mini App wrapper (possible follow-up task)

## Acceptance criteria

- All four sample files render correctly, including the hostile one with nothing executing or breaking layout.
- Wallet connect works on Arc mainnet and shows the USDC balance, or a clear message on the wrong network.
- Lint and typecheck pass; a few tests cover safe rendering of the hostile sample.
- Clean, readable code with a short section in this README on how to run it.

## Delivery

Fork this repository and open a pull request. Code will be reviewed before merging.
This repository is public and may be published under an open-source license; rights to the delivered code transfer on payment.

## How to run

**Prerequisites:** Node.js 24 (see `.nvmrc`) and npm.

```bash
npm ci
cp .env.example .env.local   # then set NEXT_PUBLIC_ARC_RPC_URL (see below)
npm run dev                  # http://localhost:3000
```

### Environment

Every variable is listed in `.env.example` and validated in `src/common/config/env.ts`; the app stops with a clear message if one is missing or invalid. All of them are `NEXT_PUBLIC_*`, so they are public: never put a secret in them.

| Variable | What it does |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the check and access API |
| `NEXT_PUBLIC_API_MOCKING` | `enabled`: Mock Service Worker serves the files in `samples/` (unchanged) and a mocked `/v1/access`. `disabled`: real API |
| `NEXT_PUBLIC_AUTH_MOCKING` | `enabled`: the Telegram name is read from `initData` for display only |
| `NEXT_PUBLIC_ARC_RPC_URL` | Arc mainnet RPC, used for the USDC balance. Required, no fallback |
| `NEXT_PUBLIC_CHECK_PRICE_USDC` | Price on the Pay button of a locked full report (that response has no price). Empty shows "Pay per check" |

Switching to the live API needs no code change: set `NEXT_PUBLIC_API_MOCKING=disabled` and `NEXT_PUBLIC_API_BASE_URL`, then rebuild.

### Trying the samples (mock mode)

| Token address | Response |
|---|---|
| `0x1111111111111111111111111111111111111111` | `check-ok.json` |
| `0x7777777777777777777777777777777777777777` | `check-hostile.json` |
| `0x0000000000000000000000000000000000000402` | `check-payment-required.json` (HTTP 402) |
| `0x0000000000000000000000000000000000000408` | Never answers, so the 15 s timeout shows |
| Any other valid address | `check-error.json` |

In mock mode the mocked `/v1/access` answers "holder" only when the page link has `?holder=true`: the full report unlocks after Connect wallet. A plain link (or any other value) answers "not a holder", so the report stays locked with the Pay button. Copy link and Open in browser keep the parameter.

A link with `?token=0x…` opens with that check already running; Copy link and Open in browser add it, so the check carries over to the wallet's browser.

In mock mode, `?state=<id>` opens a screen state directly, e.g. `/?state=hostile`. Ids: `idle`, `invalid`, `scanning`, `error`, `timeout`, `payment402`, `locked`, `connecting`, `checking`, `notHolder`, `failed`, `wrongNet`, `noWallet`, `holder`, `hostile`.

### Wallet

Connect wallet uses the browser's injected wallet (e.g. MetaMask) and offers to switch to, or add, Arc mainnet (chain 5042). The USDC balance is read through the ERC-20 interface (6 decimals). On a phone without a wallet the page explains how to open it in the wallet app's browser.

### Telegram Mini App

Create a bot with @BotFather and set its menu button (or a Mini App) URL to the HTTPS address of the page. Open the page with that button: a plain link in a chat opens Telegram's in-app browser, which sends no `initData`, so the page shows the normal web view.

### Checks

```bash
npm run check          # format, lint, typecheck, unit and component tests
npm run test:coverage  # tests with 80% coverage thresholds
npm run test:e2e       # Playwright on a production build (phone + desktop, axe)
npm run build          # production build
```

CI (`.github/workflows/ci.yml`) runs all of these on every push and pull request.

## Deferred work

Built as placeholders or mocks, to be done on the server side:

- **Telegram `initData` validation.** The name is display only and never trusted (`TODO(server)` in `src/common/context/identity/auth-service.ts`).
- **Real holder check.** `/v1/access` is mocked; the page only shows what the server answers. An address alone proves nothing, so the server will need a wallet signature.
- **x402 payment.** The Pay button is a placeholder (`TODO(x402)`), with one hook point that unlocks the report once payment completes.
- **Locked fields on the server.** With mock data the full report reaches the browser, so the lock is a display gate, not security. The server should leave locked fields out until access is granted; the page already shows missing fields as locked.
- **WalletConnect.** Not included; only injected wallets are supported.
- **Live API.** Everything runs on the samples until the endpoint is shared.
