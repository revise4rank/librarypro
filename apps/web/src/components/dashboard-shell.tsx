"use client";

import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Settings as SettingsIcon,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { dashboardPathForRole, hydrateSessionFromServer, logoutSession, type SessionUser } from "../lib/api";
import {
  loginPathForRole,
  navIconFor,
  notificationsPathForRole,
  settingsPathForRole,
  type DashboardNavItem,
} from "./dashboard-shell-config";

function initialsFromName(value?: string | null) {
  if (!value) return "U";
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";
}

export function DashboardShell({
  productLabel,
  panelLabel,
  title,
  description: _description,
  nav,
  actions,
  children,
}: {
  productLabel: string;
  panelLabel: string;
  title: string;
  description: string;
  nav: DashboardNavItem[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [desktopPinnedOpen, setDesktopPinnedOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("lp-desktop-rail-open") === "1";
  });
  const [desktopHovered, setDesktopHovered] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);

  const primaryMobileNav = nav.slice(0, 5);
  const sidebarExpanded = desktopPinnedOpen || desktopHovered;
  const userInitials = useMemo(() => initialsFromName(sessionUser?.fullName), [sessionUser?.fullName]);
  const notificationsHref = notificationsPathForRole(sessionUser?.role);
  const accountHref = settingsPathForRole(sessionUser?.role, "account");
  const securityHref = settingsPathForRole(sessionUser?.role, "account");

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    hydrateSessionFromServer().then((session) => {
      if (session?.user) {
        setSessionUser(session.user);
      }
    });
  }, []);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      const target = event.target as Node | null;
      if (profileMenuRef.current && target && !profileMenuRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }
      if (notificationMenuRef.current && target && !notificationMenuRef.current.contains(target)) {
        setNotificationMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  function toggleDesktopRail() {
    setDesktopPinnedOpen((current) => {
      const next = !current;
      window.localStorage.setItem("lp-desktop-rail-open", next ? "1" : "0");
      return next;
    });
  }

  return (
    <main className="lp-page-frame lp-density-surface text-[var(--lp-text)]">
      <div className={`grid min-h-screen ${sidebarExpanded ? "lg:grid-cols-[192px_minmax(0,1fr)]" : "lg:grid-cols-[64px_minmax(0,1fr)]"}`}>
        <aside
          onMouseEnter={() => setDesktopHovered(true)}
          onMouseLeave={() => setDesktopHovered(false)}
          className="hidden border-r border-[var(--lp-border)] bg-[rgba(255,255,255,0.9)] transition-[width] duration-200 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col"
        >
          <div className="flex h-[50px] items-center border-b border-[var(--lp-border)] px-2">
            <div className={`flex w-full items-center ${sidebarExpanded ? "justify-between" : "justify-center"}`}>
              {sidebarExpanded ? (
                <span className="truncate text-sm font-semibold tracking-tight text-[var(--lp-primary)]">{productLabel}</span>
              ) : null}
              <button
                type="button"
                onClick={toggleDesktopRail}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--lp-border)] bg-white text-xs font-bold text-[var(--lp-primary)]"
                aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
              >
                {sidebarExpanded ? "<" : ">"}
              </button>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-auto px-2 py-3">
            {nav.map((item) => {
              const active = pathname === item.href;
              const Icon = navIconFor(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`group flex h-10 items-center rounded-lg px-2 transition ${
                    active ? "bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "text-slate-500 hover:bg-white hover:text-[var(--lp-text)]"
                  }`}
                >
                  <span className={`flex w-6 shrink-0 items-center justify-center ${sidebarExpanded ? "" : "mx-auto"}`}>
                    <Icon className="h-5 w-5 transition-transform duration-150 group-hover:scale-105" />
                  </span>
                  {sidebarExpanded ? <span className="ml-3 truncate text-sm font-medium">{item.label}</span> : null}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 h-[50px] border-b border-[var(--lp-border)] bg-[rgba(255,255,255,0.94)] backdrop-blur">
            <div className="lp-shell-container flex h-full items-center justify-between gap-3 px-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((current) => !current)}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--lp-border)] bg-white text-sm font-bold text-[var(--lp-text)] lg:hidden"
                  aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                >
                  {mobileMenuOpen ? "X" : "="}
                </button>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--lp-primary)] sm:hidden">
                  {productLabel}
                </span>
                <h1 className="max-w-[44rem] truncate text-[1.15rem] font-semibold tracking-tight text-[var(--lp-text)]">
                  {title}
                </h1>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {actions ? <div className="lp-header-actions hidden items-center md:flex">{actions}</div> : null}
                <Link
                  href="/marketplace"
                  className="hidden h-8 items-center justify-center rounded-md border border-[var(--lp-border)] bg-white px-3 text-xs font-semibold text-[var(--lp-text)] transition hover:bg-[var(--lp-surface-muted)] xl:flex"
                >
                  Explore
                </Link>
                <div className="relative" ref={notificationMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationMenuOpen((current) => !current);
                      setProfileMenuOpen(false);
                    }}
                    className="relative flex h-8 w-8 items-center justify-center rounded-md border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"
                    aria-label="Open notifications"
                  >
                    <Bell className="h-4 w-4" />
                    <span className="absolute -right-0.5 -top-0.5 inline-flex h-2.5 w-2.5 rounded-full bg-[#ff6d6d]" />
                  </button>
                  {notificationMenuOpen ? (
                    <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-64 rounded-lg border border-[var(--lp-border)] bg-white p-2 shadow-sm">
                      <p className="px-2 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--lp-muted)]">Notifications</p>
                      <Link href={notificationsHref} className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--lp-text)] hover:bg-[var(--lp-surface-muted)]">
                        <Bell className="h-4 w-4 text-[var(--lp-accent)]" />
                        Open alert center
                      </Link>
                      <Link href={settingsPathForRole(sessionUser?.role)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--lp-text)] hover:bg-[var(--lp-surface-muted)]">
                        <SettingsIcon className="h-4 w-4 text-[var(--lp-accent)]" />
                        Open settings
                      </Link>
                    </div>
                  ) : null}
                </div>
                <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen((current) => !current);
                      setNotificationMenuOpen(false);
                    }}
                    className="flex h-8 items-center gap-2 rounded-full border border-[var(--lp-border)] bg-white pl-1 pr-2 text-xs font-semibold text-[var(--lp-text)]"
                    aria-label={`Open ${panelLabel} profile`}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-[var(--lp-text)] ring-1 ring-amber-200">
                      {userInitials}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-[var(--lp-muted)]" />
                  </button>
                  {profileMenuOpen ? (
                    <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-72 rounded-lg border border-[var(--lp-border)] bg-white p-2 shadow-sm">
                      <div className="flex items-center gap-3 rounded-lg bg-[var(--lp-surface-muted)] px-3 py-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-[var(--lp-text)] ring-1 ring-amber-200">
                          {userInitials}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--lp-text)]">{sessionUser?.fullName ?? "Library user"}</p>
                          <p className="truncate text-xs text-[var(--lp-muted)]">{sessionUser?.email ?? sessionUser?.phone ?? sessionUser?.role ?? "Session active"}</p>
                        </div>
                      </div>
                      <div className="mt-2 grid gap-1">
                        <Link href={accountHref} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--lp-text)] hover:bg-[var(--lp-surface-muted)]">
                          <UserRound className="h-4 w-4 text-[var(--lp-accent)]" />
                          Account settings
                        </Link>
                        <Link href={securityHref} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--lp-text)] hover:bg-[var(--lp-surface-muted)]">
                          <LockKeyhole className="h-4 w-4 text-[var(--lp-accent)]" />
                          Password & security
                        </Link>
                        <Link href={dashboardPathForRole(sessionUser?.role ?? "LIBRARY_OWNER")} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--lp-text)] hover:bg-[var(--lp-surface-muted)]">
                          <LayoutDashboard className="h-4 w-4 text-[var(--lp-accent)]" />
                          Dashboard
                        </Link>
                        <button
                          type="button"
                          onClick={async () => {
                            await logoutSession();
                            window.location.href = loginPathForRole(sessionUser?.role);
                          }}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-700 hover:bg-rose-50"
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <section className="lp-shell-container px-3 py-3 pb-24 sm:px-4 lg:py-4 lg:pb-6">{children}</section>
        </div>
      </div>

      <div className="lg:hidden">
        {mobileMenuOpen ? (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-30 bg-[rgba(15,23,42,0.24)]"
            aria-label="Close mobile menu"
          />
        ) : null}

        <div
          className={`fixed bottom-16 left-3 right-3 z-40 rounded-lg border border-[var(--lp-border)] bg-[rgba(255,255,255,0.98)] p-3 shadow-md backdrop-blur transition ${
            mobileMenuOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
          }`}
        >
          <div className="grid gap-2">
            {actions ? (
              <div className="grid gap-2 border-b border-[var(--lp-border)] pb-2">
                <p className="px-1 text-xs font-semibold text-[var(--lp-muted)]">Page actions</p>
                <div className="grid gap-2 [&>*]:justify-center [&>*]:rounded-lg [&>*]:border [&>*]:border-[var(--lp-border)] [&>*]:bg-white [&>*]:px-3 [&>*]:py-2 [&>*]:text-sm [&>*]:font-semibold [&>*]:text-[var(--lp-text)]">
                  {actions}
                </div>
              </div>
            ) : null}
            <Link
              href="/marketplace"
              className="flex items-center justify-center rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--lp-text)]"
            >
              Explore Libraries
            </Link>
            {nav.slice(5).map((item) => {
              const active = pathname === item.href;
              const Icon = navIconFor(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                    active ? "bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"
                  }`}
                >
                  <span className="flex w-6 shrink-0 items-center justify-center">
                    <Icon className="h-5 w-5 transition-transform duration-150 group-hover:scale-105" />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--lp-border)] bg-[rgba(255,255,255,0.98)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur">
          <div className="grid grid-cols-5 gap-2">
            {primaryMobileNav.map((item) => {
              const active = pathname === item.href;
              const Icon = navIconFor(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center rounded-lg px-2 py-2 text-center text-[10px] font-medium ${
                    active ? "bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "bg-white text-[var(--lp-text)]"
                  }`}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/80">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="mt-1 truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </main>
  );
}

export function DashboardCard({
  title,
  subtitle,
  children,
  tone = "bg-white",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  tone?: string;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <section className={`rounded-lg border border-[var(--lp-border)] p-4 shadow-sm ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--lp-text)]">{title}</h3>
        </div>
        {subtitle ? (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setDetailsOpen((current) => !current)}
              aria-label={detailsOpen ? "Hide card help" : "Show card help"}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--lp-border)] bg-white text-xs font-bold text-[var(--lp-primary)]"
            >
              ?
            </button>
            {detailsOpen ? (
              <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-72 rounded-lg border border-[var(--lp-border)] bg-white p-3 text-sm leading-6 text-[var(--lp-muted)] shadow-sm">
                {subtitle}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
