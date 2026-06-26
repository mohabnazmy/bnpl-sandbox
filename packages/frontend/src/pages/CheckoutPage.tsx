import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlansResponse, PlanOption } from '@bnpl/shared';
import * as api from '../api/client';
import { ApiRequestError } from '../api/client';
import { Card } from '../components/Card';
import { Money, formatMoney } from '../components/Money';

/** Converts an EGP string (major units) to minor units (piastres). */
function egpToMinor(egp: string): number | null {
  const value = Number(egp);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

export function CheckoutPage() {
  const navigate = useNavigate();

  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [plans, setPlans] = useState<PlansResponse | null>(null);
  const [selected, setSelected] = useState<PlanOption | null>(null);

  const [loadingPlans, setLoadingPlans] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGetPlans(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPlans(null);
    setSelected(null);

    const minor = egpToMinor(amount);
    if (minor === null) {
      setError('Enter a valid purchase amount in EGP.');
      return;
    }
    if (!merchant.trim()) {
      setError('Enter the merchant name.');
      return;
    }

    setLoadingPlans(true);
    try {
      const res = await api.getPlans(minor);
      setPlans(res);
      if (res.options.length === 0) {
        setError('No installment plans are available for this amount.');
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not load plans.');
    } finally {
      setLoadingPlans(false);
    }
  }

  async function handleConfirm() {
    if (!plans || !selected) return;
    setError(null);
    setSubmitting(true);
    try {
      const { agreement } = await api.checkout({
        amount: plans.amount,
        months: selected.months,
        merchant: merchant.trim(),
      });
      navigate(`/agreements/${agreement.id}`);
    } catch (err) {
      // Over-credit-limit and validation errors arrive as ApiRequestError.
      setError(err instanceof ApiRequestError ? err.message : 'Checkout failed.');
      setSubmitting(false);
    }
  }

  return (
    <div className="checkout">
      <h1 className="page-title">New purchase</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <Card className="checkout-form-card">
        <form onSubmit={handleGetPlans} className="form form-row">
          <label className="field">
            <span className="field-label">Amount (EGP)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Merchant</span>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g. TechStore"
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loadingPlans}>
            {loadingPlans ? 'Loading…' : 'See plans'}
          </button>
        </form>
      </Card>

      {plans && plans.options.length > 0 && (
        <section className="section">
          <div className="plans-head">
            <h2 className="section-title">Choose a plan</h2>
            <span className="muted">
              Purchase <Money amount={plans.amount} /> · credit limit{' '}
              {formatMoney(plans.creditLimit)}
            </span>
          </div>

          <div className="plan-grid">
            {plans.options.map((opt) => {
              const isSelected = selected?.months === opt.months;
              return (
                <Card
                  key={opt.months}
                  className={`plan-card ${isSelected ? 'plan-card-selected' : ''}`}
                  onClick={() => setSelected(opt)}
                >
                  <div className="plan-months">{opt.months} months</div>
                  <div className="plan-monthly">
                    <Money amount={opt.monthlyAmount} />
                    <span className="plan-monthly-sub">/ month</span>
                  </div>
                  <dl className="plan-detail">
                    <div>
                      <dt>Total payable</dt>
                      <dd>
                        <Money amount={opt.totalPayable} />
                      </dd>
                    </div>
                    <div>
                      <dt>Fee</dt>
                      <dd>{(opt.feeRate * 100).toFixed(1)}%</dd>
                    </div>
                  </dl>
                  {isSelected && <div className="plan-selected-tag">Selected</div>}
                </Card>
              );
            })}
          </div>

          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleConfirm}
            disabled={!selected || submitting}
          >
            {submitting
              ? 'Creating agreement…'
              : selected
                ? `Confirm ${selected.months}-month plan`
                : 'Select a plan to continue'}
          </button>
        </section>
      )}
    </div>
  );
}
