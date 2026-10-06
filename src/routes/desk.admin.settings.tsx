import { createFileRoute } from "@tanstack/react-router";

import { Panel, PanelHeader } from "@/components/ui/Panel";
import { SettingsForm } from "@/features/admin/SettingsForm";

export const Route = createFileRoute("/desk/admin/settings")({
  component: function SettingsComponent() {
    return (
      <Panel lit>
        <PanelHeader
          eyebrow="Admin · Settings"
          title="Settings"
          description="Auto-release window, business hours, holidays, canned responses, and ticket categories."
        />
        <div className="p-6 sm:p-8">
          <SettingsForm />
        </div>
      </Panel>
    );
  },
});
