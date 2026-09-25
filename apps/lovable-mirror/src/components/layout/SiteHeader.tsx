import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { LogOut, Pencil } from "lucide-react";

import { UserAvatar } from "@/components/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { Skeleton } from "@/components/shadcn/skeleton";
import { EditProfileDialog } from "@/features/auth/EditProfileDialog";
import { useSignOut } from "@/features/auth/useSession";
import { ReportIssueSheet } from "@/features/tickets/ReportIssueSheet";
import { config } from "@/lib/config";
import type { Profile } from "@/lib/contracts.vendored";
import { cn } from "@/lib/utils";

const NAV_BY_ROLE = {
  employee: [{ to: "/tickets/new", label: "Submit a ticket" }],
  agent: [
    { to: "/desk", label: "Dashboard" },
    { to: "/desk/queue", label: "Queue" },
    { to: "/tickets/new", label: "Submit a ticket" },
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
 * Employee identity in the header — avatar-only trigger opening the account
 * menu (name + email, edit profile, sign out). Mirrors the desk sidebar
 * account menu so both shells behave the same.
 */
export function SiteHeader({
  employeeProfile,
  role = "signedOut",
  hideNav = false,
  pending = false,
}: {
  employeeProfile?: Profile | null;
  role?: keyof typeof NAV_BY_ROLE;
  hideNav?: boolean;
  /**
   * Session still resolving: render a neutral skeleton bar (same height, no
   * nav, no identity) instead of the signed-out look — so refresh never
   * flashes the wrong chrome before the real one lands.
   */
  pending?: boolean;
}) {
  const pathname = useLocation().pathname;
  const NAV = NAV_BY_ROLE[role];
  const [reportOpen, setReportOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const signOut = useSignOut();
  const email = employeeProfile?.email ?? null;

  // The desk is a full app shell — sidebar owns the logo, topbar owns utilities.
  // (Admin lives inside the desk shell, so /desk covers it too.)
  if (pathname.startsWith("/desk")) return null;

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
  // Signed in, the brand slot is the section title (keeps one "My tickets",
  // never two). Signed out, it stays the Pearl 27 brand mark.
  const showTitle = Boolean(employeeProfile);
  const titleActive = pathname === "/tickets" || pathname.startsWith("/tickets/");

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(27,42,74,0.12)] bg-[rgba(250,249,246,0.92)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {pending ? (
          <span aria-hidden>
            <Skeleton className="h-6 w-32" />
          </span>
        ) : showTitle ? (
          <Link
            to="/tickets"
            aria-current={titleActive ? "page" : undefined}
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500/40"
          >
            <img src="/pearl27-logo.png" alt="" aria-hidden className="h-7 w-auto" />
            <span className="font-display text-[17px] font-semibold tracking-tight text-pearl">
              My tickets
            </span>
          </Link>
        ) : (
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
        )}

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

          {email && employeeProfile && (
            <>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Account: ${employeeProfile.name}`}
                    title={email}
                    className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500/40"
                  >
                    <UserAvatar
                      email={email}
                      name={employeeProfile.name}
                      avatarUrl={employeeProfile.avatarUrl ?? null}
                      className="size-7 border border-ink-700"
                      fallbackClassName="bg-pearl text-[10px] font-semibold text-cream"
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  avoidCollisions
                  className="w-56"
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  <DropdownMenuLabel className="font-normal">
                    <span className="block truncate font-sans text-[13px] font-semibold text-pearl">
                      {employeeProfile.name}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-fog" title={email}>
                      {email}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {!config.apiMock && (
                    <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
                      <Pencil aria-hidden /> Edit profile
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void signOut()}>
                    <LogOut aria-hidden /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {!config.apiMock && (
                <EditProfileDialog
                  open={profileOpen}
                  onOpenChange={setProfileOpen}
                  profile={employeeProfile}
                />
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
