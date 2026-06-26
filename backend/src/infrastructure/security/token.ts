import jwt from 'jsonwebtoken';
import type { TokenService } from '../../domain/ports';

/** jsonwebtoken adapter for the TokenService port. */
export class JwtTokenService implements TokenService {
  constructor(private readonly secret: string, private readonly expiresIn = '7d') {}
  sign(userId: string): string {
    const opts = { expiresIn: this.expiresIn } as jwt.SignOptions;
    return jwt.sign({ sub: userId }, this.secret, opts);
  }
  verify(token: string): { sub: string } { return jwt.verify(token, this.secret) as { sub: string }; }
}
