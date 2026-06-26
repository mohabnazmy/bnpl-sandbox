import { ApiRequestError } from '../api/client';

/** Extract a user-facing message from an unknown error, with a fallback. */
export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiRequestError ? err.message : fallback;
}
