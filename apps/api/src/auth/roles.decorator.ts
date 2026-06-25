import { SetMetadata } from '@nestjs/common';
import type { AppRole } from '@kizuna/db';

export const ROLES_KEY = 'kizuna:roles';

/**
 * Restricts a route to the given platform-level roles (user.role).
 * Used together with AuthGuard + RolesGuard.
 */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
