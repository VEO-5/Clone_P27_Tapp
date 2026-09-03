import { ArrowLeft } from "lucide-react";

import { LinkButton } from "@/components/ui/Button";
import { Panel, PanelHeader } from "@/components/ui/Panel";

export const metadata = {
  title: "Support sign in",
};

/**
 * Phase 0 placeholder: Google sign-in via the API lands in Phase 1.
 * This route redirects to /sign-in once that exists.
 */
export default function AdminLoginPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-14 sm:px-6 sm:pt-20">
      <LinkButton href="/" variant="ghost" size="sm" icon={<ArrowLeft className="size-3.5" aria-hidden />} className="mb-6 -ml-3">
        Back to home
      </LinkButton>
      <Panel lit>
        <PanelHeader
          eyebrow="Support sign in"
          title="Moved to Google sign-in"
          description="Access codes are removed. Phase 1 wires Continue with Google via the API."
        />
      </Panel>
    </div>
  );
}
