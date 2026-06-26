import { createFileRoute, Outlet } from '@tanstack/react-router';

/** Layout for the /app/support space (list + ticket detail render through here). */
export const Route = createFileRoute('/app/support')({
  component: () => <Outlet />,
});
