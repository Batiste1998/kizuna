import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { AUTH } from './auth.constants';
import type { Auth } from './auth';
import type { AuthSession, AuthUser } from './auth.types';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * Validates the Better Auth session for the incoming request and attaches the
 * authenticated user/session to it. Routes marked @Public() are skipped.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(AUTH) private readonly auth: Auth,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const session = await this.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      throw new UnauthorizedException('Authentication required');
    }

    const authSession = session.session as AuthSession;
    request.user = {
      ...(session.user as AuthUser),
      activeOrganizationId: authSession.activeOrganizationId ?? null,
    };
    request.session = authSession;
    return true;
  }
}
