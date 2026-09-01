"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, KeyRound } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { Panel } from "@/components/ui/Panel";

export function AdminLoginForm() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? "Invalid access code");
        return;
      }

      router.replace("/admin");
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
          <p className="eyebrow mb-2">System Support</p>
          <h1 className="text-xl font-semibold tracking-tight text-pearl">Sign in to the desk</h1>
          <p className="mt-1.5 text-sm text-mist">
            Use the support access code. The session is stored in an HttpOnly cookie.
          </p>
        </div>

        <div className="px-6 py-6 sm:px-8">
          <Field htmlFor="accessCode" label="Access code" error={error ?? undefined}>
            <Input
              id="accessCode"
              name="accessCode"
              type="password"
              autoComplete="current-password"
              autoFocus
              placeholder="Enter the support access code"
              value={accessCode}
              invalid={Boolean(error)}
              aria-describedby={error ? "accessCode-error" : undefined}
              onChange={(event) => {
                setAccessCode(event.target.value);
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
            icon={<KeyRound className="size-4" aria-hidden />}
            className="w-full sm:w-auto"
          >
            {submitting ? "Signing in…" : "Enter desk"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
