import type { PrismaClient } from '@prisma/client';
import type { UserRepository, UserRecord } from '../../domain/ports';

/** Prisma adapter for the UserRepository port. */
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: { email: string; name: string; passwordHash: string }): Promise<UserRecord> {
    return this.prisma.user.create({ data });
  }
}
