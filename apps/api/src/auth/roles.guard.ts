import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AppRole } from '@kizuna/db';
import type { Request } from 'express';
import { ROLES_KEY } from './roles.decorator';

/**
 * Enforces platform-level role requirements declared via @Roles().
 * Must run after AuthGuard (which populates request.user).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const role = request.user?.role as AppRole | undefined;

    if (!role || !required.includes(role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
