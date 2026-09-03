import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-[2px] bg-ink-700/60", className ?? "h-4 w-full")}
    />
  );
}
