"use client";

import { LinkButton } from "@/components/ui/Button";
import { EmptyState, Panel } from "@/components/ui/Panel";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const schemaMissing = /tables are not set up|Could not find the table/i.test(error.message);

  return (
    <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
      <Panel tone="night">
        <EmptyState
          tone="night"
          title={schemaMissing ? "Database is not set up yet" : "Something went wrong"}
          description={
            schemaMissing
              ? "Open the Supabase SQL Editor, paste supabase/schema.sql, and run it once. Then refresh this page."
              : "Try again. If this keeps happening, check the server log."
          }
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-11 items-center justify-center rounded-[2px] bg-iris-500 px-7 text-sm font-medium text-white"
              >
                Try again
              </button>
              <LinkButton href="/" variant="night">
                Back home
              </LinkButton>
            </div>
          }
        />
      </Panel>
    </div>
  );
}
