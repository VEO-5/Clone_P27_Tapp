import type { Metadata } from "next";
import { ArrowLeft, SearchX } from "lucide-react";

import { LinkButton } from "@/components/ui/Button";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { normaliseReference } from "@/lib/reference";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ reference: string }>;
}): Promise<Metadata> {
  const { reference } = await params;
  return { title: normaliseReference(reference) };
}

/**
 * Phase 0 placeholder: employee ticket page lands in Phase 2 (/tickets/[reference]).
 */
export default async function TrackTicketPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <LinkButton
        href="/track"
        variant="ghost"
        size="sm"
        icon={<ArrowLeft className="size-3.5" aria-hidden />}
        className="-ml-3 mb-6"
      >
        Back to lookup
      </LinkButton>
      <Panel tone="night">
        <EmptyState
          tone="night"
          icon={<SearchX className="size-5" aria-hidden />}
          title="Ticket view moved"
          description={`Reference ${normaliseReference(reference)} will render at /tickets/[reference] in Phase 2.`}
        />
      </Panel>
    </div>
  );
}
