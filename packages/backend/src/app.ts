import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth';
import { plansRouter } from './modules/plans';
import { checkoutRouter } from './modules/checkout';
import { agreementsRouter } from './modules/agreements';
import { errorHandler } from './middleware/error';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRouter);
  app.use('/api/plans', plansRouter);
  app.use('/api/checkout', checkoutRouter);
  app.use('/api/agreements', agreementsRouter);

  app.use(errorHandler);
  return app;
}
