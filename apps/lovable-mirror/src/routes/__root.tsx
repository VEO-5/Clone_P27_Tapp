import { createRootRoute, Link, Outlet } from "@tanstack/react-router";

import { SessionHeader } from "@/components/layout/SessionHeader";

// MIRROR root route — merges apps/web/src/app/layout.tsx (AppShell,
// SessionHeader, fonts via styles.css) on arrival. Fonts are self-hosted via
// @fontsource-variable/* (never a Google Fonts <link>).
export const Route = createRootRoute({
  notFoundComponent: function NotFoundComponent() {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p className="text-sm opacity-70">
          <Link to="/">Back home</Link>
        </p>
      </div>
    );
  },
  component: function RootComponent() {
    return (
      <div className="relative z-10 flex min-h-full flex-1 flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
        >
          Skip to content
        </a>
        <SessionHeader />
        <main id="main" className="flex-1">
          <Outlet />
        </main>
      </div>
    );
  },
});
