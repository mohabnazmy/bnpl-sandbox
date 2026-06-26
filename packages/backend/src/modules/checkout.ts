import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { asyncHandler } from '../lib/async';
import { toAgreement } from '../lib/mappers';
import { HttpError } from '../middleware/error';
import { planOptions, buildSchedule } from '../lib/finance';
import { ALLOWED_MONTHS, Months } from '@bnpl/shared';

const checkoutSchema = z.object({
  amount: z.number().int().positive(),
  months: z.number().refine((m): m is Months => (ALLOWED_MONTHS as readonly number[]).includes(m), 'unsupported term'),
  merchant: z.string().min(1),
});

export const checkoutRouter = Router();

checkoutRouter.post('/', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { amount, months, merchant } = checkoutSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw new HttpError(404, 'user not found');
  if (amount > user.creditLimit) throw new HttpError(422, 'amount exceeds your available credit limit');

  const option = planOptions(amount).find((o) => o.months === months);
  if (!option) throw new HttpError(400, 'unsupported term');
  const schedule = buildSchedule(option.totalPayable, months, new Date());

  const agreement = await prisma.agreement.create({
    data: {
      userId: user.id, merchant, principal: amount, months, totalPayable: option.totalPayable,
      installments: { create: schedule.map((s) => ({ seq: s.seq, dueDate: s.dueDate, amount: s.amount })) },
    },
  });
  res.status(201).json({ agreement: toAgreement(agreement) });
}));
