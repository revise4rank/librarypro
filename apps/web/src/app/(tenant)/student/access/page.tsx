import Link from "next/link";
import { PublicSiteHeader } from "../../../../components/public-site-header";

export default function StudentAccessPage() {
  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#0F172A]">
      <PublicSiteHeader activeLabel="Student Login" />

      <section className="mx-auto grid w-full max-w-[1120px] gap-5 px-4 py-8 md:py-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-6 lg:py-16">
        <div className="order-2 rounded-[28px] border border-slate-200 bg-[#0F172A] p-5 text-white shadow-[0_30px_70px_rgba(15,23,42,0.12)] md:p-7 lg:order-1 lg:rounded-[32px] lg:p-8">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Student Portal
          </div>
          <h1 className="mt-5 max-w-3xl text-[clamp(2.1rem,4vw,4.1rem)] font-bold leading-[0.95] tracking-[-0.05em]">
            Open the right student portal for your library.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-[15px]">
            Enter your library code or subdomain first. Then we will open the correct student login with the right
            branding, notices, dues, QR access, and study continuity for that library.
          </p>

          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4 md:mt-8 md:rounded-[28px] md:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">What students need</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                "Library code or subdomain from the owner desk",
                "Owner-issued credentials for the student portal",
                "One place for QR, dues, notices, and daily study flow",
              ].map((point, index) => (
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
              Find your library
            </Link>
            <Link
              href="/owner/login"
              className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/15"
            >
              Library access instead
            </Link>
          </div>
        </div>

        <div className="order-1 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] md:p-6 lg:order-2 lg:rounded-[32px] lg:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">Student access</p>
          <h2 className="mt-2 text-[clamp(1.45rem,2vw,2.2rem)] font-bold tracking-[-0.04em] text-slate-950">
            Continue with your library code
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Use the library code or subdomain shared by your library owner. We will take you to the correct student
            login next.
          </p>

          <form action="/student/login" method="get" className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Library code or subdomain
              <input
                name="library"
                required
                placeholder="for example: focuslibrary"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-400"
              />
            </label>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#111C33]"
            >
              Open student login
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
