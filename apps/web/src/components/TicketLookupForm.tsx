"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { isValidReference, normaliseReference } from "@/lib/reference";

/**
 * One input for both lookup modes: anything shaped like a reference goes
 * straight to the ticket page, anything with an "@" lists that employee's
 * tickets. Fewer decisions for someone who just wants their status.
 */
export function TicketLookupForm({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("email") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Reset the spinner when navigation lands (params change) — adjusted during
  // render from the previous params instead of syncing in an effect.
  const paramsKey = searchParams.toString();
  const [seenParams, setSeenParams] = useState(paramsKey);
  if (seenParams !== paramsKey) {
    setSeenParams(paramsKey);
    setPending(false);
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();

    if (!value) {
      setError("Enter a ticket reference or the email you used");
      return;
    }

    setError(null);
    setPending(true);

    if (value.includes("@")) {
      try {
        const response = await fetch("/api/me/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: value.toLowerCase() }),
        });
        if (!response.ok) {
          setPending(false);
          setError("Enter a valid work email address");
          return;
        }
        router.push("/my-tickets");
        router.refresh();
      } catch {
        setPending(false);
        setError("Network error — try again.");
      }
    } else if (isValidReference(value)) {
      router.push(`/track/${normaliseReference(value)}`);
    } else {
      setPending(false);
      setError("That doesn't look like a reference (e.g. PRL-7K4M2X) or an email address");
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-fog"
            aria-hidden
          />
          <label htmlFor="lookup" className="sr-only">
            Ticket reference or email address
          </label>
          <Input
            id="lookup"
            name="lookup"
            autoFocus={autoFocus}
            autoComplete="off"
            spellCheck={false}
            placeholder="PRL-7K4M2X  or  you@pearl27.com"
            value={query}
            invalid={Boolean(error)}
            aria-describedby={error ? "lookup-error" : undefined}
            className="pl-11"
            onChange={(event) => {
              setQuery(event.target.value);
              setError(null);
            }}
          />
        </div>
        <Button type="submit" size="lg" loading={pending} className="sm:px-8">
          Find ticket
        </Button>
      </div>

      <div aria-live="polite" className="min-h-[1.1rem]">
        {error && (
          <p id="lookup-error" className="text-[12.5px] text-rose-400">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
