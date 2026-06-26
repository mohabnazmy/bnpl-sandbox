import type { PlansResponse } from '../contract';
import type { UserRepository } from '../domain/ports';
import { NotFoundError } from '../domain/errors';
import { planOptions } from '../domain/finance';

export class PlansService {
  constructor(private readonly users: UserRepository) {}

  async optionsFor(userId: string, amount: number): Promise<PlansResponse> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('user not found');
    return { amount, creditLimit: user.creditLimit, options: planOptions(amount) };
  }
}
