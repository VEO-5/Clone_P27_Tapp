import { Panel, PanelHeader } from "@/components/ui/Panel";

/** Submit form lands in Phase 2 (TicketForm rewired to POST /tickets + presigned uploads). */
export default function NewTicketPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <Panel lit>
        <PanelHeader
          eyebrow="Report an issue"
          title="Submit form wires up in Phase 2"
          description="Title, description, category, priority, and presigned file uploads via the API."
        />
      </Panel>
    </div>
  );
}
