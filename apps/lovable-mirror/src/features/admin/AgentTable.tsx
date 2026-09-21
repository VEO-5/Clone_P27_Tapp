// @ts-nocheck
"use client";

import { useState } from "react";

import { toast } from "sonner";

import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/shadcn/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/table";
import { apiFetch } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import { recordMockDirectory, type MockAgent } from "@/mocks/fixtures";

import { CreateAgentDialog } from "./CreateAgentDialog";

const STATUS_LABEL: Record<MockAgent["status"], string> = {
  active: "Active",
  invited: "Invited",
  deactivated: "Deactivated",
};

const STATUS_BADGE: Record<MockAgent["status"], "default" | "secondary" | "outline"> = {
  active: "default",
  invited: "secondary",
  deactivated: "outline",
};

export function AgentTable({ initialAgents }: { initialAgents: MockAgent[] }) {
  const [agents, setAgents] = useState(initialAgents);
  const [confirming, setConfirming] = useState<MockAgent | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function deactivate(agent: MockAgent) {
    try {
      const updated = await apiFetch<MockAgent>(`/admin/agents/${agent.id}`, { method: "DELETE" });
      // Journal the removal so a refresh can't resurrect the account.
      recordMockDirectory({ role: "agent", email: updated.email, name: updated.name, status: updated.status });
      setAgents((list) => list.map((item) => (item.id === agent.id ? updated : item)));
      setConfirming(null);
      setNotice(`${agent.email} deactivated — their ${agent.openTickets} open tickets were released to Pending.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't deactivate this agent.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {notice ?? `${agents.length} agents`}
        </p>
        <CreateAgentDialog onCreated={(agent) => {
          setAgents((list) => [agent, ...list]);
          setNotice(`Invite sent to ${agent.email} — activates on first sign-in.`);
        }} />
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
        <Table aria-label="Agents">
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Open tickets</TableHead>
              <TableHead>Last seen</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell>
                  <span className="flex items-center gap-3">
                    <UserAvatar email={agent.email} name={agent.name} className="size-8" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{agent.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{agent.email}</span>
                      {agent.status === "invited" && (
                        <span className="block text-xs text-muted-foreground">Invited — activates on first sign-in</span>
                      )}
                    </span>
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[agent.status]}>{STATUS_LABEL[agent.status]}</Badge>
                </TableCell>
                <TableCell>{agent.openTickets}</TableCell>
                <TableCell className="text-muted-foreground">{agent.lastSeen ? formatRelative(agent.lastSeen) : "—"}</TableCell>
                <TableCell className="text-right">
                  {agent.status !== "deactivated" && (
                    <Button variant="outline" size="sm" onClick={() => setConfirming(agent)}>
                      Deactivate
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent>
          <DialogTitle>Deactivate {confirming?.email}?</DialogTitle>
          <DialogDescription>
            {confirming && confirming.openTickets > 0
              ? `Their ${confirming.openTickets} open tickets will be released to Pending.`
              : "They will lose access immediately."}
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => confirming && void deactivate(confirming)}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}