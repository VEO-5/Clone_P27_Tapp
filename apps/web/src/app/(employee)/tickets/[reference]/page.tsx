import { Panel, PanelHeader } from "@/components/ui/Panel";

/** Status-record page lands in Phase 2 (GET /tickets/:reference, status events only). */
export default async function TicketReferencePage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <Panel lit>
        <PanelHeader
          eyebrow={reference}
          title="Ticket status record wires up in Phase 2"
          description="Description, attachments, handling agent, status timeline, and CSAT — no conversation messages."
        />
      </Panel>
    </div>
  );
}
