"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DeskButton } from "@/components/desk/button";
import {
  DeskDialog,
  DeskDialogDescription,
  DeskDialogFooter,
  DeskDialogHeader,
  DeskDialogTitle,
  DeskDialogTrigger,
  DeskDialogContent,
} from "@/components/desk/dialog";
import { DeskInput } from "@/components/desk/input";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  type Ticket,
} from "@/lib/types";
import { createTicketSchema, fieldErrorsFrom } from "@/lib/validation";

export function NewTicketDialog({ onCreated }: { onCreated?: (ticket: Ticket) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);

    const data = new FormData(event.currentTarget);
    const parsed = createTicketSchema.safeParse({
      employeeName: String(data.get("employeeName") ?? ""),
      employeeEmail: String(data.get("employeeEmail") ?? ""),
      title: String(data.get("title") ?? ""),
      description: String(data.get("description") ?? ""),
      category: String(data.get("category") ?? "other"),
      priority: String(data.get("priority") ?? "medium"),
    });

    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error));
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      const body = new FormData();
      Object.entries(parsed.data).forEach(([key, value]) => body.append(key, String(value)));
      const response = await fetch("/api/tickets", { method: "POST", body });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setErrors(payload?.fieldErrors ?? {});
        setFormError(payload?.error ?? "Could not create the ticket. Try again.");
        return;
      }
      setOpen(false);
      event.currentTarget.reset();
      if (payload?.ticket) onCreated?.(payload.ticket as Ticket);
      router.refresh();
    } catch {
      setFormError("Network error — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DeskDialog open={open} onOpenChange={setOpen}>
      <DeskDialogTrigger asChild>
        <DeskButton variant="copper" size="md">
          <Plus aria-hidden /> New Ticket
        </DeskButton>
      </DeskDialogTrigger>
      <DeskDialogContent>
        <DeskDialogHeader>
          <DeskDialogTitle>New ticket</DeskDialogTitle>
          <DeskDialogDescription>
            Log an issue on behalf of an employee. They get the reference by email.
          </DeskDialogDescription>
        </DeskDialogHeader>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-pearl">Employee name</span>
              <DeskInput name="employeeName" autoComplete="off" placeholder="Ada Lovelace" />
              {errors.employeeName && <span className="text-[13px] text-rose-400">{errors.employeeName}</span>}
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-pearl">Work email</span>
              <DeskInput name="employeeEmail" type="email" autoComplete="off" placeholder="ada@pearl27.com" />
              {errors.employeeEmail && <span className="text-[13px] text-rose-400">{errors.employeeEmail}</span>}
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-pearl">Issue title</span>
            <DeskInput name="title" autoComplete="off" placeholder="Can't sign in to Sphere" />
            {errors.title && <span className="text-[13px] text-rose-400">{errors.title}</span>}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-pearl">Category</span>
              <select
                name="category"
                defaultValue="other"
                className="flex h-9 w-full rounded-lg border border-ink-600 bg-white px-3 text-sm text-pearl focus:outline-none focus:ring-2 focus:ring-iris-500/40"
              >
                {TICKET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-pearl">Priority</span>
              <select
                name="priority"
                defaultValue="medium"
                className="flex h-9 w-full rounded-lg border border-ink-600 bg-white px-3 text-sm text-pearl focus:outline-none focus:ring-2 focus:ring-iris-500/40"
              >
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-pearl">Description</span>
            <textarea
              name="description"
              rows={4}
              placeholder="What is the employee experiencing?"
              className="w-full rounded-lg border border-ink-600 bg-white px-3 py-2 text-sm text-pearl placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-iris-500/40"
            />
            {errors.description && <span className="text-[13px] text-rose-400">{errors.description}</span>}
          </label>
          {formError && <p className="text-[13px] text-rose-400">{formError}</p>}
          <DeskDialogFooter>
            <DeskButton type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </DeskButton>
            <DeskButton type="submit" variant="copper" disabled={submitting}>
              {submitting ? "Creating…" : "Create ticket"}
            </DeskButton>
          </DeskDialogFooter>
        </form>
      </DeskDialogContent>
    </DeskDialog>
  );
}
