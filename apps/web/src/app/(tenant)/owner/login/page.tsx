import { AuthPageLayout } from "../../../../components/auth-page-layout";
import { OwnerLoginForm } from "../../../../components/owner-login-form";
import Link from "next/link";

export default function OwnerLoginPage() {
  return (
    <AuthPageLayout
      eyebrow="Library Access"
      title="Run your library from one simple workspace."
      description="Open your owner dashboard for admissions, roster, seats, QR attendance, payments, reports, and public growth tools."
      accentTitle="Owner workspace highlights"
      accentPoints={[
        "Admissions, roster, seats, and manual attendance control",
        "Payments, dues, coupons, plans, receipts, and reports",
        "Marketplace listing, website builder, offers, and referrals",
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
