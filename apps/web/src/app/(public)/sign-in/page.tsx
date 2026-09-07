import { MockSignInButtons } from "@/features/auth/MockSignInButtons";
import { SignInButton } from "@/features/auth/SignInButton";
import { Panel, PanelHeader } from "@/components/ui/Panel";

export const metadata = { title: "Sign in" };

const MOCK = process.env.NEXT_PUBLIC_API_MOCK?.trim().toLowerCase() !== "false";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
      <Panel lit>
        <PanelHeader
          eyebrow="Sign in"
          title="Sphere Support"
          description={
            MOCK
              ? "Use your Pearl 27 work email — we recognize your role. Admins invite agents and admins; everyone else signs in as an employee, no account needed."
              : "Use your Pearl 27 Google account. No email field, no passwords — Google handles it and the API sets your session."
          }
        />
        <div className="flex flex-col gap-4 p-6 sm:p-8">
          {MOCK ? <MockSignInButtons next={next ?? "/"} /> : <SignInButton next={next ?? "/"} />}
          <p className="text-[13px] leading-relaxed text-fog">
            After sign-in, you land on your home: employees on My tickets, agents on the Desk,
            admins on the Dashboard.
          </p>
        </div>
      </Panel>
    </div>
  );
}
