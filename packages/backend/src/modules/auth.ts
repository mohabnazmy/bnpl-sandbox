import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { hashPassword, verifyPassword } from '../lib/password';
import { signToken } from '../lib/token';
import { asyncHandler } from '../lib/async';
import { toUser } from '../lib/mappers';
import { HttpError } from '../middleware/error';
import { requireAuth, AuthedRequest } from '../middleware/auth';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'password must be at least 8 characters'),
  name: z.string().min(1),
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export const authRouter = Router();

authRouter.post('/register', asyncHandler(async (req, res) => {
  const { email, password, name } = registerSchema.parse(req.body);
  if (await prisma.user.findUnique({ where: { email } })) throw new HttpError(409, 'email already registered');
  const user = await prisma.user.create({ data: { email, name, passwordHash: await hashPassword(password) } });
  res.status(201).json({ token: signToken(user.id), user: toUser(user) });
}));

authRouter.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) throw new HttpError(401, 'invalid credentials');
  res.json({ token: signToken(user.id), user: toUser(user) });
}));

authRouter.get('/me', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw new HttpError(404, 'user not found');
  res.json({ user: toUser(user) });
}));
