import Link from "next/link";
import { RoleLoginForm } from "../../../../components/owner-login-form";

type PublicLibraryProfileResponse = {
  success: boolean;
  data: {
    library_name: string;
    subdomain: string;
    brand_logo_url: string | null;
    hero_title: string;
    hero_tagline: string | null;
    offer_text: string | null;
  };
};

const PRODUCTION_API_ORIGIN = "https://librarypro-api.onrender.com";

function getApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || PRODUCTION_API_ORIGIN;
  return raw.endsWith("/v1") ? raw : `${raw}/v1`;
}

async function loadLibraryBrand(slugOrSubdomain: string) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/public/libraries/${encodeURIComponent(slugOrSubdomain)}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const json = (await response.json()) as PublicLibraryProfileResponse;
    return json.data;
  } catch {
    return null;
  }
}

export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ library?: string }>;
}) {
  const params = await searchParams;
  const libraryKey = params?.library ?? "focuslibrary";
  const brand = await loadLibraryBrand(libraryKey);
  const brandName = brand?.library_name ?? "Nextlib Student Portal";
  const brandOffer = brand?.offer_text ?? "Owner-issued student login ID for QR entry, payments, pomodoro study tracking, and daily library updates on Nextlib.";
  const brandTagline = brand?.hero_tagline ?? "Login to your library website and continue all student actions from here.";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(236,173,132,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(153,214,209,0.18),transparent_22%),linear-gradient(180deg,#fbf6ee_0%,#fffaf3_52%,#f6efe4_100%)] text-[var(--lp-text)]">
      <header className="border-b border-[var(--lp-border)] bg-[rgba(255,249,241,0.94)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-4 px-4 py-5 md:px-8">
          <div className="flex items-center gap-4">
            {brand?.brand_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.brand_logo_url} alt={brandName} className="h-14 w-14 rounded-[1.2rem] object-cover shadow-[0_10px_20px_rgba(111,95,74,0.14)]" />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-[1.2rem] bg-[linear-gradient(135deg,#e8a27d,#2f8f88)] text-lg font-black text-white">
                {brandName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[var(--lp-accent)]">Student Portal</p>
              <h1 className="mt-1 text-lg font-bold tracking-tight md:text-xl">{brandName}</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/library-site?slug=${brand?.subdomain ?? libraryKey}`} className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--lp-primary)]">
              Library website
            </Link>
            <Link href="/marketplace" className="rounded-full bg-[var(--lp-primary)] px-5 py-2.5 text-sm font-semibold text-white">
              Main marketplace
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-[1480px] gap-8 px-4 py-10 md:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:py-16">
        <div className="rounded-[2.4rem] border border-[var(--lp-border)] bg-[rgba(255,251,245,0.96)] p-8 shadow-[0_18px_54px_rgba(111,95,74,0.08)] md:p-12">
          <div className="inline-flex rounded-full bg-[#f8eadf] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--lp-primary)]">
            Student access on library subdomain
          </div>
          <h2 className="mt-6 max-w-4xl text-4xl font-extrabold leading-[1.04] tracking-tight md:text-6xl">
            {brand?.hero_title ?? "Log in to your library and continue QR entry, payments, and daily study tracking."}
          </h2>
          <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--lp-muted)] md:text-lg">{brandTagline}</p>

          <div className="mt-10 rounded-[2rem] bg-[linear-gradient(135deg,_#f8e6d9,_#fff6ea_45%,_#e2f1ed)] p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--lp-accent)]">Owner offer</p>
            <h3 className="mt-3 text-2xl font-extrabold">{brandOffer}</h3>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                "Owner creates your student ID and password",
                "Same library website handles QR and notices",
                "Track regular study days, focus streak, and study goals",
              ].map((point, index) => (
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
          <h3 className="mt-3 text-3xl font-extrabold">Student login</h3>
          <p className="mt-3 text-sm leading-7 text-[var(--lp-muted)]">Owner-issued student ID, mobile, ya email se login karo. Login ke baad seat, progress, payment, QR, notice board, pomodoro, subjects, aur study goals sab yahin milega.</p>
          <div className="mt-8">
            <RoleLoginForm expectedRole="STUDENT" loginPlaceholder="Student ID, mobile, or email" passwordPlaceholder="Password" submitLabel="Login as Student" />
          </div>
          <div className="mt-4">
            <Link href="/student/register" className="text-sm font-semibold text-[var(--lp-primary)]">
              New student app? Create your account first
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
