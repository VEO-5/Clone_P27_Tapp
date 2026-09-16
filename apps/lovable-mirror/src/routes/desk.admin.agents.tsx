import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Skeleton } from "@/components/shadcn/skeleton";
import { AgentTable } from "@/features/admin/AgentTable";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import type { MockAgent } from "@/mocks/fixtures";
export const Route = createFileRoute("/desk/admin/agents")({
  component: function AgentsRoute() {
    const agents = useQuery({ queryKey: [...queryKeys.me, "agents"], queryFn: () => apiFetch<MockAgent[]>("/admin/agents") });
    return (
      <Panel lit>
        <PanelHeader eyebrow="Admin \u00b7 Agents" title="Agent management" description="Invite by email, track status, deactivate with ticket release." />
        <div className="p-6 sm:p-8">
          {agents.isPending && <div aria-busy="true" aria-label="Loading agents"><Skeleton className="h-10 w-full" /><Skeleton className="mt-2 h-10 w-full" /></div>}
          {agents.isError && <p role="alert">Couldn\u0027t load agents. Try again.</p>}
          {agents.data && <AgentTable initialAgents={agents.data} />}
        </div>
      </Panel>
    );
  },
});
