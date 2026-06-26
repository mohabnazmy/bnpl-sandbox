import type { PrismaClient } from '@prisma/client';
import type { AgreementRepository, AgreementRecord, InstallmentRecord, NewAgreement } from '../../domain/ports';

/** Prisma adapter for the AgreementRepository port. */
export class PrismaAgreementRepository implements AgreementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: NewAgreement): Promise<AgreementRecord> {
    return this.prisma.agreement.create({
      data: {
        userId: data.userId, merchant: data.merchant, principal: data.principal,
        months: data.months, totalPayable: data.totalPayable,
        installments: { create: data.installments.map((s) => ({ seq: s.seq, dueDate: s.dueDate, amount: s.amount })) },
      },
    });
  }

  listByUser(userId: string): Promise<AgreementRecord[]> {
    return this.prisma.agreement.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async findForUser(id: string, userId: string): Promise<{ agreement: AgreementRecord; installments: InstallmentRecord[] } | null> {
    const a = await this.prisma.agreement.findFirst({
      where: { id, userId },
      include: { installments: { orderBy: { seq: 'asc' } } },
    });
    if (!a) return null;
    const { installments, ...agreement } = a;
    return { agreement, installments };
  }
}
