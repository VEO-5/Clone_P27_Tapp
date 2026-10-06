"use client";

import { config } from "@/lib/config";

/** Browser navigation to the API's Google entrypoint — the web never handles OIDC. */
export function SignInButton({ next }: { next?: string }) {
  const href = `${config.apiUrl}/auth/google?next=${encodeURIComponent(next ?? "/")}`;
  return (
    <a
      href={href}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[2px] bg-iris-500 px-7 text-sm font-medium text-white hover:bg-iris-600"
    >
      Continue with Google
    </a>
  );
}
