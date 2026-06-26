import { useState, useCallback } from 'react';
import type { PlansResponse, PlanOption } from '../types';
import * as api from '../api/client';
import { ApiRequestError } from '../api/client';

interface UsePlansResult {
  /** The full server response (carries the server-normalized `amount`), or null until fetched. */
  plans: PlansResponse | null;
  options: PlanOption[];
  creditLimit: number | null;
  loading: boolean;
  error: string | null;
  /** Fetch installment plans for an amount in minor units (piastres). */
  fetchPlans: (amount: number) => Promise<void>;
}

/** Use-case hook wrapping the plans endpoint; owns its own loading/error/data. */
export function usePlans(): UsePlansResult {
  const [plans, setPlans] = useState<PlansResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async (amount: number) => {
    setError(null);
    setPlans(null);
    setLoading(true);
    try {
      const res = await api.getPlans(amount);
      setPlans(res);
      if (res.options.length === 0) {
        setError('No installment plans are available for this amount.');
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not load plans.');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    plans,
    options: plans?.options ?? [],
    creditLimit: plans?.creditLimit ?? null,
    loading,
    error,
    fetchPlans,
  };
}
