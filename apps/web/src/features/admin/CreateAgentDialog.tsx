"use client";

import { useState } from "react";
import { agentEmailSchema } from "@pearl27/contracts";

import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/Dialog";
import { apiFetch, ApiError } from "@/lib/api";
import type { MockAgent } from "@/mocks/fixtures";

/** Create-agent dialog: single email field, domain validated inline before any request. */
export function CreateAgentDialog({ onCreated }: { onCreated: (agent: MockAgent) => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = agentEmailSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.flatten().fieldErrors.email?.[0] ?? "Enter a valid email address");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const agent = await apiFetch<MockAgent>("/admin/agents", {
        method: "POST",
        body: JSON.stringify({ email: parsed.data.email }),
      });
      onCreated(agent);
      setOpen(false);
      setEmail("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create this agent.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Create agent
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Create agent</DialogTitle>
          <DialogDescription>
            They activate on first Google sign-in with this address.
          </DialogDescription>
          <form onSubmit={submit} className="mt-4 flex flex-col gap-3" noValidate>
            <label htmlFor="agent-email" className="text-sm font-medium text-pearl">
              Work email
            </label>
            <input
              id="agent-email"
              type="email"
              autoComplete="email"
              placeholder="ada@pearl27.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "agent-email-error" : undefined}
              className="min-h-11 rounded-[2px] border border-ink-600 bg-white px-3 text-sm text-pearl"
            />
            {error && (
              <p id="agent-email-error" role="alert" className="text-[13px] text-rose-400">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" loading={saving}>
                Send invite
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
