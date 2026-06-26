# BNPL Sandbox

A **deliberately-vulnerable** Buy-Now-Pay-Later (installment-checkout) demo. TypeScript
monorepo: **React frontend + Node/Express backend**. It plants three classes of defect in
**one flow** so a scanner or autonomous agent can exercise all three at once, and ships a
**hardened secure twin** as the precision baseline.

> ⚠️ **Intentionally insecure.** Training / security-demo target only. Do not deploy on a
> public network or with real data.

## Monorepo layout

```
bnpl-sandbox/
  package.json            # npm workspaces
  tsconfig.base.json
  packages/
    backend/              # Node + Express + TypeScript — the vulnerable API + /__truth.json
      src/server.ts       #   createApp(secure) — vulnerable, or the hardened secure twin
      src/selftest.ts     #   in-process recall + precision check
    frontend/             # React + TypeScript + Vite — basic checkout UI
      src/App.tsx
```

## The three defect classes

| Class | Planted cases |
|---|---|
| **Security** | BOLA, idempotency-replay (double-charge), negative-amount + client-set credit_limit (mass-assign) |
| **QA validation** | accepts non-numeric amount, client-only national-ID validation, validation error that leaks DB internals |
| **Product friction** | redirect-to-unexpected after a valid checkout, dead-end confirmation, MFA modal that re-loops on the correct code |

`SECURE=1` hardens every one — the secure twin must produce **zero** findings.

## Run

```bash
npm install                 # installs all workspaces

npm run dev:backend         # vulnerable API on :7483
npm run start:secure        # secure twin on :7484
npm run dev:frontend        # React UI on :5173 (proxies /api → backend)

npm run selftest            # prove the app matches its own /__truth.json
npm run build               # typecheck + build both packages
```

## Ground truth — `GET /__truth.json`

The backend serves its own machine-readable ground truth: each case declares its class,
trigger, and expected verdict (the secure twin expects `secure` for every case). Any grader
scores **recall** (vulnerable) + **precision** (secure) against this one manifest.

Verdict enum: `vuln · leak · friction · crash · secure`.
Test accounts: `Bearer tok-alice` (id 1) · `Bearer tok-bob` (id 2); installment `1` is alice's, `2` is bob's (BOLA target).

## Pointing a scanner at it

Ordinary HTTP app — point any DAST tool or autonomous agent at `http://localhost:7483`
(and `:7484` for the clean baseline) and score its findings against `/__truth.json`.
