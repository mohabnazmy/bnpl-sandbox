import type { User as DbUser, Agreement as DbAgreement, Installment as DbInstallment } from '@prisma/client';
import type { User, Agreement, Installment, Months, AgreementStatus, InstallmentStatus } from '@bnpl/shared';

export const toUser = (u: DbUser): User => ({
  id: u.id, email: u.email, name: u.name, creditLimit: u.creditLimit,
});

export const toAgreement = (a: DbAgreement): Agreement => ({
  id: a.id, merchant: a.merchant, principal: a.principal, months: a.months as Months,
  totalPayable: a.totalPayable, status: a.status as AgreementStatus, createdAt: a.createdAt.toISOString(),
});

export const toInstallment = (i: DbInstallment): Installment => ({
  id: i.id, seq: i.seq, dueDate: i.dueDate.toISOString(), amount: i.amount, status: i.status as InstallmentStatus,
});
