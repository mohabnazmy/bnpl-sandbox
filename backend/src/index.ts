/**
 * Composition root — the ONLY place that knows every concrete adapter.
 * It instantiates infrastructure, injects it into application services
 * (via their ports), and starts the HTTP adapter.
 */
import { config } from './config';
import { prisma } from './infrastructure/prisma/client';
import { PrismaUserRepository } from './infrastructure/prisma/user.repository';
import { PrismaAgreementRepository } from './infrastructure/prisma/agreement.repository';
import { BcryptHasher } from './infrastructure/security/password';
import { JwtTokenService } from './infrastructure/security/token';
import { AuthService } from './application/auth.service';
import { PlansService } from './application/plans.service';
import { CheckoutService } from './application/checkout.service';
import { AgreementsService } from './application/agreements.service';
import { createApp } from './infrastructure/http/app';

// infrastructure adapters
const users = new PrismaUserRepository(prisma);
const agreements = new PrismaAgreementRepository(prisma);
const hasher = new BcryptHasher();
const tokens = new JwtTokenService(config.jwtSecret);

// application services (depend on ports only)
const app = createApp({
  authService: new AuthService(users, hasher, tokens),
  plansService: new PlansService(users),
  checkoutService: new CheckoutService(users, agreements),
  agreementsService: new AgreementsService(agreements),
  tokens,
});

app.listen(config.port, () => {
  console.log(`[bnpl-backend] listening on http://localhost:${config.port}`);
});
