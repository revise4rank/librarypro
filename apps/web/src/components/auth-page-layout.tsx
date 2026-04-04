import Link from "next/link";
import type { ReactNode } from "react";

export function AuthPageLayout({
  eyebrow,
  title,
  description,
  accentTitle,
  accentPoints,
  formTitle,
  formSubtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  accentTitle: string;
  accentPoints: string[];
  formTitle: string;
  formSubtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(236,173,132,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(153,214,209,0.18),transparent_22%),linear-gradient(180deg,#fbf6ee_0%,#fffaf3_52%,#f6efe4_100%)] text-[var(--lp-text)]">
      <header className="border-b border-[var(--lp-border)] bg-[rgba(255,249,241,0.94)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-4 px-4 py-5 md:px-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[var(--lp-accent)]">LibraryPro</p>
            <h1 className="mt-1 text-lg font-bold tracking-tight md:text-xl">{eyebrow}</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--lp-primary)]">
              Home
            </Link>
            <Link href="/marketplace" className="rounded-full bg-[var(--lp-primary)] px-5 py-2.5 text-sm font-semibold text-white">
              Marketplace
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-[1480px] gap-8 px-4 py-10 md:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:py-16">
        <div className="rounded-[2.4rem] border border-[var(--lp-border)] bg-[rgba(255,251,245,0.96)] p-8 shadow-[0_18px_54px_rgba(111,95,74,0.08)] md:p-12">
          <div className="inline-flex rounded-full bg-[#f7eadf] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--lp-primary)]">
            Secure access
          </div>
          <h2 className="mt-6 max-w-4xl text-4xl font-extrabold leading-[1.04] tracking-tight md:text-6xl">{title}</h2>
          <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--lp-muted)] md:text-lg">{description}</p>

          <div className="mt-10 rounded-[2rem] bg-[linear-gradient(135deg,_#f8e6d9,_#fff6ea_45%,_#e2f1ed)] p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--lp-accent)]">What you get</p>
            <h3 className="mt-3 text-2xl font-extrabold">{accentTitle}</h3>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {accentPoints.map((point, index) => (
                <div key={point} className="rounded-[1.3rem] bg-[rgba(255,255,255,0.78)] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--lp-primary)]">0{index + 1}</p>
                  <p className="mt-3 text-sm font-medium leading-7 text-[var(--lp-text)]">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[2.4rem] border border-[var(--lp-border)] bg-[rgba(255,251,245,0.98)] p-8 shadow-[0_18px_54px_rgba(111,95,74,0.08)] md:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--lp-accent)]">Login form</p>
          <h3 className="mt-3 text-3xl font-extrabold">{formTitle}</h3>
          <p className="mt-3 text-sm leading-7 text-[var(--lp-muted)]">{formSubtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
