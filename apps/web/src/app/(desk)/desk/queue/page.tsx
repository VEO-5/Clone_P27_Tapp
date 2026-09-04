import { Panel, PanelHeader } from "@/components/ui/Panel";

/** Full queue with tabs/filters/claim/release lands in Phase 3. */
export default function QueuePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <Panel lit>
        <PanelHeader
          eyebrow="Queue"
          title="Queue wires up in Phase 3"
          description="Mine / Unassigned / All / by-agent tabs, URL-driven filters, claim with 409 handling, and live SSE updates."
        />
      </Panel>
    </div>
  );
}
