"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Assignee, DeskTicket } from "@pearl27/contracts";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/Dialog";
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
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Release
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Release {ticket.reference}?</DialogTitle>
          <DialogDescription>
            It returns to Unassigned + Pending. A reason helps the next agent pick it up.
          </DialogDescription>
          <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
            <label htmlFor={`release-reason-${ticket.id}`} className="text-sm font-medium text-pearl">
              Reason <span className="font-normal text-fog">(optional)</span>
            </label>
            <input
              id={`release-reason-${ticket.id}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              placeholder="e.g. Handing over shift"
              className="min-h-11 rounded-[2px] border border-ink-600 bg-white px-3 text-sm text-pearl"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" loading={saving}>
                Release ticket
              </Button>
            </div>
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
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Assign…
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Assign {ticket.reference}</DialogTitle>
          <DialogDescription>Pick the agent who owns this ticket next.</DialogDescription>
          <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
            <label htmlFor={`assign-agent-${ticket.id}`} className="text-sm font-medium text-pearl">
              Agent
            </label>
            <select
              id={`assign-agent-${ticket.id}`}
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
              className="min-h-11 rounded-[2px] border border-ink-600 bg-white px-3 text-sm text-pearl"
            >
              <option value="">Choose an agent</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" loading={saving} disabled={!assigneeId}>
                Assign
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
