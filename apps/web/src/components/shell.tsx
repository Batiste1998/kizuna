import type { ReactNode } from 'react';

export function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center text-muted-foreground">{children}</main>
  );
}
