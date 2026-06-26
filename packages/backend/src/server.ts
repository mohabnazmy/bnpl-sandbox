/*
 * bnpl-sandbox backend — deliberately-vulnerable BNPL API (Express + TypeScript).
 *
 * ⚠️  INTENTIONALLY INSECURE. Training / security-demo target only.
 *
 * Plants three defect classes in one installment-checkout flow:
 *   • SECURITY  — BOLA, idempotency-replay, negative-amount/mass-assign
 *   • QA        — input-validation traps (accept-invalid, client-only, reject-leak)
 *   • FRICTION  — redirect-to-unexpected, dead-end, MFA modal re-loop
 *
 * `createApp(true)` returns the hardened SECURE twin (every defect goes silent).
 * Ground truth is served at GET /__truth.json. Env: PORT, SECURE=1.
 */
import express, { Express, Request, Response } from 'express';

export type Vertex = 'security' | 'qa' | 'friction';
export interface TruthCase {
  case_id: string; vertex: Vertex; check: string;
  method: string; path: string; as?: string; body?: Record<string, unknown>;
  field?: string; perturbation?: string; expected_landing?: string;
  expected_verdict: 'vuln' | 'leak' | 'friction' | 'crash' | 'secure';
  expected_finding: string; severity: string; cwe?: string;
}

const USERS: Record<string, { id: number; name: string }> = {
  'tok-alice': { id: 1, name: 'alice' }, 'tok-bob': { id: 2, name: 'bob' },
};
const INSTALLMENTS: Record<string, { id: number; owner: number; plan: string; remaining: number; monthly: number }> = {
  '1': { id: 1, owner: 1, plan: 'iPhone 15 — 12mo', remaining: 5, monthly: 850 },
  '2': { id: 2, owner: 2, plan: 'MacBook Air — 24mo', remaining: 18, monthly: 1900 }, // bob's — BOLA target
};

export function buildTruth(secure: boolean): { target: string; flow: string; secure_mode: boolean; verdict_enum: string[]; cases: TruthCase[] } {
  return {
    target: 'bnpl-sandbox', flow: 'bnpl-installment-checkout', secure_mode: secure,
    verdict_enum: ['vuln', 'leak', 'friction', 'crash', 'secure'],
    cases: [
      { case_id: 'SEC-BOLA-installment', vertex: 'security', check: 'bola', method: 'GET', path: '/api/installment/2', as: 'tok-alice',
        expected_verdict: 'vuln', expected_finding: "BOLA — reads another user's installment plan", severity: 'high', cwe: 'CWE-639' },
      { case_id: 'SEC-IDEMPOTENCY-replay', vertex: 'security', check: 'idempotency', method: 'POST', path: '/api/installment/1/pay', as: 'tok-alice',
        expected_verdict: 'vuln', expected_finding: 'Payment replay — no idempotency key, double-charges', severity: 'high', cwe: 'CWE-837' },
      { case_id: 'SEC-NEGAMOUNT-massassign', vertex: 'security', check: 'accepts-negative', method: 'POST', path: '/api/checkout', as: 'tok-alice',
        body: { amount: -500, credit_limit: 999999, national_id: '29001011234567', phone: '+201000000000', email: 'a@b.co' },
        expected_verdict: 'vuln', expected_finding: 'Negative amount + client-set credit_limit accepted (mass-assignment)', severity: 'high', cwe: 'CWE-20' },
      { case_id: 'QA-amount-nonnumeric', vertex: 'qa', check: 'qa-validation', field: 'amount', perturbation: 'non-numeric-amount', method: 'POST', path: '/api/checkout', as: 'tok-alice',
        body: { amount: 'abc', national_id: '29001011234567', phone: '+201000000000', email: 'a@b.co' },
        expected_verdict: 'vuln', expected_finding: 'Accepts non-numeric amount', severity: 'high', cwe: 'CWE-20' },
      { case_id: 'QA-nationalid-clientonly', vertex: 'qa', check: 'qa-validation', field: 'national_id', perturbation: 'short-national-id', method: 'POST', path: '/api/checkout', as: 'tok-alice',
        body: { amount: 850, national_id: '12', phone: '+201000000000', email: 'a@b.co' },
        expected_verdict: 'vuln', expected_finding: 'Client-only validation — accepts malformed national ID', severity: 'medium', cwe: 'CWE-20' },
      { case_id: 'QA-phone-rejectleak', vertex: 'qa', check: 'qa-validation', field: 'phone', perturbation: 'injection-phone', method: 'POST', path: '/api/checkout', as: 'tok-alice',
        body: { amount: 850, national_id: '29001011234567', phone: "'||(SELECT 1)||'", email: 'a@b.co' },
        expected_verdict: 'leak', expected_finding: 'Validation error leaks DB internals', severity: 'medium', cwe: 'CWE-209' },
      { case_id: 'FR-redirect-unexpected', vertex: 'friction', check: 'redirect-unexpected', method: 'POST', path: '/checkout/submit', as: 'tok-alice',
        body: { amount: 850, national_id: '29001011234567', phone: '+201000000000', email: 'a@b.co' }, expected_landing: '/confirmation',
        expected_verdict: 'friction', expected_finding: 'After a valid checkout the user lands on an unrelated page', severity: 'low' },
      { case_id: 'FR-deadend-confirmation', vertex: 'friction', check: 'dead-end', method: 'GET', path: '/confirmation', as: 'tok-alice',
        expected_verdict: 'friction', expected_finding: 'Confirmation page is a dead end — no forward action', severity: 'low' },
      { case_id: 'FR-mfa-reloop', vertex: 'friction', check: 'mfa-reloop', method: 'POST', path: '/api/mfa/verify', as: 'tok-alice', body: { code: '123456' },
        expected_verdict: 'friction', expected_finding: 'Correct OTP re-challenges — modal re-loop', severity: 'low' },
    ],
  };
}

const isNum = (v: unknown): boolean => typeof v === 'number' || (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim()));

export function createApp(secure: boolean): Express {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const charges: Record<string, number> = {};
  const seenKeys = new Set<string>();
  const caller = (req: Request) => USERS[(req.headers.authorization || '').replace(/^Bearer\s+/i, '')] || null;

  app.get('/__truth.json', (_req, res) => res.json(buildTruth(secure)));
  app.get('/', (_req, res) => res.type('html').send('<h1>BNPL sandbox API</h1><p>See GET /__truth.json. Frontend runs separately (Vite).</p>'));

  // SECURITY: BOLA on installment read
  app.get('/api/installment/:id', (req: Request, res: Response) => {
    const me = caller(req); if (!me) return res.status(401).json({ error: 'auth required' });
    const inst = INSTALLMENTS[req.params.id]; if (!inst) return res.status(404).json({ error: 'not found' });
    if (secure && inst.owner !== me.id) return res.status(403).json({ error: 'forbidden' }); // FIX: ownership check
    return res.json(inst); // VULN: no ownership check
  });

  // SECURITY: idempotency / payment replay
  app.post('/api/installment/:id/pay', (req: Request, res: Response) => {
    const me = caller(req); if (!me) return res.status(401).json({ error: 'auth required' });
    const id = req.params.id;
    if (secure) { // FIX: require + dedupe an idempotency key
      const key = req.headers['idempotency-key'] as string | undefined;
      if (!key) return res.status(400).json({ error: 'Idempotency-Key required' });
      if (seenKeys.has(key)) return res.json({ charged: false, idempotent: true, charge_count: charges[id] || 0 });
      seenKeys.add(key);
    }
    charges[id] = (charges[id] || 0) + 1;
    return res.json({ charged: true, txn: `txn_${id}_${charges[id]}`, charge_count: charges[id] }); // VULN: replay double-charges
  });

  // SECURITY (neg amount / mass-assign) + QA (field validation)
  app.post('/api/checkout', (req: Request, res: Response) => {
    const me = caller(req); if (!me) return res.status(401).json({ error: 'auth required' });
    const b = (req.body || {}) as Record<string, any>;
    // QA: phone injection → leak (vuln) vs clean reject (secure)
    if (typeof b.phone === 'string' && /[''";|]/.test(b.phone) && !/^\+?\d[\d\s-]+$/.test(b.phone)) {
      if (secure) return res.status(400).json({ error: 'invalid phone format' });
      return res.status(400).type('text').send(
        `Invalid input. Error: SQLITE_ERROR: unrecognized token near "${b.phone}"\n    at Database.run (/app/lib/db.js:42:17)\n    at processPayment (/app/routes/checkout.js:88)`);
    }
    // QA: national_id must be 14 digits (Egypt); client-only in vuln
    if (b.national_id != null && !/^\d{14}$/.test(String(b.national_id))) {
      if (secure) return res.status(400).json({ error: 'national_id must be 14 digits' });
      // VULN: server accepts (client-only validation) — fall through
    }
    // QA: amount numeric; SECURITY: amount > 0, credit_limit server-owned
    if (!isNum(b.amount)) {
      if (secure) return res.status(400).json({ error: 'amount must be a number' });
      return res.json({ ok: true, accepted_amount: b.amount, note: 'queued' }); // VULN: non-numeric
    }
    const amt = Number(b.amount);
    if (amt <= 0) {
      if (secure) return res.status(400).json({ error: 'amount must be positive' });
      return res.json({ ok: true, accepted_amount: amt, credit_limit: b.credit_limit, note: 'refund-as-purchase' }); // VULN: negative + mass-assign
    }
    const credit = secure ? 50000 : (b.credit_limit != null ? b.credit_limit : 50000); // VULN: honors client credit_limit
    return res.json({ ok: true, accepted_amount: amt, credit_limit: credit });
  });

  // FRICTION: redirect-to-unexpected after a valid checkout
  app.post('/checkout/submit', (_req: Request, res: Response) => {
    res.redirect(302, secure ? '/confirmation' : '/promo'); // VULN: dumps the user on an unrelated promo page
  });
  app.get('/promo', (_req, res) => res.type('html').send('<h1>🎉 Special offer!</h1><p>Check out our new cards.</p>'));

  // FRICTION: dead-end confirmation page
  app.get('/confirmation', (_req, res) => {
    if (secure) return res.type('html').send('<h1>Payment confirmed</h1><a href="/dashboard">Back to dashboard</a> <a href="/checkout">New purchase</a>');
    return res.type('html').send('<h1>Payment confirmed</h1><p>Reference #A-1029. Thank you.</p>'); // VULN: dead end
  });

  // FRICTION: MFA modal re-loop
  app.post('/api/mfa/verify', (req: Request, res: Response) => {
    const ok = String((req.body || {}).code) === '123456';
    if (!ok) return res.json({ verified: false, challenge: true, error: 'wrong code' });
    if (secure) return res.json({ verified: true, challenge: false }); // FIX
    return res.json({ verified: false, challenge: true, note: 're-enter your code' }); // VULN: re-loops
  });

  return app;
}

if (require.main === module) {
  const secure = process.env.SECURE === '1';
  const port = parseInt(process.env.PORT || '7483', 10);
  createApp(secure).listen(port, () => console.log(`[bnpl-sandbox] ${secure ? 'SECURE' : 'VULNERABLE'} on :${port} — GET /__truth.json`));
}
