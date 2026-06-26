import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq, inArray } from 'drizzle-orm';
import { randomBytes, randomUUID } from 'node:crypto';
import { schema } from '@kizuna/db';
import { DatabaseService } from '../database/database.service';
import { AUTH } from '../auth/auth.constants';
import type { Auth } from '../auth/auth';
import type { AuthUser } from '../auth/auth.types';

export interface PlatformOverview {
  counts: {
    organizations: number;
    users: number;
    alternants: number;
    openTickets: number;
    admins: number;
    pending: number;
  };
}

/** Roles the super admin can assign when creating a user. */
type CreatableRole =
  | 'admin'
  | 'tuteur_pedagogique'
  | 'tuteur_entreprise'
  | 'support'
  | 'super_admin';

const PLATFORM_ROLES = new Set<CreatableRole>(['support', 'super_admin']);

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly database: DatabaseService,
    @Inject(AUTH) private readonly auth: Auth,
  ) {}

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
    const [orgs, users, alternants, tickets, members] = await Promise.all([
      this.db.select({ id: schema.organization.id }).from(schema.organization),
      this.db.select({ id: schema.user.id, banned: schema.user.banned }).from(schema.user),
      this.db.select({ id: schema.alternantProfil.id }).from(schema.alternantProfil),
      this.db.select({ id: schema.ticket.id, status: schema.ticket.status }).from(schema.ticket),
      this.db
        .select({ userId: schema.member.userId, role: schema.member.role })
        .from(schema.member),
    ]);
    const openTickets = tickets.filter((t) => t.status !== 'resolved').length;
    const admins = new Set(
      members.filter((m) => m.role === 'admin' || m.role === 'owner').map((m) => m.userId),
    ).size;
    const pending = users.filter((u) => u.banned).length;
    return {
      counts: {
        organizations: orgs.length,
        users: users.length,
        alternants: alternants.length,
        openTickets,
        admins,
        pending,
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
      .select({ organizationId: schema.member.organizationId, role: schema.member.role })
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
      createdAt: o.createdAt,
      memberCount: countBy(members, o.id),
      adminCount: members.filter(
        (m) => m.organizationId === o.id && (m.role === 'admin' || m.role === 'owner'),
      ).length,
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
      createdAt: created.createdAt,
      memberCount: 0,
      adminCount: 0,
      alternantCount: 0,
    };
  }

  async updateOrganization(
    user: AuthUser,
    orgId: string,
    input: { name?: string; type?: string | null; city?: string | null },
  ) {
    this.ensure(user);
    const [target] = await this.db
      .select()
      .from(schema.organization)
      .where(eq(schema.organization.id, orgId));
    if (!target) throw new NotFoundException('École introuvable');
    await this.db
      .update(schema.organization)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
      })
      .where(eq(schema.organization.id, orgId));
    return { id: orgId };
  }

  async deleteOrganization(user: AuthUser, orgId: string) {
    this.ensure(user);
    await this.db.delete(schema.organization).where(eq(schema.organization.id, orgId));
    return { id: orgId };
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
        createdAt: schema.user.createdAt,
      })
      .from(schema.user)
      .orderBy(desc(schema.user.createdAt))
      .limit(200);

    const userIds = users.map((u) => u.id);
    const members = userIds.length
      ? await this.db
          .select({
            userId: schema.member.userId,
            role: schema.member.role,
            organizationId: schema.member.organizationId,
          })
          .from(schema.member)
          .where(inArray(schema.member.userId, userIds))
      : [];
    const orgs = await this.db
      .select({ id: schema.organization.id, name: schema.organization.name })
      .from(schema.organization);
    const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? '—';

    return users.map((u) => {
      const mine = members.filter((m) => m.userId === u.id);
      return {
        ...u,
        role: u.role ?? 'user',
        banned: u.banned ?? false,
        orgCount: mine.length,
        memberRoles: [...new Set(mine.map((m) => m.role))],
        organizations: [...new Set(mine.map((m) => orgName(m.organizationId)))],
      };
    });
  }

  async createUser(
    user: AuthUser,
    input: { name: string; email: string; role: CreatableRole; organizationIds?: string[] },
  ) {
    this.ensure(user);
    const [existing] = await this.db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, input.email));
    if (existing) throw new ForbiddenException('Un compte existe déjà avec cet email');

    const temporaryPassword = `Kz-${randomBytes(12).toString('base64url')}`;
    const res = await this.auth.api.signUpEmail({
      body: { name: input.name, email: input.email, password: temporaryPassword },
    });
    const userId = res.user.id;

    const isPlatform = PLATFORM_ROLES.has(input.role);
    // New accounts start without access (banned) until the super admin activates them.
    await this.db
      .update(schema.user)
      .set({ banned: true, role: isPlatform ? input.role : 'user', updatedAt: new Date() })
      .where(eq(schema.user.id, userId));

    if (!isPlatform) {
      const orgIds = [...new Set(input.organizationIds ?? [])];
      for (const organizationId of orgIds) {
        await this.db
          .insert(schema.member)
          .values({ id: randomUUID(), organizationId, userId, role: input.role });
      }
    }

    return { userId, temporaryPassword };
  }

  async deleteUser(user: AuthUser, userId: string) {
    this.ensure(user);
    if (userId === user.id) throw new ForbiddenException('Vous ne pouvez pas vous supprimer.');
    await this.db.delete(schema.user).where(eq(schema.user.id, userId));
    return { id: userId };
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
