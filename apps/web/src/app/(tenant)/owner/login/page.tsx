import { AuthPageLayout } from "../../../../components/auth-page-layout";
import { OwnerLoginForm } from "../../../../components/owner-login-form";
import Link from "next/link";

export default function OwnerLoginPage() {
  return (
    <AuthPageLayout
      eyebrow="Library Access"
      title="Open your library workspace and keep daily operations moving."
      description="Manage seats, students, dues, attendance, notices, and your public library presence from one calm operating surface."
      accentTitle="Library access gives you"
      accentPoints={[
        "Seat layout and student assignment control",
        "Payments, dues, notices, and expiry tracking",
        "Public subdomain website and marketplace presence",
      ]}
      formTitle="Library access"
      formSubtitle="Use your owner email or phone to enter the dashboard."
      activeNavLabel="Library Access"
    >
      <div className="grid gap-4">
        <OwnerLoginForm />
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
          New library owner?
          <div className="mt-3 flex flex-wrap gap-4">
            <Link href="/owner/register" className="font-semibold text-emerald-700">
              Create library account
            </Link>
            <Link href="/student/access" className="font-semibold text-emerald-700">
              Find student portal
            </Link>
          </div>
        </div>
      </div>
    </AuthPageLayout>
  );
}
