import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";

import { ReportIssueSheet } from "@/features/tickets/ReportIssueSheet";
import { cn, initials } from "@/lib/utils";

const NAV_BY_ROLE = {
  employee: [
    { to: "/tickets", label: "My tickets" },
    { to: "/tickets/new", label: "Report an issue" },
  ],
  agent: [
    { to: "/desk", label: "Dashboard" },
    { to: "/desk/queue", label: "Queue" },
    { to: "/tickets/new", label: "Report an issue" },
  ],
  admin: [
    { to: "/desk", label: "Desk" },
    { to: "/desk/admin", label: "Admin" },
    { to: "/tickets", label: "My tickets" },
  ],
  signedOut: [
    { to: "/tickets/new", label: "Submit a ticket" },
    { to: "/tickets", label: "My tickets" },
  ],
} as const;

/**
 * MIRROR avatar: initials circle with the same footprint as UserAvatar's
 * Radix fallback. The dicebear/ Radix avatar lands with the component port;
 * identity + layout are what this slice proves.
 */
function EmployeeAvatar({ email }: { email: string }) {
  return (
    <span
      aria-label={email}
      className="flex size-7 shrink-0 items-center justify-center rounded-full border border-ink-700 bg-pearl text-[10px] font-semibold text-cream"
    >
      {initials(email)}
    </span>
  );
}

export function SiteHeader({
  employeeEmail,
  role = "signedOut",
  action,
  hideNav = false,
}: {
  employeeEmail?: string | null;
  /** Accepted for signature parity; the dicebear avatar lands on arrival. */
  employeeAvatarUrl?: string | null;
  role?: keyof typeof NAV_BY_ROLE;
  action?: React.ReactNode;
  hideNav?: boolean;
}) {
  const pathname = useLocation().pathname;
  const NAV = NAV_BY_ROLE[role];
  const [reportOpen, setReportOpen] = useState(false);

  // The desk is a full app shell — sidebar owns the logo, topbar owns utilities.
  // (Admin lives inside the desk shell, so /desk covers it too.)
  if (pathname.startsWith("/desk")) return null;

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(27,42,74,0.12)] bg-[rgba(250,249,246,0.92)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          {/* Official mark from pearl27.com */}
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
          {!hideNav && (
            <nav aria-label="Primary" className="flex items-center gap-6">
              {NAV.map((item) =>
                item.to === "/tickets/new" ? (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => setReportOpen(true)}
                    className="group relative cursor-pointer py-1 font-display text-[13px] text-mist transition-colors hover:text-pearl"
                  >
                    <span className="hidden sm:inline">{item.label}</span>
                    <span className="sm:hidden">{item.label.split(" ")[0]}</span>
                    <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-iris-500 transition-all duration-200 group-hover:w-full" />
                  </button>
                ) : (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-current={isActive(item.to) ? "page" : undefined}
                    className={cn(
                      "group relative py-1 font-display text-[13px] transition-colors",
                      isActive(item.to) ? "text-pearl" : "text-mist hover:text-pearl",
                    )}
                  >
                    <span className="hidden sm:inline">{item.label}</span>
                    <span className="sm:hidden">{item.label.split(" ")[0]}</span>
                    <span
                      className={cn(
                        "absolute -bottom-1 left-0 h-0.5 bg-iris-500 transition-all duration-200",
                        isActive(item.to) ? "w-full" : "w-0 group-hover:w-full",
                      )}
                    />
                  </Link>
                ),
              )}
            </nav>
          )}
          <ReportIssueSheet open={reportOpen} onOpenChange={setReportOpen} />

          {employeeEmail && (
            <span className="hidden items-center gap-2 lg:flex">
              <EmployeeAvatar email={employeeEmail} />
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
