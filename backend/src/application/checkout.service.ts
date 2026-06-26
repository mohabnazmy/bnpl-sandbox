import type { Agreement, Months } from '../contract';
import type { UserRepository, AgreementRepository } from '../domain/ports';
import { NotFoundError, BusinessRuleError } from '../domain/errors';
import { planOptions, buildSchedule } from '../domain/finance';
import { toAgreement } from './mappers';

export class CheckoutService {
  constructor(
    private readonly users: UserRepository,
    private readonly agreements: AgreementRepository,
  ) {}

  async checkout(userId: string, input: { amount: number; months: Months; merchant: string }): Promise<Agreement> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('user not found');
    if (input.amount > user.creditLimit) throw new BusinessRuleError('amount exceeds your available credit limit');

    const option = planOptions(input.amount).find((o) => o.months === input.months);
    if (!option) throw new BusinessRuleError('unsupported term');
    const schedule = buildSchedule(option.totalPayable, input.months, new Date());

    const agreement = await this.agreements.create({
      userId, merchant: input.merchant, principal: input.amount, months: input.months,
      totalPayable: option.totalPayable, installments: schedule,
    });
    return toAgreement(agreement);
  }
}
