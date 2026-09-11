import { createFileRoute } from "@tanstack/react-router";

import { signInSearchSchema } from "@/lib/auth-guard";

// Mirrors apps/web/src/app/(public)/sign-in/page.tsx (title "Sign in").
// Real body: MockSignInButtons / SignInButton (?next= round trip) + Panel.
// ?next= is typed per route — after login the app navigates there (FE-L-4.6).
export const Route = createFileRoute("/sign-in")({
  validateSearch: signInSearchSchema,
  head: () => ({ meta: [{ title: "Sign in · Pearl 27" }] }),
  component: function SignInComponent() {
    const { next } = Route.useSearch();
    return (
      <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <p className="eyebrow">Sign in</p>
        <h1>Sphere Support</h1>
        <p className="text-sm opacity-70">PORT: features/auth/MockSignInButtons (next={next}).</p>
      </div>
    );
  },
});
