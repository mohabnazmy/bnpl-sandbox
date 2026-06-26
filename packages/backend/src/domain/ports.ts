/**
 * Ports — interfaces the domain OWNS. Infrastructure provides adapters that
 * implement them (Prisma, bcrypt, jwt). The application depends only on these,
 * never on a concrete library — that inversion is what makes it hexagonal.
 */

// ---- domain records (persistence-shaped, but library-agnostic) ----
export interface UserRecord { id: string; email: string; name: string; passwordHash: string; creditLimit: number; }
export interface AgreementRecord { id: string; userId: string; merchant: string; principal: number; months: number; totalPayable: number; status: string; createdAt: Date; }
export interface InstallmentRecord { id: string; seq: number; dueDate: Date; amount: number; status: string; }

export interface NewAgreement {
  userId: string; merchant: string; principal: number; months: number; totalPayable: number;
  installments: Array<{ seq: number; dueDate: Date; amount: number }>;
}

// ---- ports ----
export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(data: { email: string; name: string; passwordHash: string }): Promise<UserRecord>;
}

export interface AgreementRepository {
  create(data: NewAgreement): Promise<AgreementRecord>;
  listByUser(userId: string): Promise<AgreementRecord[]>;
  findForUser(id: string, userId: string): Promise<{ agreement: AgreementRecord; installments: InstallmentRecord[] } | null>;
}

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}

export interface TokenService {
  sign(userId: string): string;
  verify(token: string): { sub: string };
}
