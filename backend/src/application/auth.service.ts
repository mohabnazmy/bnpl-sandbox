import type { AuthResponse, User } from '../contract';
import type { UserRepository, PasswordHasher, TokenService } from '../domain/ports';
import { ConflictError, AuthError, NotFoundError } from '../domain/errors';
import { toUser } from './mappers';

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async register(input: { email: string; password: string; name: string }): Promise<AuthResponse> {
    if (await this.users.findByEmail(input.email)) throw new ConflictError('email already registered');
    const user = await this.users.create({
      email: input.email, name: input.name, passwordHash: await this.hasher.hash(input.password),
    });
    return { token: this.tokens.sign(user.id), user: toUser(user) };
  }

  async login(input: { email: string; password: string }): Promise<AuthResponse> {
    const user = await this.users.findByEmail(input.email);
    if (!user || !(await this.hasher.verify(input.password, user.passwordHash))) {
      throw new AuthError('invalid credentials');
    }
    return { token: this.tokens.sign(user.id), user: toUser(user) };
  }

  async getById(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('user not found');
    return toUser(user);
  }
}
