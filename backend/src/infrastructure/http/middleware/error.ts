import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ConflictError, NotFoundError, AuthError, BusinessRuleError } from '../../../domain/errors';

/** Maps domain errors + validation errors to HTTP status codes. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) return res.status(400).json({ error: 'validation failed', details: err.flatten() });
  if (err instanceof ConflictError) return res.status(409).json({ error: err.message });
  if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
  if (err instanceof AuthError) return res.status(401).json({ error: err.message });
  if (err instanceof BusinessRuleError) return res.status(422).json({ error: err.message });
  console.error('[unhandled]', err);
  return res.status(500).json({ error: 'internal server error' });
}
