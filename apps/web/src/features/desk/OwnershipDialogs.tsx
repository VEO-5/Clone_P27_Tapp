"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Assignee, DeskTicket } from "@pearl27/contracts";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/shadcn/dialog";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { apiFetch, ApiError } from "@/lib/api";

/** Release to unassigned — reason optional (FE-3.8). Assignee or admin only. */
export function ReleaseDialog({ ticket }: { ticket: DeskTicket }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/desk/tickets/${ticket.id}/release`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      await queryClient.invalidateQueries({ queryKey: ["desk", "tickets"] });
      toast.success("Released to unassigned");
      setOpen(false);
      setReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't release this ticket.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Release
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Release {ticket.reference}?</DialogTitle>
          <DialogDescription>
            It returns to Unassigned + Pending. A reason helps the next agent pick it up.
          </DialogDescription>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`release-reason-${ticket.id}`}>
                Reason <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id={`release-reason-${ticket.id}`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                placeholder="e.g. Handing over shift"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" aria-hidden />}
                Release ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Admin assign/reassign with an agent picker (FE-3.9). */
export function AssignDialog({ ticket, agents }: { ticket: DeskTicket; agents: Assignee[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [assigneeId, setAssigneeId] = useState(ticket.assignee?.id ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!assigneeId) return;
    setSaving(true);
    try {
      await apiFetch(`/desk/tickets/${ticket.id}/assign`, {
        method: "POST",
        body: JSON.stringify({ assigneeId }),
      });
      await queryClient.invalidateQueries({ queryKey: ["desk", "tickets"] });
      toast.success("Ticket reassigned");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't assign this ticket.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Assign…
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Assign {ticket.reference}</DialogTitle>
          <DialogDescription>Pick the agent who owns this ticket next.</DialogDescription>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`assign-agent-${ticket.id}`}>Agent</Label>
              <select
                id={`assign-agent-${ticket.id}`}
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <option value="">Choose an agent</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={saving || !assigneeId}>
                {saving && <Loader2 className="animate-spin" aria-hidden />}
                Assign
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}