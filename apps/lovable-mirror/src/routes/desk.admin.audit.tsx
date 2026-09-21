import { createFileRoute } from "@tanstack/react-router";

import { Panel, PanelHeader } from "@/components/ui/Panel";
import { AuditTable } from "@/features/admin/AuditTable";

export const Route = createFileRoute("/desk/admin/audit")({
  component: function AuditComponent() {
    return (
      <Panel lit>
        <PanelHeader
          eyebrow="Admin · Audit"
          title="Audit log"
          description="Ownership changes, assignments, and settings updates — newest first with expandable diffs."
        />
        <div className="p-6 sm:p-8">
          <AuditTable />
        </div>
      </Panel>
    );
  },
});
