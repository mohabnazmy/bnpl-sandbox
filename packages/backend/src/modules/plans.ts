import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { asyncHandler } from '../lib/async';
import { HttpError } from '../middleware/error';
import { planOptions } from '../lib/finance';
import type { PlansResponse } from '@bnpl/shared';

const amountQuery = z.object({ amount: z.coerce.number().int().positive('amount must be a positive integer (minor units)') });

export const plansRouter = Router();

plansRouter.get('/', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { amount } = amountQuery.parse(req.query);
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw new HttpError(404, 'user not found');
  const body: PlansResponse = { amount, creditLimit: user.creditLimit, options: planOptions(amount) };
  res.json(body);
}));
