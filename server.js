'use strict';
/*
 * bnpl-sandbox — deliberately-vulnerable BNPL (Buy-Now-Pay-Later) demo app.
 *
 * ⚠️  INTENTIONALLY INSECURE. Training / security-demo target only.
 *     Do NOT deploy on a public network or with real data.
 *
 * One flow (installment checkout) plants, from a SINGLE traversal, cases across
 * three defect classes — so a scanner/agent can exercise all three at once:
 *   • SECURITY  — BOLA, idempotency-replay, negative-amount/mass-assign
 *   • QA        — input-validation traps (accept-invalid, client-only, reject-leak)
 *   • FRICTION  — redirect-to-unexpected, dead-end, MFA modal re-loop
 *
 * `SECURE=1` hardens every planted case → the secure twin / precision baseline
 * (every defect class must go SILENT). Same routes, hardened implementations.
 *
 * Ground truth is served live at GET /__truth.json — one machine-readable
 * manifest declaring every case's class, trigger, and expected verdict, so any
 * grader can score recall (vulnerable) + precision (secure). Zero dependencies.
 *
 *   PORT=7483 node server.js              # vulnerable
 *   PORT=7484 SECURE=1 node server.js     # secure twin
 *   npm run selftest                      # prove the app matches its own manifest
 */
const http = require('http');
const { URL } = require('url');

const SECURE = process.env.SECURE === '1';
const PORT = parseInt(process.env.PORT || '7483', 10);

// ---- in-memory state (resets per process) --------------------------------
const USERS = { 'tok-alice': { id: 1, name: 'alice' }, 'tok-bob': { id: 2, name: 'bob' } };
const INSTALLMENTS = {
  1: { id: 1, owner: 1, plan: 'iPhone 15 — 12mo', remaining: 5, monthly: 850 },
  2: { id: 2, owner: 2, plan: 'MacBook Air — 24mo', remaining: 18, monthly: 1900 }, // bob's (BOLA target)
};
const charges = {};   // installmentId -> count (idempotency)
const seenKeys = new Set();

// ---- the unified ground-truth manifest -----------------------------------
// vertex ∈ security|qa|friction ; check tells the grader HOW to classify ;
// expected_verdict is for the VULNERABLE target (secure twin ⇒ all 'secure').
const TRUTH = {
  target: 'valu-sandbox', flow: 'bnpl-installment-checkout', secure_mode: SECURE,
  verdict_enum: ['vuln', 'leak', 'friction', 'crash', 'secure'],
  cases: [
    // ---- SECURITY ----
    { case_id: 'SEC-BOLA-installment', vertex: 'security', check: 'bola',
      method: 'GET', path: '/api/installment/2', as: 'tok-alice',
      expected_verdict: 'vuln', expected_finding: 'BOLA — reads another user\'s installment plan',
      severity: 'high', cwe: 'CWE-639' },
    { case_id: 'SEC-IDEMPOTENCY-replay', vertex: 'security', check: 'idempotency',
      method: 'POST', path: '/api/installment/1/pay', as: 'tok-alice',
      expected_verdict: 'vuln', expected_finding: 'Payment replay — no idempotency key, double-charges',
      severity: 'high', cwe: 'CWE-837' },
    { case_id: 'SEC-NEGAMOUNT-massassign', vertex: 'security', check: 'accepts-negative',
      method: 'POST', path: '/api/checkout', as: 'tok-alice',
      body: { amount: -500, credit_limit: 999999, national_id: '29001011234567', phone: '+201000000000', email: 'a@b.co' },
      expected_verdict: 'vuln', expected_finding: 'Negative amount + client-set credit_limit accepted (mass-assignment)',
      severity: 'high', cwe: 'CWE-20' },
    // ---- QA VALIDATION ----
    { case_id: 'QA-amount-nonnumeric', vertex: 'qa', check: 'qa-validation', field: 'amount', perturbation: 'non-numeric-amount',
      method: 'POST', path: '/api/checkout', as: 'tok-alice',
      body: { amount: 'abc', national_id: '29001011234567', phone: '+201000000000', email: 'a@b.co' },
      expected_verdict: 'vuln', expected_finding: 'Accepts non-numeric amount', severity: 'high', cwe: 'CWE-20' },
    { case_id: 'QA-nationalid-clientonly', vertex: 'qa', check: 'qa-validation', field: 'national_id', perturbation: 'short-national-id',
      method: 'POST', path: '/api/checkout', as: 'tok-alice',
      body: { amount: 850, national_id: '12', phone: '+201000000000', email: 'a@b.co' },
      expected_verdict: 'vuln', expected_finding: 'Client-only validation — accepts malformed national ID', severity: 'medium', cwe: 'CWE-20' },
    { case_id: 'QA-phone-rejectleak', vertex: 'qa', check: 'qa-validation', field: 'phone', perturbation: 'injection-phone',
      method: 'POST', path: '/api/checkout', as: 'tok-alice',
      body: { amount: 850, national_id: '29001011234567', phone: "'||(SELECT 1)||'", email: 'a@b.co' },
      expected_verdict: 'leak', expected_finding: 'Validation error leaks DB internals', severity: 'medium', cwe: 'CWE-209' },
    // ---- FRICTION ----
    { case_id: 'FR-redirect-unexpected', vertex: 'friction', check: 'redirect-unexpected',
      method: 'POST', path: '/checkout/submit', as: 'tok-alice',
      body: { amount: 850, national_id: '29001011234567', phone: '+201000000000', email: 'a@b.co' },
      expected_landing: '/confirmation',
      expected_verdict: 'friction', expected_finding: 'After a valid checkout the user lands on an unrelated page', severity: 'low' },
    { case_id: 'FR-deadend-confirmation', vertex: 'friction', check: 'dead-end',
      method: 'GET', path: '/confirmation', as: 'tok-alice',
      expected_verdict: 'friction', expected_finding: 'Confirmation page is a dead end — no forward action', severity: 'low' },
    { case_id: 'FR-mfa-reloop', vertex: 'friction', check: 'mfa-reloop',
      method: 'POST', path: '/api/mfa/verify', as: 'tok-alice', body: { code: '123456' },
      expected_verdict: 'friction', expected_finding: 'Correct OTP re-challenges — modal re-loop', severity: 'low' },
  ],
};

// ---- helpers -------------------------------------------------------------
function send(res, status, obj, headers = {}) {
  const body = typeof obj === 'string' ? obj : JSON.stringify(obj);
  res.writeHead(status, { 'content-type': typeof obj === 'string' ? 'text/html' : 'application/json', ...headers });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve) => {
    let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => {
      if (!d) return resolve({});
      try { return resolve(JSON.parse(d)); } catch (_) {}
      const o = {}; for (const kv of d.split('&')) { const [k, v] = kv.split('='); if (k) o[decodeURIComponent(k)] = decodeURIComponent(v || ''); }
      resolve(o);
    });
  });
}
function caller(req) { const a = (req.headers.authorization || '').replace(/^Bearer\s+/i, ''); return USERS[a] || null; }
const isNum = (v) => typeof v === 'number' || (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim()));

// ---- server --------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  const p = u.pathname, m = req.method;

  if (p === '/__truth.json') return send(res, 200, TRUTH);
  if (p === '/' ) return send(res, 200, '<h1>valU sandbox</h1><a href="/checkout">Start installment checkout</a>');
  if (p === '/checkout') return send(res, 200, '<form action="/checkout/submit" method="post"><input name="amount"><input name="national_id"><input name="phone"><input name="email"><button>Pay</button></form>');

  // ---- SECURITY: BOLA on installment read ----
  let mInst = /^\/api\/installment\/(\d+)$/.exec(p);
  if (mInst && m === 'GET') {
    const me = caller(req); if (!me) return send(res, 401, { error: 'auth required' });
    const inst = INSTALLMENTS[mInst[1]]; if (!inst) return send(res, 404, { error: 'not found' });
    if (SECURE && inst.owner !== me.id) return send(res, 403, { error: 'forbidden' }); // FIX: ownership check
    return send(res, 200, inst); // VULN: no ownership check → returns any user's plan
  }

  // ---- SECURITY: idempotency / payment replay ----
  let mPay = /^\/api\/installment\/(\d+)\/pay$/.exec(p);
  if (mPay && m === 'POST') {
    const me = caller(req); if (!me) return send(res, 401, { error: 'auth required' });
    const id = mPay[1];
    if (SECURE) { // FIX: require + dedupe an idempotency key
      const key = req.headers['idempotency-key'];
      if (!key) return send(res, 400, { error: 'Idempotency-Key required' });
      if (seenKeys.has(key)) return send(res, 200, { charged: false, idempotent: true, charge_count: charges[id] || 0 });
      seenKeys.add(key);
    }
    charges[id] = (charges[id] || 0) + 1;
    return send(res, 200, { charged: true, txn: `txn_${id}_${charges[id]}`, charge_count: charges[id] }); // VULN: replay double-charges
  }

  // ---- SECURITY (neg amount/mass-assign) + QA (field validation) ----
  if (p === '/api/checkout' && m === 'POST') {
    const me = caller(req); if (!me) return send(res, 401, { error: 'auth required' });
    const b = await readBody(req);
    // QA: phone injection → leak (vuln) vs clean reject (secure)
    if (typeof b.phone === 'string' && /[''";|]/.test(b.phone) && !/^\+?\d[\d\s-]+$/.test(b.phone)) {
      if (SECURE) return send(res, 400, { error: 'invalid phone format' }); // FIX: clean reject
      // VULN: rejects (4xx) but the error message LEAKS DB internals (classic reject-leak, not a crash)
      return send(res, 400, `Invalid input. Error: SQLITE_ERROR: unrecognized token near "${b.phone}"\n    at Database.run (/app/lib/db.js:42:17)\n    at processPayment (/app/routes/checkout.js:88)`);
    }
    // QA: national_id must be 14 digits (Egypt) ; client-only in vuln
    if (b.national_id != null && !/^\d{14}$/.test(String(b.national_id))) {
      if (SECURE) return send(res, 400, { error: 'national_id must be 14 digits' }); // FIX
      // VULN: server accepts (client-only validation) — fall through
    }
    // QA: amount must be numeric ; SECURITY: amount must be > 0, credit_limit server-owned
    if (!isNum(b.amount)) {
      if (SECURE) return send(res, 400, { error: 'amount must be a number' }); // FIX
      return send(res, 200, { ok: true, accepted_amount: b.amount, note: 'queued' }); // VULN: accepts non-numeric
    }
    const amt = Number(b.amount);
    if (amt <= 0) {
      if (SECURE) return send(res, 400, { error: 'amount must be positive' }); // FIX
      return send(res, 200, { ok: true, accepted_amount: amt, credit_limit: b.credit_limit, note: 'refund-as-purchase' }); // VULN: negative + mass-assign
    }
    const credit = SECURE ? 50000 : (b.credit_limit != null ? b.credit_limit : 50000); // VULN: honors client credit_limit
    return send(res, 200, { ok: true, accepted_amount: amt, credit_limit: credit });
  }

  // ---- FRICTION: redirect-to-unexpected after a valid checkout ----
  if (p === '/checkout/submit' && m === 'POST') {
    await readBody(req);
    const dest = SECURE ? '/confirmation' : '/promo'; // VULN: dumps the user on an unrelated promo page
    return send(res, 302, '', { location: dest });
  }
  if (p === '/promo') return send(res, 200, '<h1>🎉 Special offer!</h1><p>Check out our new cards.</p>'); // dead-ish unrelated page

  // ---- FRICTION: dead-end confirmation page ----
  if (p === '/confirmation') {
    if (SECURE) return send(res, 200, '<h1>Payment confirmed</h1><a href="/dashboard">Back to dashboard</a> <a href="/checkout">New purchase</a>'); // FIX: forward actions
    return send(res, 200, '<h1>Payment confirmed</h1><p>Reference #A-1029. Thank you.</p>'); // VULN: no next action — dead end
  }

  // ---- FRICTION: MFA modal re-loop ----
  if (p === '/api/mfa/verify' && m === 'POST') {
    const b = await readBody(req);
    const ok = String(b.code) === '123456';
    if (!ok) return send(res, 200, { verified: false, challenge: true, error: 'wrong code' });
    if (SECURE) return send(res, 200, { verified: true, challenge: false }); // FIX: accept the correct code
    return send(res, 200, { verified: false, challenge: true, note: 're-enter your code' }); // VULN: re-loops despite correct code
  }

  return send(res, 404, { error: 'not found' });
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`[bnpl-sandbox] ${SECURE ? 'SECURE' : 'VULNERABLE'} on :${PORT} — GET /__truth.json (${TRUTH.cases.length} cases)`));
}

module.exports = { TRUTH };
