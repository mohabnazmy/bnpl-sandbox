# BNPL

A Buy-Now-Pay-Later app — TypeScript monorepo with a **React** frontend and a
**Node / Express / Prisma (PostgreSQL)** backend. Production-structured starting point;
security test cases will be layered in over time and tracked separately.

## Monorepo layout

```
bnpl/
  docker-compose.yml       # PostgreSQL (:5439)
  package.json             # npm workspaces: backend · frontend
  backend/                 # Express + TypeScript + Prisma — hexagonal (ports & adapters)
    src/contract.ts        #   API contract types (money in minor units)
    prisma/schema.prisma   #   User · Agreement · Installment
    src/
      domain/              #   pure core: finance.ts, errors.ts, ports.ts (no Express/Prisma)
      application/         #   use-case services (depend on ports only)
      infrastructure/      #   adapters: prisma/ (repos), security/ (bcrypt, jwt), http/ (express)
      config.ts  index.ts  #   index.ts = composition root (wires adapters → ports)
  frontend/                # React + TypeScript + Vite — layered (api / hooks / pages / components)
    src/api               #   typed client — the only HTTP layer
    src/hooks             #   use-cases (useAuth, usePlans, useCheckout, useAgreements)
    src/pages             #   page components (one per route) — call hooks, never the api directly
    src/components        #   reusable UI (Money, Card, Nav); App.tsx (router), lib/, types.ts alongside
```

## Domain (thin slice)

Auth (register / login with JWT + bcrypt) · per-user **credit limit** · **installment plans**
(3 / 6 / 12 months, flat fee by term) · **checkout** that creates an **agreement** with a
generated repayment **schedule** · a **dashboard** of agreements and their installments.
All money is in **minor units** (piastres) with integer-only arithmetic.

## Run

```bash
npm install
npm run db:up                                  # start PostgreSQL (:5439)
npm run db:migrate --workspace=backend         # apply migrations + generate client
cp packages/backend/.env.example packages/backend/.env   # (already present in dev)

npm run dev:backend     # API on http://localhost:7483
npm run dev:frontend    # UI  on http://localhost:5173  (proxies /api → backend)
npm run build           # typecheck + build both packages
```

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | — | create account → `{token, user}` |
| POST | `/api/auth/login` | — | `{token, user}` |
| GET | `/api/auth/me` | ✓ | current user |
| GET | `/api/plans?amount=<minor>` | ✓ | installment options for an amount |
| POST | `/api/checkout` | ✓ | create an agreement (`{amount, months, merchant}`) |
| GET | `/api/agreements` | ✓ | list the user's agreements |
| GET | `/api/agreements/:id` | ✓ | agreement + repayment schedule |

## Stack

TypeScript · React 18 + Vite + React Router · Express · Prisma + PostgreSQL ·
zod (validation) · jsonwebtoken · bcryptjs · npm workspaces.
