// @ts-nocheck
"use client";

import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  Folder,
  History,
  Inbox,
  Layers,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Settings,
  ShieldCheck,
  Ticket as TicketIcon,
  TriangleAlert,
  UserRound,
  Users,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useLocation } from "@tanstack/react-router";
import { Suspense, useEffect, useState, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DeskDashboard, DeskTicket } from "@pearl27/contracts";

import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { Separator } from "@/components/shadcn/separator";
import { Skeleton } from "@/components/shadcn/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/shadcn/tooltip";
import { useSession, useSignOut } from "@/features/auth/useSession";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const COLLAPSED_KEY = "desk-sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

interface SideLink {
  to: string;
  search?: Record<string, string>;
  label: string;
  icon: ComponentType<{ className?: string }>;
  count?: number;
  active: boolean;
}

function SideLinkRow({ link, collapsed }: { link: SideLink; collapsed: boolean }) {
  const Icon = link.icon;
  const row = (
    <Link
      to={link.to}
      search={link.search as never}
      aria-label={collapsed ? link.label : undefined}
      aria-current={link.active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2.5 rounded-lg font-sans text-[13.5px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500/40",
        collapsed ? "size-9 justify-center px-0" : "min-h-10 px-3",
        link.active
          ? "bg-ink-900 font-semibold text-pearl"
          : "text-mist hover:bg-ink-900/60 hover:text-pearl",
      )}
    >

      <Icon className="size-4 shrink-0" aria-hidden />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{link.label}</span>
          {link.count !== undefined && (
            <span className="grid min-w-5 place-items-center rounded-full bg-ink-900 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-mist">
              {link.count}
            </span>
          )}
        </>
      )}
    </Link>
  );
  if (!collapsed) return row;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent side="right">
        {link.label}
        {link.count !== undefined && ` (${link.count})`}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Action row — same visuals as a nav link, but runs an action instead of
 * navigating (Carrot `Sidebar.Link` with `onClick`: search, drill-down…).
 */
function ActionRow({
  icon: Icon,
  label,
  hint,
  trailing,
  onClick,
  collapsed,
  active = false,
  labelSuffix,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  trailing?: React.ReactNode;
  onClick: () => void;
  collapsed: boolean;
  active?: boolean;
  labelSuffix?: string;
}) {
  const row = (
    <button
      type="button"
      onClick={onClick}
      aria-label={collapsed ? label : undefined}
      title={hint}
      className={cn(
        "relative flex w-full items-center gap-2.5 rounded-lg font-sans text-[13.5px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500/40",
        collapsed ? "size-9 justify-center px-0" : "min-h-10 px-3",
        active
          ? "bg-ink-900 font-semibold text-pearl"
          : "text-mist hover:bg-ink-900/60 hover:text-pearl",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {!collapsed && (
        <>
          <span className="flex-1 truncate text-left">
            {label}
            {labelSuffix && <span className="text-fog"> · {labelSuffix}</span>}
          </span>
          {trailing}
        </>
      )}
    </button>
  );
  if (!collapsed) return row;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function SidebarSection({
  title,
  collapsed,
  children,
}: {
  title?: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  if (collapsed) return <div className="flex flex-col gap-0.5">{children}</div>;
  return (
    <section aria-label={title ?? "Navigation"} className="flex flex-col gap-1">
      {title && (
        <p className="px-3 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-fog">
          {title}
        </p>
      )}
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  );
}

/** User footer — Carrot `UserMenu` pattern: row opens a dropdown menu. */
function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const session = useSession();
  const signOut = useSignOut();

  if (!session.data) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        {!collapsed && <Skeleton className="h-8 flex-1 rounded-md" />}
      </div>
    );
  }

  const { name, email, avatarUrl } = session.data;
  const isAdmin = session.data?.role === "admin";
  const trigger = (
    <button
      type="button"
      aria-label={collapsed ? `${name}, account menu` : undefined}
      className={cn(
        "flex w-full min-w-0 items-center gap-2.5 rounded-lg py-2 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500/40",
        collapsed ? "justify-center px-0" : "px-3 hover:bg-ink-900/60",
      )}
    >
      <UserAvatar
        email={email}
        name={name}
        avatarUrl={avatarUrl}
        className="size-6"
        fallbackClassName="bg-pearl text-[10px] font-semibold text-cream"
      />
      {!collapsed && (
        <span className="min-w-0 flex-1 text-left leading-tight">
          <span className="block truncate font-sans text-[13px] font-semibold text-pearl">{name}</span>
          <span className="block truncate font-mono text-[10.5px] text-fog" title={email}>
            {email}
          </span>
        </span>
      )}
    </button>
  );

  return (
    <div className="flex flex-col gap-1">
      <Separator />
      <div className="px-1 pt-1">
        <DropdownMenu modal={false}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">{name} · {email}</TooltipContent>
            </Tooltip>
          ) : (
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          )}
          <DropdownMenuContent
            align="start"
            side="top"
            sideOffset={8}
            avoidCollisions
            sticky="always"
            onCloseAutoFocus={(e) => e.preventDefault()}
            className="w-56"
          >
            <DropdownMenuLabel className="font-normal">
              <span className="block truncate font-sans text-[13px] font-semibold text-pearl">{name}</span>
              <span className="block truncate font-mono text-[11px] text-fog">{email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {!isAdmin && (
              <DropdownMenuItem asChild>
                <Link to="/desk/queue" search={{ tab: "mine" } as never}>
                  <UserRound aria-hidden /> My tickets
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link to="/tickets/new">
                <TicketIcon aria-hidden /> Report an issue
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut()}>
              <LogOut aria-hidden /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function Sidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const location = useLocation();
  const pathname = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const session = useSession();
  // Drill-down layer (Carrot `Sidebar.Layers`): main nav ↔ administration.
  const [layer, setLayer] = useState<"main" | "admin">("main");

  const dashboard = useQuery({
    queryKey: ["desk", "dashboard"],
    queryFn: () => apiFetch<DeskDashboard>("/desk/dashboard?range=30"),
    staleTime: 30_000,
  });
  const allTickets = useQuery({
    queryKey: ["desk", "tickets", "sidebar", "all"],
    queryFn: () =>
      apiFetch<{ items: DeskTicket[]; nextCursor: string | null }>(
        "/desk/tickets?tab=all&sort=newest&limit=100",
      ),
    staleTime: 30_000,
  });

  // Drill-down layer (Carrot `Sidebar.Layers`): main nav ↔ administration.
  const tickets = allTickets.data?.items ?? [];
  const viewerId = session.data?.id;
  const isAdmin = session.data?.role === "admin";
  const onBoard = pathname === "/desk";
  const onQueue = pathname.startsWith("/desk/queue");
  const statusParam = searchParams.get("status") ?? "";
  const priorityParam = searchParams.get("priority") ?? "";
  const categoryParam = searchParams.get("categoryId") ?? "";
  const tab = searchParams.get("tab") ?? "mine";
  const unfilteredQueue = onQueue && !statusParam && !priorityParam && !categoryParam;

  const unassigned = tickets.filter((t) => !t.assignee).length;
  const openQueue = tickets.filter((t) => t.status !== "resolved").length;
  const mine = viewerId
    ? tickets.filter((t) => t.assignee?.id === viewerId && t.status !== "resolved").length
    : (dashboard.data?.cards.mine ?? 0);
  const byCategory = dashboard.data?.series.byCategory ?? [];

  // Home of the desk: first click under the workspace pill, like other app shells.
  // Admins land on /desk/admin — Home must take them there, not to the agent
  // board (/desk), otherwise the click looks dead when already on /desk.
  const onAdminRouteEarly = pathname.startsWith("/desk/admin");
  const overviewLink: SideLink = isAdmin
    ? { to: "/desk/admin", label: "Home", icon: LayoutDashboard, count: tickets.length || undefined, active: onAdminRouteEarly && pathname === "/desk/admin" }
    : { to: "/desk", label: "Overview", icon: LayoutDashboard, count: tickets.length || undefined, active: onBoard };
  const views: SideLink[] = [
    { to: "/desk/queue", search: { tab: "mine" }, label: "My Tickets", icon: UserRound, count: mine || undefined, active: unfilteredQueue && tab === "mine" },
  ];
  // Dedicated triage queue: incoming (oldest first) + everything still open.
  // Admins assign from here via the queue's Assign dialog; agents claim next.
  // NOTE: TanStack Link needs `search` object — query strings inside `to`
  // never match a route and the click silently does nothing.
  const queueLinks: SideLink[] = [
    { to: "/desk/queue", search: { tab: "unassigned", sort: "oldest" }, label: "Incoming", icon: Inbox, count: unassigned || undefined, active: onQueue && tab === "unassigned" },
    { to: "/desk/queue", search: { tab: "all" }, label: "All requests", icon: Layers, count: openQueue || undefined, active: unfilteredQueue && tab === "all" },
  ];

  const HIDDEN_CATEGORIES = new Set(["hardware", "network", "email"]);
  const categories: SideLink[] = byCategory
    .filter((c) => !HIDDEN_CATEGORIES.has(c.categoryId))
    .map((c) => ({
      to: "/desk/queue",
      search: { tab: "all", categoryId: c.categoryId },
      label: c.categoryName,
      icon: Folder,
      count: c.count || undefined,
      active: onQueue && categoryParam === c.categoryId,
    }));
  const loading = dashboard.isPending || allTickets.isPending;
  const workspaceName = isAdmin ? "Admin Desk" : "Support Desk";

  const adminLinks: SideLink[] = [
    { to: "/desk/admin", label: "Dashboard", icon: LayoutDashboard, active: pathname === "/desk/admin" || pathname === "/desk/admin/" },
    { to: "/desk/admin/admins", label: "Admin", icon: ShieldCheck, active: pathname.startsWith("/desk/admin/admins") },
    { to: "/desk/admin/agents", label: "Agents", icon: Users, active: pathname.startsWith("/desk/admin/agents") },
    { to: "/desk/admin/audit", label: "Audit", icon: History, active: pathname.startsWith("/desk/admin/audit") },
    { to: "/desk/admin/known-issues", label: "Known issues", icon: TriangleAlert, active: pathname.startsWith("/desk/admin/known-issues") },
    { to: "/desk/admin/settings", label: "Settings", icon: Settings, active: pathname.startsWith("/desk/admin/settings") },
  ];
  const onAdminRoute = pathname.startsWith("/desk/admin");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Scrollable nav — track space is always reserved so revealing the
          thumb on hover never reflows the rows (no layout shift). */}
      <nav
        key={collapsed ? "collapsed" : "expanded"}
        aria-label="Desk navigation"
        className="animate-in fade-in min-h-0 flex-1 overflow-y-auto duration-200 [scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:var(--color-ink-600)_transparent] [&::-webkit-scrollbar]:block [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-ink-600 [&::-webkit-scrollbar-track]:bg-transparent"
      >
        {/* Workspace switcher + collapse toggle (Carrot header pattern). */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-1 pb-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  onClick={onToggleCollapsed}
                  aria-label="Expand sidebar"
                >
                  <PanelLeft aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 pb-3">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Workspace menu"
                  className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg bg-pearl px-2.5 font-sans text-[13px] font-semibold text-cream transition-colors hover:bg-pearl-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500/40"
                >
                  <span className="min-w-0 flex-1 truncate text-center">{workspaceName}</span>
                  <ChevronsUpDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-fog">
                  Workspace
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link to={isAdmin ? "/desk/admin" : "/desk"}>
                    <Check className="size-4 shrink-0 text-pearl" aria-hidden />
                    {workspaceName}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {!isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/desk/queue" search={{ tab: "mine" } as never}>
                      <UserRound aria-hidden /> My tickets
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/tickets/new">
                    <TicketIcon aria-hidden /> Report an issue
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0"
                  onClick={onToggleCollapsed}
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                >
                  <PanelLeft aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Collapse sidebar</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Overview: first click under the workspace, before everything else. */}
        <div className={cn("pb-3", collapsed && "flex flex-col items-center")}>
          <SideLinkRow link={overviewLink} collapsed={collapsed} />
        </div>

        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <span aria-hidden className="mb-1 h-px w-8 bg-ink-700" />
            {queueLinks.map((link) => (
              <SideLinkRow key={link.label} link={link} collapsed />
            ))}
            <span aria-hidden className="my-1 h-px w-8 bg-ink-700" />
            {!isAdmin &&
              views.map((link) => (
                <SideLinkRow key={link.label} link={link} collapsed />
              ))}
            {isAdmin && (
              <SideLinkRow
                link={{ to: "/desk/admin", label: "Administration", icon: ShieldCheck, active: onAdminRoute }}
                collapsed
              />
            )}
            
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-2 px-1" aria-label="Loading navigation">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : (
          /* Drill-down layers with directional slide (Carrot `Sidebar.Layers`). */
          <div key={layer} className="animate-in slide-in-from-right-2 duration-200">
            {layer === "main" ? (
              <div className="flex flex-col gap-6 px-1">
                {isAdmin && (
                  <div className="flex flex-col gap-1">
                    <ActionRow
                      icon={ShieldCheck}
                      label="Administration"
                      hint="Open admin settings"
                      collapsed={collapsed}
                      active={onAdminRoute}
                      onClick={() => setLayer("admin")}
                      trailing={<span aria-hidden className="text-fog">›</span>}
                    />
                    <Separator />
                  </div>
                )}
                <SidebarSection title="Queue" collapsed={collapsed}>
                  {queueLinks.map((link) => (
                    <SideLinkRow key={link.label} link={link} collapsed={collapsed} />
                  ))}
                  {!isAdmin &&
                    views.map((link) => (
                      <SideLinkRow key={link.label} link={link} collapsed={collapsed} />
                    ))}
                </SidebarSection>
                <SidebarSection title="Categories" collapsed={collapsed}>
                  {categories.map((link) => (
                    <SideLinkRow key={link.label} link={link} collapsed={collapsed} />
                  ))}
                </SidebarSection>
              </div>
            ) : (
              <div className="flex flex-col gap-3 px-1">
                {/* Back link (Carrot `Sidebar.BackLink`). */}
                <ActionRow
                  icon={ArrowLeft}
                  label="Go back"
                  hint="Back to ticket views"
                  collapsed={collapsed}
                  onClick={() => setLayer("main")}
                />
                <Separator />
                <div className="flex flex-col gap-0.5" role="group" aria-label="Administration">
                  {adminLinks.map((link) => (
                    <SideLinkRow key={link.label} link={link} collapsed={collapsed} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* User footer with sign-out. */}
      <div className="shrink-0 pt-3">
        <SidebarFooter collapsed={collapsed} />
      </div>
    </div>
  );
}

/** Desk shell: sidebar + content on the plain background. No top bar. */
export function DeskShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, prev ? "0" : "1");
      } catch {
        // ignore
      }
      return !prev;
    });
  }

  // Ctrl/Cmd+B toggles the sidebar (Carrot shortcut) — not while typing.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "b") return;
      const target = event.target as HTMLElement | null;
      if (target && (target.closest("input, textarea, select, [contenteditable]"))) return;
      event.preventDefault();
      toggleCollapsed();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="h-dvh overflow-hidden bg-ink-950">
      <div className="flex h-dvh items-stretch overflow-hidden">
        <aside
          aria-label="Desk sidebar"
          className={cn(
            "sticky top-0 hidden h-dvh shrink-0 self-start flex-col border-r border-ink-700 bg-white px-3 py-4 transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:flex",
            collapsed ? "w-[4.25rem]" : "w-60",
          )}
        >
          <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
            <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
          </Suspense>
        </aside>
        {/* Content owns the scroll — the sidebar never moves. Page-level
            scroll is disabled here so opening the avatar menu can't yank
            the sidebar out of view. */}
        <div className="h-dvh min-w-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-[1200px] px-4 pb-6 pt-3 sm:px-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function DeskShellFallback() {
  return (
    <div className="grid min-h-dvh place-items-center bg-ink-950" aria-label="Loading desk">
      <Skeleton className="h-40 w-11/12 max-w-3xl rounded-2xl" />
    </div>
  );
}
