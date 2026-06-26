import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { asyncHandler } from '../lib/async';
import { toAgreement, toInstallment } from '../lib/mappers';
import { HttpError } from '../middleware/error';
import type { AgreementDetail } from '@bnpl/shared';

export const agreementsRouter = Router();

agreementsRouter.get('/', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const rows = await prisma.agreement.findMany({ where: { userId: req.userId }, orderBy: { createdAt: 'desc' } });
  res.json({ agreements: rows.map(toAgreement) });
}));

agreementsRouter.get('/:id', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const a = await prisma.agreement.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { installments: { orderBy: { seq: 'asc' } } },
  });
  if (!a) throw new HttpError(404, 'agreement not found');
  const detail: AgreementDetail = { agreement: toAgreement(a), installments: a.installments.map(toInstallment) };
  res.json(detail);
}));
