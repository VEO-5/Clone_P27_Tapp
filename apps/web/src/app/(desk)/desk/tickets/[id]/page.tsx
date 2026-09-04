import { Panel, PanelHeader } from "@/components/ui/Panel";

/** Reply screen with composer lands in Phase 4. */
export default async function DeskTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <Panel lit>
        <PanelHeader
          eyebrow={id}
          title="Reply screen wires up in Phase 4"
          description="Conversation stream, lock-aware composer, presence, and optimistic status updates."
        />
      </Panel>
    </div>
  );
}
