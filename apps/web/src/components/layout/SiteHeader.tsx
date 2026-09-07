"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

const NAV_BY_ROLE = {
  employee: [
    { href: "/tickets", label: "My tickets" },
    { href: "/tickets/new", label: "Report an issue" },
  ],
  agent: [
    { href: "/desk", label: "Dashboard" },
    { href: "/desk/queue", label: "Queue" },
    { href: "/tickets/new", label: "Report an issue" },
  ],
  admin: [
    { href: "/desk", label: "Desk" },
    { href: "/desk/admin", label: "Admin" },
    { href: "/tickets", label: "My tickets" },
  ],
  signedOut: [
    { href: "/tickets/new", label: "Submit a ticket" },
    { href: "/tickets", label: "My tickets" },
  ],
} as const;

function EmployeeAvatar({ email, avatarUrl }: { email: string; avatarUrl: string | null }) {
  return (
    <UserAvatar
      email={email}
      avatarUrl={avatarUrl}
      className="size-7 border border-ink-700"
      fallbackClassName="bg-pearl text-[10px] font-semibold text-cream"
    />
  );
}

export function SiteHeader({
  employeeEmail,
  employeeAvatarUrl,
  role = "signedOut",
  action,
}: {
  employeeEmail?: string | null;
  employeeAvatarUrl?: string | null;
  role?: keyof typeof NAV_BY_ROLE;
  action?: React.ReactNode;
}) {
  const pathname = usePathname();
  const NAV = NAV_BY_ROLE[role];

  // The desk is a full app shell — sidebar owns the logo, topbar owns utilities.
  // (Admin lives inside the desk shell, so /desk covers it too.)
  if (pathname.startsWith("/desk")) return null;

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
            <span className="hidden items-center gap-2 lg:flex">
              <EmployeeAvatar email={employeeEmail} avatarUrl={employeeAvatarUrl ?? null} />
              <p
                className="max-w-[10rem] truncate font-mono text-[10px] text-fog"
                title={employeeEmail}
              >
                {employeeEmail}
              </p>
              {action}
            </span>
          )}
          {employeeEmail && <span className="lg:hidden">{action}</span>}
        </div>
      </div>
    </header>
  );
}
