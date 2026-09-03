import * as Slot from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const deskButtonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-pearl text-cream shadow-sm hover:bg-pearl-dim",
        copper: "bg-iris-500 text-white shadow-sm hover:bg-iris-600",
        secondary: "border border-ink-600 bg-white text-pearl shadow-xs hover:bg-ink-900",
        ghost: "text-mist hover:bg-ink-900 hover:text-pearl",
        danger: "border border-rose-400/30 bg-rose-400/10 text-rose-400 hover:bg-rose-400/15",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-9 px-4",
        lg: "h-10 px-6",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface DeskButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof deskButtonVariants> {
  asChild?: boolean;
}

export function DeskButton({ className, variant, size, asChild, ...props }: DeskButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(deskButtonVariants({ variant, size }), className)} {...props} />;
}
