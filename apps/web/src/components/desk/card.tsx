import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * Desk primitives — shadcn-style building blocks scoped to the support desk
 * (`/admin*`). Pearl tokens (ink borders, pearl ink text, copper accents) so
 * the desk feels professional without leaking into the employee-side custom kit.
 */

export function DeskCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-ink-700 bg-white text-pearl",
        "shadow-[0_1px_2px_rgba(27,42,74,0.06),0_8px_24px_-12px_rgba(27,42,74,0.12)]",
        className,
      )}
      {...props}
    />
  );
}

export function DeskCardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 px-6 pt-6", className)} {...props} />;
}

export function DeskCardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display text-lg font-semibold tracking-tight text-pearl", className)}
      {...props}
    />
  );
}

export function DeskCardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-relaxed text-mist", className)} {...props} />;
}

export function DeskCardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pb-6 pt-4", className)} {...props} />;
}
