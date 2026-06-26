import { Router, RequestHandler } from 'express';
import { asyncHandler } from '../async';
import { AuthedRequest } from '../middleware/auth';
import type { AgreementsService } from '../../../application/agreements.service';

export function agreementsRoutes(service: AgreementsService, requireAuth: RequestHandler): Router {
  const r = Router();
  r.get('/', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
    res.json({ agreements: await service.list(req.userId!) });
  }));
  r.get('/:id', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await service.detail(req.userId!, req.params.id));
  }));
  return r;
}
