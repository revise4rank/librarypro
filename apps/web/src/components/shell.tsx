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
        productLabel="LibraryPro"
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
    <main className="lp-page-frame text-[var(--lp-text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 py-4 md:px-6 md:py-5">
        <header className="lp-panel p-5 md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <p className="lp-label text-[var(--lp-accent)]">{eyebrow}</p>
              <h1 className="mt-2 text-[clamp(1.8rem,3vw,3rem)] font-bold tracking-tight text-[var(--lp-text)]">{title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--lp-muted)]">{description}</p>
            </div>
            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
          </div>

          {nav ? (
            <nav className="mt-5 flex flex-wrap gap-2.5">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-2 text-sm font-medium text-[var(--lp-primary)] transition hover:border-[var(--lp-border-strong)] hover:bg-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </header>

        <section className="mt-5 flex-1">{children}</section>
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
    <article className={`rounded-xl p-4 shadow-sm ${tone}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.26em] opacity-75">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
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
    <section className="lp-panel p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--lp-text)]">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-[var(--lp-muted)]">{subtitle}</p> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
