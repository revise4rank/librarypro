"use client";

import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  QrCode,
  Settings as SettingsIcon,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { dashboardPathForRole, hydrateSessionFromServer, logoutSession, type SessionUser } from "../lib/api";
import {
  loginPathForRole,
  groupNavItems,
  navIconFor,
  notificationsPathForRole,
  settingsPathForRole,
  type DashboardNavItem,
} from "./dashboard-shell-config";

const StudentScannerManager = dynamic(
  () => import("./student-scanner-manager").then((module) => module.StudentScannerManager),
  {
    ssr: false,
    loading: () => <p className="rounded-lg bg-white p-4 text-sm font-semibold text-slate-600">Opening scanner...</p>,
  },
);

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
  title: _title,
  description: _description,
  nav,
  actions: _actions,
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
  const [scannerOpen, setScannerOpen] = useState(false);
  const [desktopPinnedOpen, setDesktopPinnedOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("lp-desktop-rail-open") === "1";
  });
  const [desktopHovered, setDesktopHovered] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);

  const primaryMobileNav = nav.slice(0, 5);
  const navGroups = useMemo(() => groupNavItems(nav), [nav]);
  const moreMobileGroups = useMemo(() => {
    const primaryHrefs = new Set(primaryMobileNav.map((item) => item.href));
    return groupNavItems(nav.filter((item) => !primaryHrefs.has(item.href)));
  }, [nav, primaryMobileNav]);
  const sidebarExpanded = desktopPinnedOpen || desktopHovered;
  const userInitials = useMemo(() => initialsFromName(sessionUser?.fullName), [sessionUser?.fullName]);
  const notificationsHref = notificationsPathForRole(sessionUser?.role);
  const accountHref = settingsPathForRole(sessionUser?.role, "account");
  const securityHref = settingsPathForRole(sessionUser?.role, "account");
  const isStudentShell = sessionUser?.role === "STUDENT" || pathname.startsWith("/student");

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
      <div className={`grid min-h-screen lg:h-screen lg:overflow-hidden ${sidebarExpanded ? "lg:grid-cols-[192px_minmax(0,1fr)]" : "lg:grid-cols-[64px_minmax(0,1fr)]"}`}>
        <aside
          onMouseEnter={() => setDesktopHovered(true)}
          onMouseLeave={() => setDesktopHovered(false)}
          className="hidden border-r border-[var(--lp-border)] bg-[rgba(255,255,255,0.94)] transition-[width] duration-200 lg:flex lg:h-screen lg:flex-col"
        >
          <div className="flex h-[50px] items-center border-b border-[var(--lp-border)] px-2">
            <div className={`flex w-full items-center ${sidebarExpanded ? "justify-between" : "justify-center"}`}>
              {sidebarExpanded ? (
                <Link href={dashboardPathForRole(sessionUser?.role ?? "LIBRARY_OWNER")} className="flex min-w-0 items-center gap-2">
                  <Image
                    src="/icons/booklib-mark.png"
                    alt="BookLib"
                    width={88}
                    height={44}
                    className="h-8 w-10 rounded-lg bg-white object-contain p-1 ring-1 ring-[var(--lp-border)]"
                  />
                  <span className="truncate text-sm font-semibold tracking-tight text-[var(--lp-primary)]">{productLabel}</span>
                </Link>
              ) : null}
              <button
                type="button"
                onClick={toggleDesktopRail}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--lp-border)] bg-white text-xs font-bold text-[var(--lp-primary)]"
                aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
              >
                {sidebarExpanded ? "<" : (
                  <Image
                    src="/icons/booklib-mark.png"
                    alt="BookLib"
                    width={88}
                    height={44}
                    className="h-6 w-7 object-contain"
                  />
                )}
              </button>
            </div>
          </div>

          <nav className={`flex-1 overscroll-contain px-1.5 py-2 ${sidebarExpanded ? "space-y-2 overflow-auto" : "space-y-1.5 overflow-hidden"}`}>
            {navGroups.map((group) => (
              <div key={group.label} className={sidebarExpanded ? "grid gap-1" : "grid gap-0.5"}>
                {sidebarExpanded ? <p className="px-2 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">{group.label}</p> : null}
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = navIconFor(item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={`${group.label}: ${item.label}`}
                      className={`group flex items-center rounded-md px-2 transition ${sidebarExpanded ? "h-8" : "h-8"} ${
                        active ? "bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "text-slate-500 hover:bg-white hover:text-[var(--lp-text)]"
                      }`}
                    >
                      <span className={`flex w-6 shrink-0 items-center justify-center ${sidebarExpanded ? "" : "mx-auto"}`}>
                        <Icon className="h-5 w-5 transition-transform duration-150 group-hover:scale-105" />
                      </span>
                      {sidebarExpanded ? <span className="ml-2.5 truncate text-[13px] font-medium">{item.label}</span> : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 lg:h-screen lg:overflow-y-auto">
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
                  <Image
                    src="/icons/booklib-mark.png"
                    alt={productLabel}
                    width={88}
                    height={44}
                    className="h-7 w-9 rounded-md bg-white object-contain p-0.5 ring-1 ring-[var(--lp-border)]"
                  />
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {isStudentShell ? (
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--lp-border)] bg-white text-[var(--lp-text)] transition hover:bg-[var(--lp-surface-muted)]"
                    aria-label="Open scanner"
                    title="Open scanner"
                  >
                    <QrCode className="h-4 w-4" />
                  </button>
                ) : null}
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

          <section className="lp-shell-container px-1.5 py-2 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-3 sm:py-2.5 lg:py-3 lg:pb-5">{children}</section>
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
          className={`fixed bottom-16 left-1.5 right-1.5 z-40 rounded-lg border border-[var(--lp-border)] bg-[rgba(255,255,255,0.98)] p-2 shadow-md backdrop-blur transition sm:left-3 sm:right-3 sm:p-3 ${
            mobileMenuOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
          }`}
        >
          <div className="max-h-[58vh] overflow-auto pr-1">
            {moreMobileGroups.map((group) => (
              <div key={group.label} className="mb-3 grid gap-2">
                <p className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{group.label}</p>
                {group.items.map((item) => {
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
            ))}
          </div>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--lp-border)] bg-[rgba(255,255,255,0.98)] px-1.5 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-1.5 backdrop-blur sm:px-3 sm:pt-2">
          <div className="grid grid-cols-5 gap-1 sm:gap-2">
            {primaryMobileNav.map((item) => {
              const active = pathname === item.href;
              const Icon = navIconFor(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-w-0 flex-col items-center justify-center rounded-lg px-1 py-1.5 text-center text-[10px] font-medium sm:px-2 sm:py-2 ${
                    active ? "bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "bg-white text-[var(--lp-text)]"
                  }`}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/80">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="mt-1 max-w-full truncate">{item.shortLabel ?? item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
      {scannerOpen ? (
        <div className="fixed inset-0 z-[80] bg-[rgba(15,23,42,0.58)] p-2 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label="Student QR scanner">
          <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-xl bg-[var(--lp-page-bg)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--lp-border)] bg-white px-4 py-3">
              <div>
                <p className="text-base font-black text-slate-950">Scan library QR</p>
                <p className="text-xs font-semibold text-slate-500">Join, check-in, or check-out directly.</p>
              </div>
              <button
                type="button"
                onClick={() => setScannerOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--lp-border)] bg-white text-sm font-black text-slate-700"
                aria-label="Close scanner"
              >
                X
              </button>
            </div>
            <div className="flex-1 overflow-auto p-2 sm:p-4">
              <StudentScannerManager compact />
            </div>
          </div>
        </div>
      ) : null}
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
    <section className={`min-w-0 rounded-lg border border-[var(--lp-border)] p-2.5 shadow-sm sm:p-3 ${tone}`}>
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
      <div className="mt-2.5 min-w-0">{children}</div>
    </section>
  );
}
