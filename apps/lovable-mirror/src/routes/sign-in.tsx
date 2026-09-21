import { createFileRoute } from "@tanstack/react-router";

import { Panel, PanelHeader } from "@/components/ui/Panel";
import { DemoResetButton } from "@/features/auth/DemoResetButton";
import { EmailSignInForm } from "@/features/auth/EmailSignInForm";
import { GoogleCallbackHandler, GoogleOAuthButton } from "@/features/auth/GoogleOAuthButton";
import { MockSignInButtons } from "@/features/auth/MockSignInButtons";
import { config } from "@/lib/config";
import { signInSearchSchema } from "@/lib/auth-guard";

// Mirrors apps/web/src/app/(public)/sign-in/page.tsx (title "Sign in").
// ?next= is typed per route — after login the app navigates there (FE-L-4.6).
// Mock-only helpers (quick-pick roles, demo reset) render only in mock mode;
// live mode uses the passwordless OTP form above.
export const Route = createFileRoute("/sign-in")({
  validateSearch: signInSearchSchema,
  head: () => ({ meta: [{ title: "Sign in · Pearl 27" }] }),
  component: function SignInComponent() {
    const { next } = Route.useSearch();
    const mock = config.apiMock;
    return (
      <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <Panel lit>
          <PanelHeader
            eyebrow="Sign in"
            title="Sphere Support"
            description={
              mock
                ? "Use your Pearl 27 work email — we recognize your role. Admins invite agents and admins; everyone else signs in as an employee, no account needed."
                : "One click with your Pearl 27 Google account — or we'll send your work email a 6-digit code. No password needed."
            }
          />
          <div className="flex flex-col gap-4 p-6 sm:p-8">
            {!mock && <GoogleCallbackHandler next={next ?? "/"} />}
            {!mock && <GoogleOAuthButton next={next ?? "/"} />}
            {!mock && (
              <p aria-hidden className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.12em] text-fog">
                <span aria-hidden className="h-px flex-1 bg-ink-700" />
                or email code
                <span aria-hidden className="h-px flex-1 bg-ink-700" />
              </p>
            )}
            <EmailSignInForm next={next ?? "/"} />
            {mock && <MockSignInButtons next={next ?? "/"} />}
            <p className="text-[13px] leading-relaxed text-fog">
              After sign-in, you land on your home: employees on My tickets, agents on the Desk,
              admins on the Dashboard.
            </p>
            {mock && <DemoResetButton />}
          </div>
        </Panel>
      </div>
    );
  },
});
