import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import { ALLOWED_MONTHS, Months } from '@bnpl/shared';
import { asyncHandler } from '../async';
import { AuthedRequest } from '../middleware/auth';
import type { CheckoutService } from '../../../application/checkout.service';

const checkoutSchema = z.object({
  amount: z.number().int().positive(),
  months: z.number().refine((m): m is Months => (ALLOWED_MONTHS as readonly number[]).includes(m), 'unsupported term'),
  merchant: z.string().min(1),
});

export function checkoutRoutes(service: CheckoutService, requireAuth: RequestHandler): Router {
  const r = Router();
  r.post('/', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
    const data = checkoutSchema.parse(req.body);
    res.status(201).json({ agreement: await service.checkout(req.userId!, data) });
  }));
  return r;
}
