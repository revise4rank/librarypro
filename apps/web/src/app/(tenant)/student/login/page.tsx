import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleLoginForm } from "../../../../components/owner-login-form";
import { PublicSiteHeader } from "../../../../components/public-site-header";
import { StudentLoginBrandPanel } from "../../../../components/student-login-brand-panel";

function titleCaseLibraryKey(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ library?: string }>;
}) {
  const params = await searchParams;
  const libraryKey = params?.library?.trim();
  if (!libraryKey) {
    redirect("/student/access");
  }
  const friendlyLibraryName = titleCaseLibraryKey(libraryKey);
  const initialBrand = {
    library_name: friendlyLibraryName,
    subdomain: libraryKey,
    brand_logo_url: null,
    hero_title: "Continue your library routine from one student portal.",
    hero_tagline: "Log in for QR access, dues, notices, and your daily study flow without waiting on a heavy page load.",
    offer_text: "Owner-issued student login for QR entry, payments, notices, and study continuity in one place.",
  };

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#0F172A]">
      <PublicSiteHeader
        ctaHref="/owner/login"
        ctaLabel="Start Free Trial"
        activeLabel="Student Login"
      />

      <section className="mx-auto grid w-full max-w-[1120px] gap-6 px-4 py-12 md:py-16 lg:grid-cols-[1.04fr_0.96fr]">
        <StudentLoginBrandPanel libraryKey={libraryKey} initialBrand={initialBrand} />

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] md:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">Student login</p>
          <h3 className="mt-2 text-[clamp(1.45rem,2vw,2.2rem)] font-bold tracking-[-0.04em] text-slate-950">Open your student portal</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Use your student app email, phone, or owner-issued student ID to continue QR access, payments, notices, and daily study actions.
          </p>
          <div className="mt-6">
            <RoleLoginForm
              expectedRole="STUDENT"
              loginPlaceholder="Student ID, mobile, or email"
              passwordPlaceholder="Password"
              submitLabel="Open student portal"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href="/student/register" className="font-semibold text-emerald-700">
              Create student app account
            </Link>
            <span className="text-slate-300">|</span>
            <Link href="/student/access" className="font-semibold text-slate-700">
              Change library
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
