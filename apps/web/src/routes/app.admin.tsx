import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useMe } from '#/lib/me-context';
import { ForbiddenAdmin } from '#/components/admin-forms';

/** Layout guard for the school-admin space ("Espace école"). */
export const Route = createFileRoute('/app/admin')({
  component: AdminLayout,
});

function AdminLayout() {
  const me = useMe();
  const isAdmin = me.memberRoles.some((r) => r === 'admin' || r === 'owner');
  if (!isAdmin) return <ForbiddenAdmin />;
  return <Outlet />;
}
