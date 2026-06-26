import { useEffect, useState } from 'react';
import type { Agreement, AgreementDetail } from '../types';
import * as api from '../api/client';

interface UseAgreementListResult {
  data: Agreement[] | null;
  loading: boolean;
  error: string | null;
}

/** Use-case hook: loads the current user's agreements once on mount. */
export function useAgreementList(): UseAgreementListResult {
  const [data, setData] = useState<Agreement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getAgreements()
      .then(({ agreements }) => {
        if (!cancelled) setData(agreements);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load agreements');
          setData([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // `loading` is true until the list resolves (data still null).
  return { data, loading: data === null, error };
}

interface UseAgreementResult {
  data: AgreementDetail | null;
  loading: boolean;
  error: string | null;
}

/** Use-case hook: loads a single agreement detail; re-fetches when `id` changes. */
export function useAgreement(id: string | undefined): UseAgreementResult {
  const [data, setData] = useState<AgreementDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setData(null);
    setError(null);
    api
      .getAgreement(id)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load agreement');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { data, loading: data === null && error === null, error };
}
