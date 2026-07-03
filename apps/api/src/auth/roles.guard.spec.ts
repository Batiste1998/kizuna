import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from './roles.decorator';

describe('RolesGuard', () => {
  const handler = () => undefined;
  class TestController {}

  function makeContext(user?: { role?: string }): ExecutionContext {
    return {
      getHandler: () => handler,
      getClass: () => TestController,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  function setup(required: string[] | undefined) {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(required) };
    const guard = new RolesGuard(reflector as unknown as Reflector);
    return { guard, reflector };
  }

  it('allows the request when no @Roles metadata is present', () => {
    const { guard } = setup(undefined);

    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });

  it('allows the request when the roles list is empty', () => {
    const { guard } = setup([]);

    expect(guard.canActivate(makeContext({ role: 'user' }))).toBe(true);
  });

  it('allows a session whose role is in the required list', () => {
    const { guard } = setup(['super_admin', 'support']);

    expect(guard.canActivate(makeContext({ role: 'support' }))).toBe(true);
  });

  it('rejects a session whose role is not required', () => {
    const { guard } = setup(['super_admin']);

    expect(() => guard.canActivate(makeContext({ role: 'user' }))).toThrow(ForbiddenException);
  });

  it('rejects when the request has no authenticated user', () => {
    const { guard } = setup(['super_admin']);

    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });

  it('rejects when the user has no role at all', () => {
    const { guard } = setup(['support']);

    expect(() => guard.canActivate(makeContext({}))).toThrow(ForbiddenException);
  });

  it('reads the metadata from both handler and class under ROLES_KEY', () => {
    const { guard, reflector } = setup(['super_admin']);
    const context = makeContext({ role: 'super_admin' });

    guard.canActivate(context);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [handler, TestController]);
  });
});
