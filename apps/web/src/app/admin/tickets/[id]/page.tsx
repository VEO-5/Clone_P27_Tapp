import { ArrowLeft, SearchX } from "lucide-react";

import { LinkButton } from "@/components/ui/Button";
import { EmptyState, Panel } from "@/components/ui/Panel";

export const metadata = {
  title: "Ticket",
};

/**
 * Phase 0 placeholder: full detail with composer lands in Phase 4 (/desk/tickets/[id]).
 */
export default function AdminTicketPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <LinkButton
        href="/admin"
        variant="ghost"
        size="sm"
        icon={<ArrowLeft className="size-3.5" aria-hidden />}
        className="-ml-3 mb-6"
      >
        Back to the desk
      </LinkButton>
      <Panel tone="night">
        <EmptyState
          tone="night"
          icon={<SearchX className="size-5" aria-hidden />}
          title="Ticket view moved"
          description="This screen is rebuilt in Phase 4 against /desk/tickets/:id with MSW mocks."
        />
      </Panel>
    </div>
  );
}
