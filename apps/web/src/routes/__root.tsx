import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import type { ReactNode } from 'react';
// Lisibilité dyslexie (option du panneau d'accessibilité) — auto-hébergée,
// téléchargée par le navigateur seulement quand la famille est activée.
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import appCss from '../styles.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Kizuna — Suivi d’alternance' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/favicon.png' },
      { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/logo192.png' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        {children}
        <Toaster richColors position="top-right" />
        <Scripts />
      </body>
    </html>
  );
}
