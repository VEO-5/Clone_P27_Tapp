import { Panel, PanelHeader } from "@/components/ui/Panel";

export const metadata = {
  title: "Sign in to your tickets",
};

/**
 * Phase 0 placeholder: Google sign-in via the API lands in Phase 1.
 */
export default function EmployeeLoginPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-14 sm:px-6 sm:pt-20">
      <Panel lit>
        <PanelHeader
          eyebrow="Sign in"
          title="Moved to Google sign-in"
          description="Email-code sign-in is removed. Phase 1 wires Continue with Google via the API."
        />
      </Panel>
    </div>
  );
}
