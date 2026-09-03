import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto rounded-[4px] border border-ink-700">
      <table className={cn("w-full text-left text-sm", className)}>{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="bg-ink-900 text-[12px] uppercase tracking-wide text-fog">{children}</thead>;
}

export function TableRow({ children }: { children: ReactNode }) {
  return <tr className="border-t border-ink-700 first:border-t-0">{children}</tr>;
}

export function TableHeaderCell({ children, ...props }: { children: ReactNode } & ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th scope="col" className="min-h-11 px-4 py-3 font-semibold" {...props}>
      {children}
    </th>
  );
}

export function TableCell({ children, ...props }: { children: ReactNode } & TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className="px-4 py-3 text-pearl-dim" {...props}>
      {children}
    </td>
  );
}
