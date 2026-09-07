"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/shadcn/button";
import { Field, Input } from "@/components/ui/Form";
import { queryKeys } from "@/lib/query";

import { landingTarget, mockSignInWithEmail } from "./mockSession";

/**
 * Mock-mode email sign-in. Any @pearl27.com address works: named seeds and
 * invited desk accounts resolve to their roles, everything else signs in as
 * an employee (no account needed). Deactivated accounts fall back to
 * employee with a demoted flag. Rejected addresses get an inline error and
 * no session is created.
 */
export function EmailSignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = email.trim();
    if (!value) {
      setError("Enter your work email address");
      return;
    }
    setError(null);
    setSigningIn(true);
    try {
      const { landing, profile } = await mockSignInWithEmail(value);
      if (profile) queryClient.setQueryData(queryKeys.me, profile);
      else await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      router.push(landingTarget(next, landing));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't sign you in. Try again.");
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3" noValidate={false}>
      <Field htmlFor="mock-email" label="Work email">
        <Input
          id="mock-email"
          type="email"
          autoComplete="email"
          placeholder="you@pearl27.com"
          value={email}
          disabled={signingIn}
          onChange={(event) => setEmail(event.target.value)}
          aria-describedby={error ? "mock-email-error" : undefined}
          aria-invalid={Boolean(error) || undefined}
        />
      </Field>
      {error && (
        <p id="mock-email-error" role="alert" className="text-[13px] text-rose-600">
          {error}
        </p>
      )}
      <Button type="submit" disabled={signingIn} aria-busy={signingIn || undefined}>
        {signingIn ? <Loader2 className="animate-spin" aria-hidden /> : <Mail className="size-4" aria-hidden />}
        Continue with email
      </Button>
    </form>
  );
}
