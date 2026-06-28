import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/app/alternants')({
  component: AlternantsLayout,
});

/** Layout for the alternants area: renders the index list or a nested fiche/tab. */
function AlternantsLayout() {
  return <Outlet />;
}
