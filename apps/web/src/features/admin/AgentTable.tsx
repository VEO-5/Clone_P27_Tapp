"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/Dialog";
import { Table, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { apiFetch } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import type { MockAgent } from "@/mocks/fixtures";

import { CreateAgentDialog } from "./CreateAgentDialog";

const STATUS_LABEL: Record<MockAgent["status"], string> = {
  active: "Active",
  invited: "Invited",
  deactivated: "Deactivated",
};

export function AgentTable({ initialAgents }: { initialAgents: MockAgent[] }) {
  const [agents, setAgents] = useState(initialAgents);
  const [confirming, setConfirming] = useState<MockAgent | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function deactivate(agent: MockAgent) {
    const updated = await apiFetch<MockAgent>(`/admin/agents/${agent.id}`, { method: "DELETE" });
    setAgents((list) => list.map((item) => (item.id === agent.id ? updated : item)));
    setConfirming(null);
    setNotice(`${agent.email} deactivated — their ${agent.openTickets} open tickets were released to Pending.`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-mist" aria-live="polite">
          {notice ?? `${agents.length} agents`}
        </p>
        <CreateAgentDialog onCreated={(agent) => {
          setAgents((list) => [agent, ...list]);
          setNotice(`Invite sent to ${agent.email} — activates on first sign-in.`);
        }} />
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Open tickets</TableHeaderCell>
            <TableHeaderCell>Last seen</TableHeaderCell>
            <TableHeaderCell>
              <span className="sr-only">Actions</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <tbody>
          {agents.map((agent) => (
            <TableRow key={agent.id}>
              <TableCell>
                <span className="block font-medium">{agent.name}</span>
                <span className="block text-[12.5px] text-fog">{agent.email}</span>
                {agent.status === "invited" && (
                  <span className="block text-[12.5px] text-fog">Invited — activates on first sign-in</span>
                )}
              </TableCell>
              <TableCell>{STATUS_LABEL[agent.status]}</TableCell>
              <TableCell>{agent.openTickets}</TableCell>
              <TableCell>{agent.lastSeen ? formatRelative(agent.lastSeen) : "—"}</TableCell>
              <TableCell>
                {agent.status !== "deactivated" && (
                  <Button variant="secondary" size="sm" onClick={() => setConfirming(agent)}>
                    Deactivate
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>

      <Dialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent>
          <DialogTitle>Deactivate {confirming?.email}?</DialogTitle>
          <DialogDescription>
            {confirming && confirming.openTickets > 0
              ? `Their ${confirming.openTickets} open tickets will be released to Pending.`
              : "They will lose access immediately."}
          </DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => confirming && void deactivate(confirming)}
            >
              Deactivate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
