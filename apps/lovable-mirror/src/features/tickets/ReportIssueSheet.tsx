"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { Button } from "@/components/shadcn/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/shadcn/sheet";
import { useSession } from "@/features/auth/useSession";

import { TicketForm } from "./TicketForm";
import { useTicketSubmit } from "./useTicketSubmit";

/**
 * Report-an-issue slide-over (image-1 pattern, image-2 content).
 * Controlled — each trigger site owns `open` state and renders this sibling.
 * `/tickets/new` stays as the shareable/no-JS fallback with the same engine.
 *
 * Submit flow: the ticket posts and the full confirmation (reference,
 * uploads + retry, View ticket) renders inline in the slide-over body.
 */
export function ReportIssueSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const session = useSession();
  const queryClient = useQueryClient();
  const formId = useId();
  const controller = useTicketSubmit();
  const { result, submitting } = controller;
  // Tracks tickets already announced so upload progress updates on the
  // same result never re-fire the refresh.
  const announcedRef = useRef<string | null>(null);

  // Refresh lists behind the slide-over once per submitted ticket.
  useEffect(() => {
    if (result && announcedRef.current !== result.ticket.id) {
      announcedRef.current = result.ticket.id;
      void queryClient.invalidateQueries({ queryKey: ["tickets", "mine"] });
      void queryClient.invalidateQueries({ queryKey: ["desk", "tickets"] });
    }
    if (!result) {
      announcedRef.current = null;
    }
  }, [result, queryClient]);

  function handleOpenChange(next: boolean) {
    // Block dismiss while the ticket is posting — never strand a silent ticket.
    if (!next && submitting && !result) return;
    if (next) {
      // Fresh blank form on every open (abandoned drafts don't linger).
      controller.reset();
    }
    onOpenChange(next);
  }

  const dismissBlocked = submitting && !result;

  return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="w-full gap-0 p-0 sm:max-w-2xl"
          onEscapeKeyDown={(e) => {
            if (dismissBlocked) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (dismissBlocked) e.preventDefault();
          }}
        >
          <SheetHeader className="shrink-0 border-b border-ink-700/70 px-6 py-5 text-left">
            <p className="eyebrow mb-2">New support request</p>
            <SheetTitle className="text-xl font-semibold tracking-tight">
              Tell us what&apos;s happening
            </SheetTitle>
            {session.data && (
              <SheetDescription aria-live="polite">
                Submitting as {session.data.name} · {session.data.email}
              </SheetDescription>
            )}
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            {open && (
              <TicketForm controller={controller} variant="bare" formId={formId} hideFooter />
            )}
          </div>

          <SheetFooter className="shrink-0 flex-row items-center justify-between border-t border-ink-700/70 px-6 py-4 sm:justify-between">
            <SheetClose asChild>
              <Button type="button" variant="outline" disabled={dismissBlocked}>
                {result ? "Close" : "Cancel"}
              </Button>
            </SheetClose>
            {!result && (
              <Button type="submit" form={formId} disabled={submitting} aria-busy={submitting || undefined}>
                {submitting ? <Loader2 className="animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
                {submitting ? "Submitting…" : "Submit ticket"}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
  );
}
