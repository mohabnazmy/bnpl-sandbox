import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/token';

export interface AuthedRequest extends Request { userId?: string; }

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  if (!m) return res.status(401).json({ error: 'authentication required' });
  try {
    req.userId = verifyToken(m[1]).sub;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid or expired token' });
  }
}
