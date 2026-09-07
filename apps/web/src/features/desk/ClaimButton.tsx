"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { DeskTicket } from "@pearl27/contracts";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/shadcn/button";
import { ApiError, apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Pessimistic claim: 409 names the winner and refreshes the row (FE-3.7). */
export function ClaimButton({ ticket, compact = false, className }: { ticket: DeskTicket; compact?: boolean; className?: string }) {
  const queryClient = useQueryClient();
  const [claiming, setClaiming] = useState(false);

  async function claim() {
    if (claiming) return;
    setClaiming(true);
    try {
      await apiFetch(`/desk/tickets/${ticket.id}/claim`, { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["desk", "tickets"] });
      toast.success("Assigned to you");
    } catch (error) {
      if (error instanceof ApiError && error.code === "ALREADY_ASSIGNED") {
        const assignee = error.details?.assignee as { name?: string } | undefined;
        const name = assignee?.name ?? parseAssignee(error.message);
        toast.error(`Already taken by ${name}`);
        await queryClient.invalidateQueries({ queryKey: ["desk", "tickets"] });
      } else {
        toast.error(error instanceof Error ? error.message : "Couldn't assign this ticket.");
      }
    } finally {
      setClaiming(false);
    }
  }

  return (
    <Button
      size={compact ? "xs" : "sm"}
      variant={compact ? "outline" : "default"}
      disabled={claiming}
      onClick={() => void claim()}
      aria-label={`Assign ${ticket.reference} to me`}
      aria-busy={claiming || undefined}
      className={cn(className)}
    >
      {claiming && <Loader2 className="animate-spin" aria-hidden />}
      Assign to me
    </Button>
  );
}

function parseAssignee(message: string): string {
  const match = /taken by (.+)$/.exec(message);
  return match?.[1] ?? "another agent";
}
