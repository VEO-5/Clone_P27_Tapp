import { ChevronRight, PanelLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function DeskBreadcrumb({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-3 text-[15px]">
      <PanelLeft className="size-5 text-pearl" aria-hidden />
      <span className="h-5 w-px bg-ink-700" aria-hidden />
      <ol className="flex items-center gap-2">
        {trail.map((item, index) => {
          const last = index === trail.length - 1;
          const content: ReactNode = last ? (
            <span aria-current="page" className="font-medium text-pearl">
              {item.label}
            </span>
          ) : item.href ? (
            <Link href={item.href} className="text-fog transition-colors hover:text-pearl">
              {item.label}
            </Link>
          ) : (
            <span className="text-fog">{item.label}</span>
          );
          return (
            <li key={item.label} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="size-4 text-fog" aria-hidden />}
              {content}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
