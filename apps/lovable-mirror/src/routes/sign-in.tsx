import { createFileRoute } from "@tanstack/react-router";

import { Panel, PanelHeader } from "@/components/ui/Panel";
import { DemoResetButton } from "@/features/auth/DemoResetButton";
import { EmailSignInForm } from "@/features/auth/EmailSignInForm";
import { MockSignInButtons } from "@/features/auth/MockSignInButtons";
import { signInSearchSchema } from "@/lib/auth-guard";

// Mirrors apps/web/src/app/(public)/sign-in/page.tsx (title "Sign in").
// ?next= is typed per route — after login the app navigates there (FE-L-4.6).
export const Route = createFileRoute("/sign-in")({
  validateSearch: signInSearchSchema,
  head: () => ({ meta: [{ title: "Sign in · Pearl 27" }] }),
  component: function SignInComponent() {
    const { next } = Route.useSearch();
    return (
      <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <Panel lit>
          <PanelHeader
            eyebrow="Sign in"
            title="Sphere Support"
            description="Use your Pearl 27 work email — we recognize your role. Admins invite agents and admins; everyone else signs in as an employee, no account needed."
          />
          <div className="flex flex-col gap-4 p-6 sm:p-8">
            <EmailSignInForm next={next ?? "/"} />
            <MockSignInButtons next={next ?? "/"} />
            <p className="text-[13px] leading-relaxed text-fog">
              After sign-in, you land on your home: employees on My tickets, agents on the Desk,
              admins on the Dashboard.
            </p>
            <DemoResetButton />
          </div>
        </Panel>
      </div>
    );
  },
});
