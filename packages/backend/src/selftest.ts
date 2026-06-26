/*
 * selftest — proves the sandbox matches its own /__truth.json manifest.
 * Starts the vulnerable + secure apps in-process and checks:
 *   • vulnerable → every planted defect is observable (recall)
 *   • secure     → every defect class goes silent        (precision)
 * Run: npm run selftest   (exits 0 if both pass)
 */
import http from 'http';
import { createApp, TruthCase } from './server';

const VULN = 7483, SECURE = 7484;
type Verdict = string;

function req(port: number, method: string, p: string, opts: { headers?: Record<string, string>; body?: unknown } = {}): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve) => {
    const data = opts.body == null ? null : (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));
    const r = http.request({ host: 'localhost', port, path: p, method,
      headers: { ...(data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {}), ...(opts.headers || {}) } },
      (res) => { let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body: d })); });
    r.on('error', () => resolve({ status: 0, headers: {}, body: '' }));
    if (data) r.write(data); r.end();
  });
}
const auth = (t?: string) => ({ authorization: `Bearer ${t}` });
const hasForwardAction = (h: string) => /<a\s+[^>]*href|<button|<form/i.test(h || '');

function classifyQA(status: number, body: string): Verdict {
  const leak = /SQLITE|ORA-\d|at .+\.js:\d+|Traceback|Exception|stack|syntax error/i.test(body);
  if (status >= 500) return 'crash';
  const rejected = status >= 400 || (/\b(invalid|must be|required|reject|not allowed)\b/i.test(body) && !/accepted|"ok"\s*:\s*true/i.test(body));
  if (status >= 200 && status < 300 && !rejected) return 'vuln';
  if (leak) return 'leak';
  if (rejected) return 'secure';
  return 'vuln';
}
async function classify(port: number, c: TruthCase): Promise<Verdict> {
  switch (c.check) {
    case 'bola': { const r = await req(port, 'GET', c.path, { headers: auth(c.as) });
      if (r.status === 200) { try { if (JSON.parse(r.body).owner !== 1) return 'vuln'; } catch { /* */ } } return 'secure'; }
    case 'idempotency': { await req(port, 'POST', c.path, { headers: auth(c.as), body: {} });
      const b = await req(port, 'POST', c.path, { headers: auth(c.as), body: {} });
      let cnt: number | null = null; try { cnt = JSON.parse(b.body).charge_count; } catch { /* */ } return (cnt || 0) >= 2 ? 'vuln' : 'secure'; }
    case 'accepts-negative': { const r = await req(port, 'POST', c.path, { headers: auth(c.as), body: c.body });
      if (r.status >= 200 && r.status < 300) { try { if (Number(JSON.parse(r.body).accepted_amount) < 0) return 'vuln'; } catch { /* */ } } return 'secure'; }
    case 'qa-validation': { const r = await req(port, 'POST', c.path, { headers: auth(c.as), body: c.body }); return classifyQA(r.status, r.body); }
    case 'redirect-unexpected': { const r = await req(port, 'POST', c.path, { headers: auth(c.as), body: c.body });
      const loc = (r.headers.location as string) || ''; return (r.status >= 300 && r.status < 400 && loc && loc !== c.expected_landing) ? 'friction' : 'secure'; }
    case 'dead-end': { const r = await req(port, 'GET', c.path, { headers: auth(c.as) }); return (r.status === 200 && !hasForwardAction(r.body)) ? 'friction' : 'secure'; }
    case 'mfa-reloop': { const r = await req(port, 'POST', c.path, { headers: auth(c.as), body: c.body });
      try { const j = JSON.parse(r.body); if (j.verified === true) return 'secure'; if (j.challenge === true) return 'friction'; } catch { /* */ } return 'secure'; }
    default: return 'secure';
  }
}
async function ready(port: number) { for (let i = 0; i < 50; i++) { const r = await req(port, 'GET', '/__truth.json'); if (r.status === 200) return JSON.parse(r.body); await new Promise((s) => setTimeout(s, 50)); } throw new Error(`:${port} never up`); }

async function grade(port: number, secureMode: boolean) {
  const t = await ready(port); const rows: Array<{ vertex: string; id: string; expected: string; observed: string; ok: boolean }> = [];
  for (const c of t.cases as TruthCase[]) { const observed = await classify(port, c); const expected = secureMode ? 'secure' : c.expected_verdict; rows.push({ vertex: c.vertex, id: c.case_id, expected, observed, ok: observed === expected }); }
  return rows;
}
function report(title: string, rows: Array<{ vertex: string; id: string; expected: string; observed: string; ok: boolean }>) {
  console.log(`\n  ${title}`);
  for (const v of ['security', 'qa', 'friction']) { const rs = rows.filter((r) => r.vertex === v); const ok = rs.filter((r) => r.ok).length;
    console.log(`    ${v.padEnd(9)} ${ok}/${rs.length}`); for (const r of rs) console.log(`      ${r.ok ? '✓' : '✗'} ${r.id.padEnd(28)} expected=${r.expected.padEnd(9)} observed=${r.observed}`); }
  const ok = rows.filter((r) => r.ok).length; console.log(`    ── total ${ok}/${rows.length}`); return ok === rows.length;
}
async function main() {
  const vuln = createApp(false).listen(VULN);
  const sec = createApp(true).listen(SECURE);
  let green = false;
  try {
    const a = report('VULNERABLE — recall (planted defects must be observable):', await grade(VULN, false));
    const b = report('SECURE twin — precision (every class must go SILENT):', await grade(SECURE, true));
    console.log(`\n  SELFTEST: recall ${a ? 'PASS' : 'FAIL'} · precision ${b ? 'PASS' : 'FAIL'}`); green = a && b;
  } finally { vuln.close(); sec.close(); }
  process.exit(green ? 0 : 1);
}
main();
