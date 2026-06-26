import { useState, useCallback } from 'react';
import type { Agreement, Months } from '@bnpl/shared';
import * as api from '../api/client';
import { ApiRequestError } from '../api/client';

interface UseCheckoutResult {
  /** Submits a checkout; resolves to the created agreement, or null on failure. */
  submit: (amount: number, months: Months, merchant: string) => Promise<Agreement | null>;
  loading: boolean;
  error: string | null;
}

/** Use-case hook wrapping the checkout endpoint; owns its own loading/error. */
export function useCheckout(): UseCheckoutResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (amount: number, months: Months, merchant: string): Promise<Agreement | null> => {
      setError(null);
      setLoading(true);
      try {
        const { agreement } = await api.checkout({ amount, months, merchant });
        return agreement;
      } catch (err) {
        // Over-credit-limit and validation errors arrive as ApiRequestError.
        setError(err instanceof ApiRequestError ? err.message : 'Checkout failed.');
        setLoading(false);
        return null;
      }
    },
    [],
  );

  return { submit, loading, error };
}
