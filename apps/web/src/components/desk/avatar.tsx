import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import type { ComponentProps, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function DeskAvatar({
  className,
  ...props
}: ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative flex size-9 shrink-0 overflow-hidden rounded-full border border-ink-700 bg-ink-900",
        className,
      )}
      {...props}
    />
  );
}

export function DeskAvatarFallback({
  className,
  ...props
}: ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-pearl text-[11px] font-semibold text-cream",
        className,
      )}
      {...props}
    />
  );
}

export function DeskSeparator({
  className,
  ...props
}: ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      className={cn("shrink-0 bg-ink-700 data-horizontal:h-px data-horizontal:w-full", className)}
      {...props}
    />
  );
}

export function DeskSkeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-ink-700/70", className)} {...props} />;
}
