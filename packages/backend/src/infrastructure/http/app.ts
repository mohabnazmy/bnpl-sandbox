import express from 'express';
import cors from 'cors';
import type { TokenService } from '../../domain/ports';
import type { AuthService } from '../../application/auth.service';
import type { PlansService } from '../../application/plans.service';
import type { CheckoutService } from '../../application/checkout.service';
import type { AgreementsService } from '../../application/agreements.service';
import { makeRequireAuth } from './middleware/auth';
import { errorHandler } from './middleware/error';
import { authRoutes } from './routes/auth.routes';
import { plansRoutes } from './routes/plans.routes';
import { checkoutRoutes } from './routes/checkout.routes';
import { agreementsRoutes } from './routes/agreements.routes';

export interface HttpDeps {
  authService: AuthService;
  plansService: PlansService;
  checkoutService: CheckoutService;
  agreementsService: AgreementsService;
  tokens: TokenService;
}

/** HTTP adapter — wires the application services to Express routes. */
export function createApp(deps: HttpDeps) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const requireAuth = makeRequireAuth(deps.tokens);

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes(deps.authService, requireAuth));
  app.use('/api/plans', plansRoutes(deps.plansService, requireAuth));
  app.use('/api/checkout', checkoutRoutes(deps.checkoutService, requireAuth));
  app.use('/api/agreements', agreementsRoutes(deps.agreementsService, requireAuth));

  app.use(errorHandler);
  return app;
}
