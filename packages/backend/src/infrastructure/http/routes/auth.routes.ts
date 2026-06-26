import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../async';
import { AuthedRequest } from '../middleware/auth';
import type { AuthService } from '../../../application/auth.service';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'password must be at least 8 characters'),
  name: z.string().min(1),
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export function authRoutes(service: AuthService, requireAuth: RequestHandler): Router {
  const r = Router();
  r.post('/register', asyncHandler(async (req, res) => {
    res.status(201).json(await service.register(registerSchema.parse(req.body)));
  }));
  r.post('/login', asyncHandler(async (req, res) => {
    res.json(await service.login(loginSchema.parse(req.body)));
  }));
  r.get('/me', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
    res.json({ user: await service.getById(req.userId!) });
  }));
  return r;
}
