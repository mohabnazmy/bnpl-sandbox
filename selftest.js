'use strict';
/*
 * selftest.js — proves the BNPL sandbox matches its OWN /__truth.json manifest.
 * Zero external dependencies (no scanner/agent needed). Boots the vulnerable
 * (:7483) and secure (:7484) targets, drives every case, and checks:
 *   • vulnerable target → every planted defect is observable (recall)
 *   • secure twin       → every defect class goes silent       (precision)
 *
 *   npm run selftest        # exits 0 if recall + precision both pass
 */
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const SERVER = path.join(__dirname, 'server.js');
const VULN = 7483, SECURE = 7484;

function req(port, method, p, { headers = {}, body } = {}) {
  return new Promise((resolve) => {
    const data = body == null ? null : (typeof body === 'string' ? body : JSON.stringify(body));
    const r = http.request({ host: 'localhost', port, path: p, method,
      headers: { ...(data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {}), ...headers } },
      (res) => { let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d })); });
    r.on('error', () => resolve({ status: 0, headers: {}, body: '' }));
    if (data) r.write(data); r.end();
  });
}
const auth = (t) => ({ authorization: `Bearer ${t}` });
const hasForwardAction = (h) => /<a\s+[^>]*href|<button|<form/i.test(h || '');

// Self-contained verdict classifiers (no external oracle).
function classifyQA(status, body) {
  const leak = /SQLITE|ORA-\d|at .+\.js:\d+|Traceback|Exception|stack|syntax error/i.test(body);
  if (status >= 500) return 'crash';
  const rejected = status >= 400 || (/\b(invalid|must be|required|reject|not allowed)\b/i.test(body) && !/accepted|"ok"\s*:\s*true/i.test(body));
  if (status >= 200 && status < 300 && !rejected) return 'vuln'; // accepted bad input
  if (leak) return 'leak';
  if (rejected) return 'secure';
  return 'vuln';
}
async function classify(port, c) {
  switch (c.check) {
    case 'bola': { const r = await req(port, 'GET', c.path, { headers: auth(c.as) });
      if (r.status === 200) { try { if (JSON.parse(r.body).owner !== 1) return 'vuln'; } catch (_) {} } return 'secure'; }
    case 'idempotency': { await req(port, 'POST', c.path, { headers: auth(c.as), body: {} });
      const b = await req(port, 'POST', c.path, { headers: auth(c.as), body: {} });
      let cnt = null; try { cnt = JSON.parse(b.body).charge_count; } catch (_) {} return cnt >= 2 ? 'vuln' : 'secure'; }
    case 'accepts-negative': { const r = await req(port, 'POST', c.path, { headers: auth(c.as), body: c.body });
      if (r.status >= 200 && r.status < 300) { try { if (Number(JSON.parse(r.body).accepted_amount) < 0) return 'vuln'; } catch (_) {} } return 'secure'; }
    case 'qa-validation': { const r = await req(port, 'POST', c.path, { headers: auth(c.as), body: c.body }); return classifyQA(r.status, r.body); }
    case 'redirect-unexpected': { const r = await req(port, 'POST', c.path, { headers: auth(c.as), body: c.body });
      const loc = r.headers.location || ''; return (r.status >= 300 && r.status < 400 && loc && loc !== c.expected_landing) ? 'friction' : 'secure'; }
    case 'dead-end': { const r = await req(port, 'GET', c.path, { headers: auth(c.as) }); return (r.status === 200 && !hasForwardAction(r.body)) ? 'friction' : 'secure'; }
    case 'mfa-reloop': { const r = await req(port, 'POST', c.path, { headers: auth(c.as), body: c.body });
      try { const j = JSON.parse(r.body); if (j.verified === true) return 'secure'; if (j.challenge === true) return 'friction'; } catch (_) {} return 'secure'; }
    default: return 'secure';
  }
}
async function ready(port) { for (let i = 0; i < 50; i++) { const r = await req(port, 'GET', '/__truth.json'); if (r.status === 200) return JSON.parse(r.body); await new Promise((s) => setTimeout(s, 100)); } throw new Error(`:${port} never up`); }

async function grade(port, secureMode) {
  const t = await ready(port); const rows = [];
  for (const c of t.cases) { const observed = await classify(port, c); const expected = secureMode ? 'secure' : c.expected_verdict; rows.push({ vertex: c.vertex, id: c.case_id, expected, observed, ok: observed === expected }); }
  return rows;
}
function report(title, rows) {
  console.log(`\n  ${title}`);
  for (const v of ['security', 'qa', 'friction']) { const rs = rows.filter((r) => r.vertex === v); const ok = rs.filter((r) => r.ok).length;
    console.log(`    ${v.padEnd(9)} ${ok}/${rs.length}`); for (const r of rs) console.log(`      ${r.ok ? '✓' : '✗'} ${r.id.padEnd(28)} expected=${r.expected.padEnd(9)} observed=${r.observed}`); }
  const ok = rows.filter((r) => r.ok).length; console.log(`    ── total ${ok}/${rows.length}`); return ok === rows.length;
}
async function main() {
  const v = spawn('node', [SERVER], { env: { ...process.env, PORT: String(VULN), SECURE: '0' }, stdio: 'ignore' });
  const s = spawn('node', [SERVER], { env: { ...process.env, PORT: String(SECURE), SECURE: '1' }, stdio: 'ignore' });
  let green = false;
  try {
    const a = report('VULNERABLE — recall (planted defects must be observable):', await grade(VULN, false));
    const b = report('SECURE twin — precision (every class must go SILENT):', await grade(SECURE, true));
    console.log(`\n  SELFTEST: recall ${a ? 'PASS' : 'FAIL'} · precision ${b ? 'PASS' : 'FAIL'}`); green = a && b;
  } finally { v.kill(); s.kill(); }
  process.exit(green ? 0 : 1);
}
main();
