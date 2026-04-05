import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardShell } from "./dashboard-shell";

type NavItem = {
  href: string;
  label: string;
};

type ShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  nav?: NavItem[];
  actions?: ReactNode;
};

export function AppShell({ eyebrow, title, description, children, nav, actions }: ShellProps) {
  if (nav && nav.length > 0) {
    return (
      <DashboardShell
        productLabel="Nextlib"
        panelLabel={eyebrow}
        title={title}
        description={description}
        nav={nav.map((item) => ({ ...item, shortLabel: item.label.slice(0, 3).toUpperCase() }))}
        actions={actions}
      >
        {children}
      </DashboardShell>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(236,173,132,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(153,214,209,0.18),transparent_22%),linear-gradient(180deg,#fbf6ee_0%,#fffaf3_52%,#f6efe4_100%)] text-[var(--lp-text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-4 py-4 md:px-6 md:py-6">
        <header className="rounded-[2rem] border border-[var(--lp-border)] bg-[rgba(255,249,241,0.94)] p-5 shadow-[0_24px_60px_rgba(111,95,74,0.08)] backdrop-blur md:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-[var(--lp-accent)]">{eyebrow}</p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-[var(--lp-text)] md:text-5xl">{title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--lp-muted)] md:text-base">{description}</p>
            </div>
            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
          </div>

          {nav ? (
            <nav className="mt-6 flex flex-wrap gap-3">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-2 text-sm font-medium text-[var(--lp-primary)] transition hover:border-[#e6cdb7] hover:bg-[#fff6ea]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </header>

        <section className="mt-6 flex-1">{children}</section>
      </div>
    </main>
  );
}

export function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <article className={`rounded-[1.75rem] p-5 shadow-[0_16px_36px_rgba(111,95,74,0.08)] ${tone}`}>
      <p className="text-xs font-black uppercase tracking-[0.3em] opacity-75">{label}</p>
      <p className="mt-3 text-4xl font-black">{value}</p>
    </article>
  );
}

export function Surface({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-[var(--lp-border)] bg-[rgba(255,249,241,0.94)] p-6 shadow-[0_18px_44px_rgba(111,95,74,0.10)] backdrop-blur md:p-7">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[var(--lp-text)]">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-[var(--lp-muted)]">{subtitle}</p> : null}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
