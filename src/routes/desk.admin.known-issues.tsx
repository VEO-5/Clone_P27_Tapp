import { createFileRoute } from "@tanstack/react-router";

import { Panel, PanelHeader } from "@/components/ui/Panel";
import { KnownIssuesManager } from "@/features/admin/KnownIssuesManager";

export const Route = createFileRoute("/desk/admin/known-issues")({
  component: function KnownIssuesComponent() {
    return (
      <Panel lit>
        <PanelHeader
          eyebrow="Admin · Known issues"
          title="Incident banners"
          description="Publish banners employees see instead of filing duplicates — end them when resolved."
        />
        <div className="p-6 sm:p-8">
          <KnownIssuesManager />
        </div>
      </Panel>
    );
  },
});
