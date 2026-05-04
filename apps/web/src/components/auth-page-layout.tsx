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
    <main className="lp-density-surface min-h-screen bg-[#FAFAFA] text-[#0F172A]">
      <PublicSiteHeader activeLabel={activeNavLabel} />

      <section className="mx-auto grid w-full max-w-[1040px] gap-4 px-4 py-6 md:py-8 lg:grid-cols-[1fr_1fr] lg:py-10">
        <div className="order-2 rounded-xl border border-slate-800 bg-[#0F172A] p-4 text-white shadow-sm md:p-5 lg:order-1">
          <div className="inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-emerald-300">
            {eyebrow}
          </div>
          <h2 className="mt-4 max-w-3xl text-[clamp(1.65rem,3.5vw,2.7rem)] font-bold leading-[1.04] tracking-[-0.035em]">
            {title}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">{description}</p>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-semibold text-emerald-300">{accentTitle}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {accentPoints.map((point, index) => (
                <div key={point} className="rounded-lg border border-white/10 bg-[#111C33] p-3">
                  <p className="text-xs font-bold text-emerald-300">0{index + 1}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-200">{point}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/marketplace"
              className="lp-button border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              Explore marketplace
            </Link>
            <Link
              href="/student/access"
              className="lp-button border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15"
            >
              Find student portal
            </Link>
          </div>
        </div>

        <div className="order-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 lg:order-2">
          <p className="lp-label text-emerald-700">Access form</p>
          <h3 className="mt-2 text-[clamp(1.35rem,2vw,1.95rem)] font-bold tracking-[-0.035em] text-slate-950">{formTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{formSubtitle}</p>
          <div className="mt-4">{children}</div>
        </div>
      </section>
    </main>
  );
}
