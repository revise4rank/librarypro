import Link from "next/link";
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
  const loginLibraryKey = libraryKey || "student-portal";
  const friendlyLibraryName = libraryKey ? titleCaseLibraryKey(libraryKey) : "BookLib Student";
  const initialBrand = {
    library_name: friendlyLibraryName,
    subdomain: libraryKey ?? "",
    brand_logo_url: null,
    hero_title: libraryKey ? "Continue your study routine from one portal." : "Student login stays direct and simple.",
    hero_tagline: libraryKey
      ? "Log in for QR access, dues, notices, study tools, and your daily library flow without a heavy page."
      : "Use your owner-issued student ID, mobile number, email, or student app password to enter your portal.",
    offer_text: libraryKey
      ? "Owner-issued student login for QR entry, payments, notices, and study continuity in one place."
      : "Direct login first. Find or join a library only when you need a new connection.",
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#ffffff_0%,#f4fbf8_48%,#eefbf5_100%)] text-[#0F172A]">
      <PublicSiteHeader
        ctaHref="/owner/register"
        ctaLabel="Start Free Trial"
        activeLabel="Student Login"
      />

      <section className="mx-auto grid w-full max-w-[1080px] gap-5 px-4 py-8 md:py-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
        <StudentLoginBrandPanel libraryKey={loginLibraryKey} initialBrand={initialBrand} showLibraryLink={Boolean(libraryKey)} />

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-lg shadow-emerald-900/5 md:p-7">
          <p className="text-sm font-bold text-emerald-700">Student login</p>
          <h3 className="mt-2 text-[clamp(1.5rem,2.3vw,2.2rem)] font-bold text-slate-950">Open your student portal</h3>
          <div className="mt-4">
            <RoleLoginForm
              expectedRole="STUDENT"
              loginLabel="Login ID"
              loginPlaceholder="Student ID, mobile, or email"
              passwordLabel="Password"
              passwordPlaceholder="Password"
              submitLabel="Open student portal"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href="/student/register" className="font-semibold text-emerald-700">
              Create student app account
            </Link>
            <span className="text-slate-300">|</span>
            <Link href="/student/access" className="font-semibold text-slate-700">
              Find library
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
