"use client";

import Link from "next/link";

import { Button } from "@/components/shadcn/button";
import { EmptyState, Panel } from "@/components/ui/Panel";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
      <Panel tone="night">
        <EmptyState
          tone="night"
          title="Something went wrong"
          description="Try again. If this keeps happening, contact System Support."
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={reset}>
                Try again
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/">Back home</Link>
              </Button>
            </div>
          }
        />
      </Panel>
    </div>
  );
}