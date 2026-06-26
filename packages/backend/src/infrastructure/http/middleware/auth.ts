import { Request, Response, NextFunction } from 'express';
import type { TokenService } from '../../../domain/ports';

export interface AuthedRequest extends Request { userId?: string; }

/** Auth middleware factory — depends on the TokenService port, not jwt directly. */
export function makeRequireAuth(tokens: TokenService) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
    if (!m) return res.status(401).json({ error: 'authentication required' });
    try {
      req.userId = tokens.verify(m[1]).sub;
      next();
    } catch {
      return res.status(401).json({ error: 'invalid or expired token' });
    }
  };
}
