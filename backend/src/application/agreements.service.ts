import type { Agreement, AgreementDetail } from '../contract';
import type { AgreementRepository } from '../domain/ports';
import { NotFoundError } from '../domain/errors';
import { toAgreement, toInstallment } from './mappers';

export class AgreementsService {
  constructor(private readonly agreements: AgreementRepository) {}

  async list(userId: string): Promise<Agreement[]> {
    return (await this.agreements.listByUser(userId)).map(toAgreement);
  }

  async detail(userId: string, id: string): Promise<AgreementDetail> {
    const found = await this.agreements.findForUser(id, userId);
    if (!found) throw new NotFoundError('agreement not found');
    return { agreement: toAgreement(found.agreement), installments: found.installments.map(toInstallment) };
  }
}
