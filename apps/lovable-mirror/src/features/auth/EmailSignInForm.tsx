"use client";

import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/shadcn/button";
import { Field, Input } from "@/components/ui/Form";
import { config } from "@/lib/config";
import { queryKeys } from "@/lib/query";

import { landingTarget, mockSignInWithEmail } from "./mockSession";
import { liveRequestCode, liveVerifyCode } from "./liveSession";

/**
 * Email sign-in. Mock mode: any @pearl27.com address works via the worker.
 * Live mode (VITE_API_MOCK=false): passwordless InsForge OTP — email first,
 * then a 6-digit code. New addresses become employees; roles resolve
 * server-side from profiles.
 */
export function EmailSignInForm({ next }: { next?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  // Resend cooldown: stops resend-storms from tripping send throttles and
  // matches the backend minimum interval between auth emails.
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const live = config.insforgeLive;

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const timer = setTimeout(() => setCooldownLeft((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldownLeft]);

  function friendlySendError(cause: unknown): string {
    const message = cause instanceof Error ? cause.message : "Couldn't send the code. Try again.";
    if (/too many|rate|limit|throttl|try again later|wait/i.test(message)) {
      return "Too many codes sent — wait a minute and try again.";
    }
    return message;
  }

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
      if (!live) {
        const { landing, profile } = await mockSignInWithEmail(value);
        if (profile) queryClient.setQueryData(queryKeys.me, profile);
        else await queryClient.invalidateQueries({ queryKey: queryKeys.me });
        navigate({ to: landingTarget(next, landing) });
        return;
      }
      if (!codeSent) {
        try {
          await liveRequestCode(value);
        } catch (cause) {
          setError(friendlySendError(cause));
          return;
        }
        setCodeSent(true);
        setCooldownLeft(60);
        return;
      }
      if (!code.trim()) {
        setError("Enter the 6-digit code from your email");
        return;
      }
      const { landing, profile } = await liveVerifyCode(value.toLowerCase(), code);
      if (profile) queryClient.setQueryData(queryKeys.me, profile);
      else await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      navigate({ to: landingTarget(next, landing) });
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
          disabled={signingIn || (live && codeSent)}
          onChange={(event) => setEmail(event.target.value)}
          aria-describedby={error ? "mock-email-error" : undefined}
          aria-invalid={Boolean(error) || undefined}
        />
      </Field>
      {live && codeSent && (
        <Field htmlFor="email-code" label="6-digit code">
          <Input
            id="email-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            disabled={signingIn}
            onChange={(event) => setCode(event.target.value)}
            aria-describedby={error ? "mock-email-error" : undefined}
            aria-invalid={Boolean(error) || undefined}
          />
        </Field>
      )}
      {error && (
        <p id="mock-email-error" role="alert" className="text-[13px] text-rose-600">
          {error}
        </p>
      )}
      <Button type="submit" disabled={signingIn} aria-busy={signingIn || undefined}>
        {signingIn ? <Loader2 className="animate-spin" aria-hidden /> : <Mail className="size-4" aria-hidden />}
        {live ? (codeSent ? "Verify code" : "Send code") : "Continue with email"}
      </Button>
      {live && codeSent && (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={signingIn || cooldownLeft > 0}
            onClick={() => {
              const value = email.trim();
              if (!value || signingIn) return;
              setSigningIn(true);
              liveRequestCode(value)
                .then(() => {
                  setError(null);
                  setCooldownLeft(60);
                })
                .catch((cause: unknown) => setError(friendlySendError(cause)))
                .finally(() => setSigningIn(false));
            }}
            className="text-[13px] text-fog underline underline-offset-2 disabled:no-underline disabled:opacity-60"
          >
            {cooldownLeft > 0 ? `Resend code in ${cooldownLeft}s` : "Resend code"}
          </button>
          <button
            type="button"
            disabled={signingIn}
            onClick={() => {
              setCodeSent(false);
              setCode("");
              setError(null);
              setCooldownLeft(0);
            }}
            className="text-[13px] text-fog underline underline-offset-2"
          >
            Use a different email
          </button>
        </div>
      )}
    </form>
  );
}
