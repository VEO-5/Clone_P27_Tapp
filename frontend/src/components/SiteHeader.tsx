"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Submit a ticket" },
  { href: "/my-tickets", label: "My tickets" },
  { href: "/admin", label: "Support desk" },
] as const;

export function SiteHeader({ employeeEmail }: { employeeEmail?: string | null }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(27,42,74,0.12)] bg-[rgba(250,249,246,0.92)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          {/* Official mark from pearl27.com */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pearl27-logo.png" alt="Pearl 27" className="h-9 w-auto" />
          <span className="hidden flex-col leading-none sm:flex">
            <span className="font-display text-[15px] font-medium tracking-[0.18em] text-pearl">
              PEARL 27
            </span>
            <span className="mt-1 font-mono text-[10px] tracking-[0.14em] text-fog">
              SPHERE SUPPORT
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <nav aria-label="Primary" className="flex items-center gap-6">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "group relative py-1 font-display text-[13px] transition-colors",
                  isActive(item.href) ? "text-pearl" : "text-mist hover:text-pearl",
                )}
              >
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.label.split(" ")[0]}</span>
                <span
                  className={cn(
                    "absolute -bottom-1 left-0 h-0.5 bg-iris-500 transition-all duration-200",
                    isActive(item.href) ? "w-full" : "w-0 group-hover:w-full",
                  )}
                />
              </Link>
            ))}
          </nav>

          {employeeEmail && (
            <p
              className="hidden max-w-[10rem] truncate font-mono text-[10px] text-fog lg:block"
              title={employeeEmail}
            >
              {employeeEmail}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
