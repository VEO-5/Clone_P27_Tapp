import { createFileRoute } from "@tanstack/react-router";

// Mirrors admin agents page -> AgentTable (invite by email, deactivate).
export const Route = createFileRoute("/desk/admin/agents")({
  component: function AgentsComponent() {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="eyebrow">Admin · Agents</p>
        <h1>Agent management</h1>
        <p className="text-sm opacity-70">PORT: features/admin/AgentTable.</p>
      </div>
    );
  },
});
