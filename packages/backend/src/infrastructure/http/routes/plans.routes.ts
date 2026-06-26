import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../async';
import { AuthedRequest } from '../middleware/auth';
import type { PlansService } from '../../../application/plans.service';

const amountQuery = z.object({ amount: z.coerce.number().int().positive('amount must be a positive integer (minor units)') });

export function plansRoutes(service: PlansService, requireAuth: RequestHandler): Router {
  const r = Router();
  r.get('/', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
    const { amount } = amountQuery.parse(req.query);
    res.json(await service.optionsFor(req.userId!, amount));
  }));
  return r;
}
