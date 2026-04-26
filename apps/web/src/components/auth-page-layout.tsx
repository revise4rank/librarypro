import Link from "next/link";
import type { ReactNode } from "react";
import { PublicSiteHeader } from "./public-site-header";

export function AuthPageLayout({
  eyebrow,
  title,
  description,
  accentTitle,
  accentPoints,
  formTitle,
  formSubtitle,
  children,
  activeNavLabel = "Library Access",
}: {
  eyebrow: string;
  title: string;
  description: string;
  accentTitle: string;
  accentPoints: string[];
  formTitle: string;
  formSubtitle: string;
  children: ReactNode;
  activeNavLabel?: string;
}) {
  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#0F172A]">
      <PublicSiteHeader activeLabel={activeNavLabel} />

      <section className="mx-auto grid w-full max-w-[1120px] gap-5 px-4 py-8 md:py-12 lg:grid-cols-[1.04fr_0.96fr] lg:gap-6 lg:py-16">
        <div className="order-2 rounded-[28px] border border-slate-200 bg-[#0F172A] p-5 text-white shadow-[0_30px_70px_rgba(15,23,42,0.12)] md:p-7 lg:order-1 lg:rounded-[32px] lg:p-8">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
            {eyebrow}
          </div>
          <h2 className="mt-5 max-w-3xl text-[clamp(2.1rem,4vw,4.3rem)] font-bold leading-[0.95] tracking-[-0.05em]">
            {title}
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-[15px]">{description}</p>

          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4 md:mt-8 md:rounded-[28px] md:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">{accentTitle}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {accentPoints.map((point, index) => (
                <div key={point} className="rounded-[18px] border border-white/10 bg-[#111C33] p-3.5 md:rounded-[22px] md:p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">0{index + 1}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{point}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/marketplace"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Explore marketplace
            </Link>
            <Link
              href="/student/access"
              className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/15"
            >
              Find student portal
            </Link>
          </div>
        </div>

        <div className="order-1 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] md:p-6 lg:order-2 lg:rounded-[32px] lg:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">Access form</p>
          <h3 className="mt-2 text-[clamp(1.45rem,2vw,2.2rem)] font-bold tracking-[-0.04em] text-slate-950">{formTitle}</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">{formSubtitle}</p>
          <div className="mt-5 md:mt-6">{children}</div>
        </div>
      </section>
    </main>
  );
}
