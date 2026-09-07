"use client";

import { useState } from "react";
import { agentEmailSchema } from "@pearl27/contracts";
import { Loader2 } from "lucide-react";

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
import type { MockAgent } from "@/mocks/fixtures";

/** Create-admin dialog: single email field, domain validated inline before any request. */
export function CreateAdminDialog({ onCreated }: { onCreated: (admin: MockAgent) => void }) {
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
      const admin = await apiFetch<MockAgent>("/admin/admins", {
        method: "POST",
        body: JSON.stringify({ email: parsed.data.email }),
      });
      onCreated(admin);
      setOpen(false);
      setEmail("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create this admin.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Create admin
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Create admin</DialogTitle>
          <DialogDescription>
            They get full admin access on first Google sign-in with this address.
          </DialogDescription>
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="admin-email">Work email</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                placeholder="ama@pearl27.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "admin-email-error" : undefined}
              />
              {error && (
                <p id="admin-email-error" role="alert" className="text-[13px] text-destructive">
                  {error}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" aria-hidden />}
                Send invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
