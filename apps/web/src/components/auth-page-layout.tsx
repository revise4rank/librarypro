import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
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
    <main className="min-h-screen bg-[linear-gradient(135deg,#ffffff_0%,#f4fbf8_48%,#eefbf5_100%)] text-[#0F172A]">
      <PublicSiteHeader activeLabel={activeNavLabel} />

      <section className="mx-auto grid w-full max-w-[1080px] gap-5 px-4 py-8 md:py-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
        <div className="order-2 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-7 lg:order-1">
          <div className="inline-flex rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            {eyebrow}
          </div>
          <h2 className="mt-5 max-w-3xl text-[clamp(2rem,4.2vw,3.65rem)] font-bold leading-[1.06] text-slate-900">
            {title}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{description}</p>

          <div className="mt-6 rounded-lg border border-emerald-100 bg-emerald-50/70 p-4">
            <p className="text-sm font-bold text-emerald-800">{accentTitle}</p>
            <div className="mt-4 grid gap-3">
              {accentPoints.map((point, index) => (
                <div key={point} className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-white p-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold text-emerald-700">0{index + 1}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-700">{point}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/student/access"
              className="inline-flex rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
            >
              Find student portal
            </Link>
          </div>
        </div>

        <div className="order-1 rounded-lg border border-slate-200 bg-white p-5 shadow-lg shadow-emerald-900/5 md:p-7 lg:order-2">
          <p className="text-sm font-bold text-emerald-700">Access form</p>
          <h3 className="mt-2 text-[clamp(1.5rem,2.3vw,2.2rem)] font-bold text-slate-950">{formTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{formSubtitle}</p>
          <div className="mt-5">{children}</div>
        </div>
      </section>
    </main>
  );
}
