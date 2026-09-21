"use client";

import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/shadcn/button";
import { queryKeys } from "@/lib/query";

import { landingTarget } from "./mockSession";
import { completeGoogleSignIn, hasLiveSession, startGoogleSignIn } from "./googleOAuth";

function GoogleMark() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.9z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.7 2.8v.1C3.4 21.4 7.4 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.6-2.8H1.4C.5 8.5 0 10.2 0 12s.5 3.5 1.4 5.3l3.8-2.9z"
      />
      <path
        fill="#EA4335"
        d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.7l3.8 2.9c1-2.8 3.7-4.9 6.8-4.9z"
      />
    </svg>
  );
}

/** One-click Google entrypoint for live mode. OTP stays below as fallback. */
export function GoogleOAuthButton({ next }: { next?: string }) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function begin() {
    setError(null);
    setStarting(true);
    try {
      await startGoogleSignIn();
      // Browser leaves for Google here; if we are still mounted the
      // redirect never started.
      setStarting(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't start Google sign-in. Try again.");
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" onClick={() => void begin()} disabled={starting} aria-busy={starting || undefined}>
        {starting ? <Loader2 className="animate-spin" aria-hidden /> : <GoogleMark />}
        {starting ? "Opening Google…" : "Continue with Google"}
      </Button>
      {error && (
        <p role="alert" className="text-[13px] text-rose-600">
          {error}
        </p>
      )}
      <p className="text-[12px] text-fog">Work domain only — use your @pearl27.com Google account.</p>
    </div>
  );
}

/**
 * Completes Google sign-in after the redirect back to `/sign-in`.
 *
 * Must NOT gate on `?insforge_code=` in the URL: the SDK strips that param
 * synchronously at import time and exchanges it in the background, so by
 * mount time it is always gone. Instead: settle, check for a session token,
 * and only then resolve the role + navigate. No token = plain sign-in page.
 */
export function GoogleCallbackHandler({ next }: { next?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!(await hasLiveSession())) return;
      if (!cancelled) setCompleting(true);
      try {
        const { landing, profile } = await completeGoogleSignIn();
        if (cancelled) return;
        if (profile) queryClient.setQueryData(queryKeys.me, profile);
        else void queryClient.invalidateQueries({ queryKey: queryKeys.me });
        navigate({ to: landingTarget(next, landing) });
      } catch (cause: unknown) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Google sign-in didn't complete. Try again.");
          setCompleting(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <p role="alert" className="text-[13px] text-rose-600">
        {error}{" "}
        <button type="button" onClick={() => window.location.replace("/sign-in")} className="font-medium underline underline-offset-4">
          Try again
        </button>
      </p>
    );
  }
  if (completing) {
    return (
      <p role="status" className="flex items-center gap-2 text-[13px] text-mist">
        <Loader2 className="animate-spin" aria-hidden /> Completing Google sign-in…
      </p>
    );
  }
  return null;
}
