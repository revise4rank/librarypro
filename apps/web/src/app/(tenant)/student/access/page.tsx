import Link from "next/link";
import { PublicSiteHeader } from "../../../../components/public-site-header";

export default function StudentAccessPage() {
  return (
    <main className="lp-density-surface min-h-screen bg-[#FAFAFA] text-[#0F172A]">
      <PublicSiteHeader activeLabel="Student Login" />

      <section className="mx-auto grid w-full max-w-[1040px] gap-4 px-4 py-6 md:py-8 lg:grid-cols-[0.95fr_1.05fr] lg:py-10">
        <div className="order-2 rounded-xl border border-slate-200 bg-[#0F172A] p-4 text-white shadow-sm md:p-5 lg:order-1">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-emerald-300">
            Student Portal
          </div>
          <h1 className="mt-4 max-w-3xl text-[clamp(1.8rem,4vw,3.2rem)] font-bold leading-[0.98] tracking-[-0.04em]">
            Find your library login.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
            Enter the library code once. We will open the correct student login page for QR, dues, notices, and study actions.
          </p>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-semibold text-emerald-300">Need direct login?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href="/student/login" className="lp-button border-white/10 bg-white/5 text-white hover:bg-white/10">
                Open student login
              </Link>
              <Link href="/student/register" className="lp-button border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15">
                Create account
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/owner/login"
              className="lp-button border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15"
            >
              Library access instead
            </Link>
          </div>
        </div>

        <div className="order-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 lg:order-2">
          <p className="lp-label text-emerald-700">Student access</p>
          <h2 className="mt-2 text-[clamp(1.45rem,2vw,2.2rem)] font-bold tracking-[-0.04em] text-slate-950">
            Continue with your library code
          </h2>

          <form action="/student/login" method="get" className="mt-4 grid gap-3">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Library code or subdomain
              <input
                name="library"
                required
                placeholder="for example: focuslibrary"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-400"
              />
            </label>

            <button
              type="submit"
              className="lp-button lp-button-primary"
            >
              Open student login
            </button>
          </form>

          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            New student?{" "}
            <Link href="/student/register" className="font-semibold text-emerald-700">
              Create account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
