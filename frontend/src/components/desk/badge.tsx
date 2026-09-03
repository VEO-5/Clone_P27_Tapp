import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const deskBadgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        open: "border-aqua-400/25 bg-aqua-400/10 text-aqua-500",
        inProgress: "border-gold-400/25 bg-gold-400/10 text-iris-600",
        resolved: "border-jade-400/25 bg-jade-400/10 text-jade-400",
        closed: "border-ink-600 bg-ink-900 text-mist",
        urgent: "border-rose-400/30 bg-rose-400/10 text-rose-400",
        neutral: "border-ink-600 bg-ink-900 text-mist",
        copper: "border-iris-400/25 bg-iris-400/10 text-iris-600",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface DeskBadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof deskBadgeVariants> {}

export function DeskBadge({ className, variant, ...props }: DeskBadgeProps) {
  return <span className={cn(deskBadgeVariants({ variant }), className)} {...props} />;
}
