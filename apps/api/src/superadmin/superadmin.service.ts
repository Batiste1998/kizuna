import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { schema } from '@kizuna/db';
import { DatabaseService } from '../database/database.service';
import type { AuthUser } from '../auth/auth.types';

export interface PlatformOverview {
  counts: { organizations: number; users: number; alternants: number; openTickets: number };
}

@Injectable()
export class SuperAdminService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  private ensure(user: AuthUser): void {
    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Réservé au super administrateur');
    }
  }

  private slugify(name: string): string {
    const base = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return `${base || 'ecole'}-${randomUUID().slice(0, 6)}`;
  }

  async overview(user: AuthUser): Promise<PlatformOverview> {
    this.ensure(user);
    const [orgs, users, alternants, tickets] = await Promise.all([
      this.db.select({ id: schema.organization.id }).from(schema.organization),
      this.db.select({ id: schema.user.id }).from(schema.user),
      this.db.select({ id: schema.alternantProfil.id }).from(schema.alternantProfil),
      this.db.select({ id: schema.ticket.id, status: schema.ticket.status }).from(schema.ticket),
    ]);
    const openTickets = tickets.filter((t) => t.status !== 'resolved').length;
    return {
      counts: {
        organizations: orgs.length,
        users: users.length,
        alternants: alternants.length,
        openTickets,
      },
    };
  }

  async listOrganizations(user: AuthUser) {
    this.ensure(user);
    const orgs = await this.db
      .select()
      .from(schema.organization)
      .orderBy(desc(schema.organization.createdAt));
    const members = await this.db
      .select({ organizationId: schema.member.organizationId })
      .from(schema.member);
    const alternants = await this.db
      .select({ organizationId: schema.alternantProfil.organizationId })
      .from(schema.alternantProfil);

    const countBy = (rows: { organizationId: string }[], id: string) =>
      rows.filter((r) => r.organizationId === id).length;

    return orgs.map((o) => ({
      id: o.id,
      name: o.name,
      type: o.type,
      city: o.city,
      memberCount: countBy(members, o.id),
      alternantCount: countBy(alternants, o.id),
    }));
  }

  async createOrganization(user: AuthUser, input: { name: string; type?: string; city?: string }) {
    this.ensure(user);
    const [created] = await this.db
      .insert(schema.organization)
      .values({
        id: randomUUID(),
        name: input.name,
        slug: this.slugify(input.name),
        type: input.type ?? null,
        city: input.city ?? null,
      })
      .returning();
    return {
      id: created.id,
      name: created.name,
      type: created.type,
      city: created.city,
      memberCount: 0,
      alternantCount: 0,
    };
  }

  async listUsers(user: AuthUser) {
    this.ensure(user);
    const users = await this.db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        role: schema.user.role,
        banned: schema.user.banned,
      })
      .from(schema.user)
      .orderBy(desc(schema.user.createdAt))
      .limit(200);

    const userIds = users.map((u) => u.id);
    const members = userIds.length
      ? await this.db
          .select({ userId: schema.member.userId, role: schema.member.role })
          .from(schema.member)
          .where(inArray(schema.member.userId, userIds))
      : [];

    return users.map((u) => ({
      ...u,
      role: u.role ?? 'user',
      banned: u.banned ?? false,
      orgCount: members.filter((m) => m.userId === u.id).length,
      memberRoles: [...new Set(members.filter((m) => m.userId === u.id).map((m) => m.role))],
    }));
  }

  async updateUser(
    user: AuthUser,
    userId: string,
    input: { banned?: boolean; role?: 'user' | 'support' | 'super_admin' },
  ) {
    this.ensure(user);
    const [target] = await this.db.select().from(schema.user).where(eq(schema.user.id, userId));
    if (!target) throw new NotFoundException('Utilisateur introuvable');

    const [updated] = await this.db
      .update(schema.user)
      .set({
        ...(input.banned !== undefined ? { banned: input.banned } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.user.id, userId))
      .returning({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        role: schema.user.role,
        banned: schema.user.banned,
      });
    return updated;
  }
}
