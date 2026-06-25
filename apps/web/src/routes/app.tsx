import { createFileRoute, Outlet } from '@tanstack/react-router';

/** Layout for the /app/* space — children render in the outlet. */
export const Route = createFileRoute('/app')({
  component: () => <Outlet />,
});
