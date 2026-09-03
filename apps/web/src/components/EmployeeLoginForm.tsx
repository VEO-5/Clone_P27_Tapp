"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, Inbox } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { Panel } from "@/components/ui/Panel";

export function EmployeeLoginForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/me/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.fieldErrors?.email ?? payload?.error ?? "Could not open your inbox.");
        return;
      }

      router.replace("/my-tickets");
      router.refresh();
    } catch {
      setError("Network error — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Panel lit>
      <form onSubmit={submit} noValidate className="flex flex-col">
        <div className="border-b border-ink-700/70 px-6 py-6 sm:px-8">
          <p className="eyebrow mb-2">Your tickets</p>
          <h1 className="text-xl font-semibold tracking-tight text-pearl">
            Sign in with your work email
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-mist">
            No password. Use the same address you submitted with and we&apos;ll open every ticket
            tied to it — Open, In progress, Resolved, and Closed.
          </p>
        </div>

        <div className="px-6 py-6 sm:px-8">
          <Field htmlFor="employee-email" label="Work email" error={error ?? undefined}>
            <Input
              id="employee-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              placeholder="you@pearl27.com"
              value={email}
              invalid={Boolean(error)}
              aria-describedby={error ? "employee-email-error" : undefined}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-4 border-t border-ink-700/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div aria-live="assertive" className="min-h-5 flex-1">
            {error && (
              <p className="flex items-start gap-2 text-[13px] text-rose-400">
                <AlertTriangle className="mt-px size-4 shrink-0" aria-hidden />
                {error}
              </p>
            )}
          </div>
          <Button
            type="submit"
            loading={submitting}
            icon={<Inbox className="size-4" aria-hidden />}
            className="w-full sm:w-auto"
          >
            {submitting ? "Opening…" : "Open my tickets"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
