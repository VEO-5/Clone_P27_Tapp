import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/shadcn/button";
import { DemoResetButton } from "@/features/auth/DemoResetButton";
import { EmailSignInForm } from "@/features/auth/EmailSignInForm";
import { GoogleCallbackHandler, GoogleOAuthButton } from "@/features/auth/GoogleOAuthButton";
import { MockSignInButtons } from "@/features/auth/MockSignInButtons";
import {
  peekOAuthAttempt,
  shouldShowOAuthLoader,
} from "@/features/auth/googleOAuth";
import { config } from "@/lib/config";
import { signInSearchSchema } from "@/lib/auth-guard";

/** Slow-completion fallback: a spinner must never look infinite. */
const OAUTH_SLOW_MS = 20_000;

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
    // OAuth takeover: decided synchronously at mount (zero form-flash).
    // Live mode only — mock mode has no Google flow.
    const [oauthBusy, setOauthBusy] = useState(
      () => !mock && shouldShowOAuthLoader(window.location.search, peekOAuthAttempt()),
    );
    const [oauthError, setOauthError] = useState<string | null>(null);
    const [oauthSlow, setOauthSlow] = useState(false);
    useEffect(() => {
      if (!oauthBusy) return;
      const timer = setTimeout(() => setOauthSlow(true), OAUTH_SLOW_MS);
      return () => clearTimeout(timer);
    }, [oauthBusy]);

    function handleOAuthSettled(ok: boolean, message?: string) {
      if (ok) return; // success navigates away on its own
      setOauthBusy(false);
      setOauthError(message ?? "Google sign-in didn't complete. Try again.");
    }

    if (oauthBusy) {
      return (
        <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
          <Panel lit>
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-center gap-4 px-6 py-16 text-center sm:px-8"
            >
              <Loader2 className="size-10 animate-spin text-iris-400" aria-hidden />
              <div>
                <p className="eyebrow mb-2">Signing you in</p>
                <h2 className="text-lg font-semibold tracking-tight text-pearl">
                  {oauthSlow ? "Taking longer than usual…" : "Signing you in with Google…"}
                </h2>
                <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-mist">
                  {oauthSlow
                    ? "Still working — check your connection, or go back and try again."
                    : "This takes a few seconds — don't close this page."}
                </p>
              </div>
              {oauthSlow && (
                <Button type="button" variant="outline" onClick={() => setOauthBusy(false)}>
                  Back to sign-in
                </Button>
              )}
            </div>
          </Panel>
          {/* Hidden worker: completes the login and navigates home on success. */}
          <span className="hidden" aria-hidden>
            <GoogleCallbackHandler
              next={next ?? "/"}
              onSettled={handleOAuthSettled}
            />
          </span>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <Panel lit>
          <PanelHeader
            eyebrow="Sign in"
            title="Sphere Support"
            description={
              mock
                ? "Use your Pearl 27 work email — we recognize your role. Admins invite agents and admins; everyone else signs in as an employee, no account needed."
                : undefined
            }
          />
          <div className="flex flex-col gap-4 p-6 sm:p-8">
            {!mock && oauthError && (
              <p role="alert" className="text-[13px] text-rose-600">
                {oauthError}
              </p>
            )}
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
            {mock && <DemoResetButton />}
          </div>
        </Panel>
      </div>
    );
  },
});
