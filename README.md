# BNPL Sandbox

A **deliberately-vulnerable** Buy-Now-Pay-Later (installment-checkout) demo app. It plants
three classes of defect in **one flow** so a scanner or autonomous agent can exercise all
three at once, and ships a **hardened secure twin** as the precision baseline.

> ⚠️ **Intentionally insecure.** Training / security-demo target only. Do not deploy on a
> public network or with real data.

## The three defect classes

| Class | Planted cases |
|---|---|
| **Security** | BOLA (read another user's plan), idempotency-replay (double-charge), negative-amount + client-set credit_limit (mass-assignment) |
| **QA validation** | accepts non-numeric amount, client-only national-ID validation, validation error that leaks DB internals |
| **Product friction** | redirect-to-unexpected after a valid checkout, dead-end confirmation page, MFA modal that re-loops on the correct code |

`SECURE=1` hardens every one of these — the secure twin must produce **zero** findings.

## Run

```bash
npm start                       # vulnerable target on :7483
npm run start:secure            # secure twin on :7484
npm run selftest                # prove the app matches its own /__truth.json

# or via Docker (both targets)
docker compose up --build
```

## Ground truth — `GET /__truth.json`

The app serves its own machine-readable ground truth. Each case declares its class,
how to trigger it, and the expected verdict on the vulnerable target (the secure twin
expects `secure` for every case). Any grader scores **recall** (vulnerable) and
**precision** (secure) against this one manifest — no per-tool convention.

```jsonc
{
  "case_id": "SEC-BOLA-installment",
  "vertex": "security",            // security | qa | friction
  "check": "bola",                  // how a grader classifies it
  "method": "GET", "path": "/api/installment/2", "as": "tok-alice",
  "expected_verdict": "vuln",       // vuln | leak | friction | crash | secure
  "expected_finding": "BOLA — reads another user's installment plan",
  "severity": "high", "cwe": "CWE-639"
}
```

Verdict enum: `vuln · leak · friction · crash · secure`.

## Test accounts

`Authorization: Bearer tok-alice` (user id 1) · `Bearer tok-bob` (user id 2). Installment
`1` belongs to alice, `2` to bob (the BOLA target).

## Pointing a scanner at it

It's an ordinary HTTP app — point any DAST tool or autonomous agent at
`http://localhost:7483` (and `:7484` for the clean baseline). The `/__truth.json` manifest
lets you score the tool's findings against ground truth across all three classes.
