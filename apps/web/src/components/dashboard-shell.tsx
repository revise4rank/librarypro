"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
};

type GuideSection = {
  title: string;
  steps: string[];
};

const dashboardGuides: Array<{ match: RegExp; guide: GuideSection }> = [
  {
    match: /^\/owner\/dashboard$/,
    guide: {
      title: "Overview guide",
      steps: [
        "Top cards se occupancy, revenue, due payments aur alerts pehle check karo.",
        "Follow-up queue ya alerts me jo red items hain unko same din close karo.",
        "Trend chart ko use karke 7d ya 30d performance compare karo.",
      ],
    },
  },
  {
    match: /^\/owner\/seats/,
    guide: {
      title: "Seat Control guide",
      steps: [
        "Pehle floor banao, phir seat bank ya single seat create karo.",
        "Planner mode on karke seats ko drag/drop, aisle paint, aur section color set karo.",
        "Right panel se student select karke seat par drag/drop karo ya seat action drawer se status update karo.",
      ],
    },
  },
  {
    match: /^\/owner\/students/,
    guide: {
      title: "Students guide",
      steps: [
        "Roster me student list, plan, seat aur dues quickly verify karo.",
        "Student row open karke productivity, attendance aur intervention notes dekho.",
        "New student ko admissions ya direct enroll flow se onboard karo.",
      ],
    },
  },
  {
    match: /^\/owner\/payments/,
    guide: {
      title: "Payments guide",
      steps: [
        "Paid, due aur pending payments ko filter se alag dekho.",
        "Due students ko collect action se mark karo aur reminder flows chalao.",
        "Report export se ledger ko Excel/PDF me nikaalo.",
      ],
    },
  },
  {
    match: /^\/owner\/reports/,
    guide: {
      title: "Reports guide",
      steps: [
        "Date range select karke required business report generate karo.",
        "Monthly comparison aur category split se trend samjho.",
        "Server-generated XLSX/PDF download karke share ya archive karo.",
      ],
    },
  },
  {
    match: /^\/owner\/website/,
    guide: {
      title: "Website Builder guide",
      steps: [
        "Theme, banner, logo aur public sections ko update karo.",
        "Save ke baad public library site aur marketplace card dono verify karo.",
        "Campaigns aur offers ko website messaging ke saath sync rakho.",
      ],
    },
  },
  {
    match: /^\/student\/dashboard$/,
    guide: {
      title: "Student dashboard guide",
      steps: [
        "Aaj ka focus time, streak aur revision queue se day plan banao.",
        "Joined libraries ke context switcher se correct library choose karo.",
        "Rewards, feed aur revisions se motivation aur retention maintain karo.",
      ],
    },
  },
  {
    match: /^\/student\/syllabus/,
    guide: {
      title: "Syllabus guide",
      steps: [
        "Subject banao, phir topics add karke unki status update karo.",
        "Completed topics par system revision schedule bhi create karega.",
        "Analytics section se weak aur pending topics pe focus karo.",
      ],
    },
  },
  {
    match: /^\/student\/revisions/,
    guide: {
      title: "Revision guide",
      steps: [
        "Pending, overdue aur completed revisions ko alag buckets me dekho.",
        "Topic revise karke done mark karo aur time log karo.",
        "Manual reminder se custom revision dates bhi add kar sakte ho.",
      ],
    },
  },
  {
    match: /^\/student\/focus/,
    guide: {
      title: "Focus guide",
      steps: [
        "Pomodoro ya custom session start karo aur subject/topic select karo.",
        "Focus mode tab use karo jab distraction-free deep work chahiye ho.",
        "Leaderboard aur analytics se consistency track karo.",
      ],
    },
  },
  {
    match: /^\/student\/join-library/,
    guide: {
      title: "Join library guide",
      steps: [
        "QR scan ya join request flow se nayi library ko request bhejo.",
        "Timeline me pending, approved aur past library history dekho.",
        "Rejoin action se previous library me fast admission request bhejo.",
      ],
    },
  },
  {
    match: /^\/student\/offers/,
    guide: {
      title: "Offers guide",
      steps: [
        "Offers tab completely optional discovery section hai.",
        "Category filters se coaching, course, college ya library discount dekho.",
        "Dashboard ya focus mode me offers nahi aayenge, sirf yahin milenge.",
      ],
    },
  },
  {
    match: /^\/superadmin\//,
    guide: {
      title: "Admin guide",
      steps: [
        "Libraries, payments, reviews aur offers ko moderation queue se manage karo.",
        "Approvals aur suspensions karte waqt audit trail aur status impact check karo.",
        "Marketplace trust aur SaaS billing dono ko yahin se monitor karo.",
      ],
    },
  },
];

export function DashboardShell({
  productLabel,
  panelLabel,
  title,
  description,
  nav,
  actions,
  children,
}: {
  productLabel: string;
  panelLabel: string;
  title: string;
  description: string;
  nav: NavItem[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuSide, setMobileMenuSide] = useState<"left" | "right">("right");
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);

  const matchedGuide = dashboardGuides.find((item) => item.match.test(pathname))?.guide;

  useEffect(() => {
    const saved = window.localStorage.getItem("lp-mobile-menu-side");
    if (saved === "left" || saved === "right") {
      setMobileMenuSide(saved);
    }
    const collapsed = window.localStorage.getItem("lp-desktop-menu-collapsed");
    if (collapsed === "1") {
      setDesktopCollapsed(true);
    }
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    setGuideOpen(true);
  }, [pathname]);

  function toggleMobileMenuSide() {
    setMobileMenuSide((current) => {
      const next = current === "left" ? "right" : "left";
      window.localStorage.setItem("lp-mobile-menu-side", next);
      return next;
    });
  }

  function toggleDesktopSidebar() {
    setDesktopCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("lp-desktop-menu-collapsed", next ? "1" : "0");
      return next;
    });
  }

  const primaryMobileNav = nav.slice(0, 4);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(236,173,132,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(153,214,209,0.18),transparent_22%),linear-gradient(180deg,#fbf6ee_0%,#fffaf3_52%,#f6efe4_100%)] text-[var(--lp-text)]">
      <div className={`grid min-h-screen ${desktopCollapsed ? "lg:grid-cols-[92px_minmax(0,1fr)]" : "lg:grid-cols-[280px_minmax(0,1fr)]"}`}>
        <aside className={`hidden border-r border-[var(--lp-border)] bg-[rgba(255,249,240,0.92)] py-6 text-[var(--lp-text)] transition-[width,padding] duration-200 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col ${desktopCollapsed ? "lg:px-3" : "lg:px-5"}`}>
          <div>
            <div>
              <div className={`flex ${desktopCollapsed ? "justify-center" : "justify-between"} items-start gap-3`}>
                <div className={desktopCollapsed ? "hidden" : "block"}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--lp-primary)]">{productLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={toggleDesktopSidebar}
                  className="rounded-full border border-[var(--lp-border)] bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--lp-primary)]"
                >
                  {desktopCollapsed ? "Open" : "Collapse"}
                </button>
              </div>
              {desktopCollapsed ? (
                <p className="mt-4 text-center text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--lp-primary)]">{productLabel.slice(0, 3)}</p>
              ) : null}
            </div>
            <div className={desktopCollapsed ? "mt-4 text-center" : "mt-3"}>
              <h1 className={`font-extrabold ${desktopCollapsed ? "text-xs uppercase tracking-[0.2em]" : "mt-3 text-xl sm:text-2xl"}`}>{desktopCollapsed ? "Panel" : panelLabel}</h1>
              {!desktopCollapsed ? (
                <p className="mt-2 max-w-xs text-sm leading-6 text-[var(--lp-muted)]">
                  Clean ops dashboard for day-to-day library management.
                </p>
              ) : null}
            </div>
          </div>

          <nav className="mt-8 space-y-2 overflow-auto pr-1">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center ${desktopCollapsed ? "justify-center" : "justify-between"} rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-[var(--lp-primary)] text-white shadow-[0_10px_22px_rgba(210,114,61,0.22)]"
                      : "text-[var(--lp-muted)] hover:bg-[#f5ede3] hover:text-[var(--lp-text)]"
                  }`}
                  title={item.label}
                >
                  {!desktopCollapsed ? <span>{item.label}</span> : null}
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                      active ? "bg-[#fff4eb] text-[var(--lp-primary)]" : "bg-[#ecf3f1] text-[var(--lp-accent)]"
                    }`}
                  >
                    {item.shortLabel ?? item.label.slice(0, 3)}
                  </span>
                </Link>
              );
            })}
          </nav>

          {!desktopCollapsed ? (
            <div className="mt-8 rounded-[1.75rem] border border-[var(--lp-border)] bg-[rgba(255,250,244,0.92)] p-4">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[var(--lp-accent)]">System Status</p>
              <div className="mt-4 space-y-3 text-sm text-[var(--lp-text)]">
                <div className="flex items-center justify-between">
                  <span>Subscription</span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>QR Check-in</span>
                  <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-black text-lime-700">Online</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Seat Sync</span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">2 Pending</span>
                </div>
              </div>
            </div>
          ) : null}
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-[var(--lp-border)] bg-[rgba(255,249,241,0.94)] backdrop-blur">
            <div className="flex flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--lp-accent)]">{panelLabel}</p>
                  <h2 className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl md:text-3xl">{title}</h2>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--lp-muted)] sm:leading-7">{description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Link
                    href="/marketplace"
                    className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-3 py-2 text-xs font-medium text-[var(--lp-primary)] lg:hidden"
                  >
                    Marketplace
                  </Link>
                  {actions}
                </div>
              </div>
            </div>
          </header>

          {matchedGuide ? (
            <div className="px-4 pb-24 md:px-6 lg:px-8 lg:pb-8">
              <section className="rounded-[1.75rem] border border-[var(--lp-border)] bg-[rgba(255,250,244,0.9)] p-5 shadow-[0_16px_36px_rgba(111,95,74,0.08)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--lp-accent)]">Section help</p>
                    <h3 className="mt-2 text-lg font-extrabold text-[var(--lp-text)]">{matchedGuide.title}</h3>
                    <p className="mt-2 text-sm text-[var(--lp-muted)]">Is page ko quickly use karne ke liye short guide.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGuideOpen((current) => !current)}
                    className="rounded-full border border-[var(--lp-border)] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--lp-primary)]"
                  >
                    {guideOpen ? "Hide guide" : "Show guide"}
                  </button>
                </div>
                {guideOpen ? (
                  <ol className="mt-4 grid gap-3 text-sm text-[var(--lp-text)] md:grid-cols-3">
                    {matchedGuide.steps.map((step, index) => (
                      <li key={`${matchedGuide.title}-${index}`} className="rounded-[1.25rem] border border-[var(--lp-border)] bg-white px-4 py-3 leading-6">
                        <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--lp-primary)] text-xs font-black text-white">
                          {index + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </section>
            </div>
          ) : null}
          <section className="px-4 py-5 pb-28 md:px-6 lg:px-8 lg:py-8 lg:pb-8">{children}</section>
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
          className={`fixed bottom-24 z-40 w-[min(22rem,calc(100vw-1.5rem))] rounded-[1.75rem] border border-[var(--lp-border)] bg-[rgba(255,249,241,0.98)] p-4 shadow-[0_24px_44px_rgba(15,23,42,0.20)] backdrop-blur transition ${
            mobileMenuOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
          } ${mobileMenuSide === "left" ? "left-3" : "right-3"}`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--lp-accent)]">{panelLabel}</p>
              <p className="text-sm text-[var(--lp-muted)]">Quick navigation</p>
            </div>
            <button
              type="button"
              onClick={toggleMobileMenuSide}
              className="rounded-full border border-[var(--lp-border)] bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--lp-primary)]"
            >
              Dock {mobileMenuSide === "left" ? "Right" : "Left"}
            </button>
          </div>
          <div className="grid gap-2">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-[1rem] px-4 py-3 text-sm font-semibold ${
                    active ? "bg-[var(--lp-primary)] text-white" : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${active ? "bg-[#fff4eb] text-[var(--lp-primary)]" : "bg-[#ecf3f1] text-[var(--lp-accent)]"}`}>
                    {item.shortLabel ?? item.label.slice(0, 3)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--lp-border)] bg-[rgba(255,249,241,0.98)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur">
          <div className="grid grid-cols-5 gap-2">
            {primaryMobileNav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center rounded-[1rem] px-2 py-2 text-center text-[11px] font-bold ${
                    active ? "bg-[var(--lp-primary)] text-white" : "bg-white text-[var(--lp-text)]"
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-[0.18em] opacity-80">{item.shortLabel ?? item.label.slice(0, 3)}</span>
                  <span className="mt-1 truncate">{item.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className={`flex flex-col items-center justify-center rounded-[1rem] px-2 py-2 text-center text-[11px] font-bold ${
                mobileMenuOpen ? "bg-slate-900 text-white" : "bg-white text-[var(--lp-text)]"
              }`}
            >
              <span className="text-[10px] uppercase tracking-[0.18em] opacity-80">Menu</span>
              <span className="mt-1">{mobileMenuOpen ? "Close" : "More"}</span>
            </button>
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
  return (
    <section className={`rounded-[1.75rem] border border-[var(--lp-border)] p-5 shadow-[0_16px_36px_rgba(111,95,74,0.08)] ${tone}`}>
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-extrabold text-[var(--lp-text)]">{title}</h3>
        {subtitle ? <p className="text-sm text-[var(--lp-muted)]">{subtitle}</p> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
