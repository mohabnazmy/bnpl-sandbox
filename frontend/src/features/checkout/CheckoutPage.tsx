import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlanOption } from '../../types';
import { usePlans } from '../../hooks/usePlans';
import { useCheckout } from '../../hooks/useCheckout';
import { Card } from '../../ui/Card';
import { Money, formatMoney } from '../../ui/Money';

/** Converts an EGP string (major units) to minor units (piastres). */
function egpToMinor(egp: string): number | null {
  const value = Number(egp);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

export function CheckoutPage() {
  const navigate = useNavigate();

  const { plans, options, creditLimit, loading: loadingPlans, error: plansError, fetchPlans } =
    usePlans();
  const { submit, loading: submitting, error: checkoutError } = useCheckout();

  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [selected, setSelected] = useState<PlanOption | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // A local validation error takes precedence; otherwise surface whichever hook errored.
  const error = validationError ?? plansError ?? checkoutError;

  async function handleGetPlans(e: FormEvent) {
    e.preventDefault();
    setValidationError(null);
    setSelected(null);

    const minor = egpToMinor(amount);
    if (minor === null) {
      setValidationError('Enter a valid purchase amount in EGP.');
      return;
    }
    if (!merchant.trim()) {
      setValidationError('Enter the merchant name.');
      return;
    }

    await fetchPlans(minor);
  }

  async function handleConfirm() {
    if (!plans || !selected) return;
    setValidationError(null);
    const agreement = await submit(plans.amount, selected.months, merchant.trim());
    if (agreement) {
      navigate(`/agreements/${agreement.id}`);
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

      {plans && options.length > 0 && (
        <section className="section">
          <div className="plans-head">
            <h2 className="section-title">Choose a plan</h2>
            <span className="muted">
              Purchase <Money amount={plans.amount} /> · credit limit{' '}
              {creditLimit !== null ? formatMoney(creditLimit) : ''}
            </span>
          </div>

          <div className="plan-grid">
            {options.map((opt) => {
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
