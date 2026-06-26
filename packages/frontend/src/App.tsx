import { useState } from 'react';

const TOKEN = 'tok-alice'; // demo session (user "alice")

async function api(path: string, body: unknown) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return { status: res.status, json: JSON.parse(text) }; } catch { return { status: res.status, json: text }; }
}

export function App() {
  const [amount, setAmount] = useState('850');
  const [nationalId, setNationalId] = useState('29001011234567');
  const [phone, setPhone] = useState('+201000000000');
  const [email, setEmail] = useState('alice@example.com');
  const [otp, setOtp] = useState('');
  const [result, setResult] = useState<unknown>(null);

  const checkout = async () => setResult(await api('/api/checkout', { amount, national_id: nationalId, phone, email }));
  const verifyOtp = async () => setResult(await api('/api/mfa/verify', { code: otp }));

  const field = (label: string, value: string, set: (v: string) => void) => (
    <label style={{ display: 'block', margin: '8px 0' }}>
      {label}<br />
      <input value={value} onChange={(e) => set(e.target.value)} style={{ width: 280, padding: 6 }} />
    </label>
  );

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 460, margin: '40px auto' }}>
      <h1>BNPL — Installment Checkout</h1>
      <p style={{ color: '#b00' }}>⚠️ Deliberately-vulnerable demo. Do not use real data.</p>

      <section>
        <h2>Checkout</h2>
        {field('Amount (EGP)', amount, setAmount)}
        {field('National ID', nationalId, setNationalId)}
        {field('Phone', phone, setPhone)}
        {field('Email', email, setEmail)}
        <button onClick={checkout} style={{ padding: '8px 16px' }}>Pay in installments</button>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Confirm OTP</h2>
        {field('One-time code', otp, setOtp)}
        <button onClick={verifyOtp} style={{ padding: '8px 16px' }}>Verify</button>
      </section>

      {result != null && (
        <pre style={{ marginTop: 24, background: '#f4f4f4', padding: 12, overflow: 'auto' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
