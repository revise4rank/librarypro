import { DashboardShell } from "../../../components/dashboard-shell";
import { SuperadminReferralsManager } from "../../../components/superadmin-referrals-manager";
import { adminNav } from "../../../lib/role-nav";

export default function SuperAdminReferralsPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Referral Handling"
      title="Referral handling"
      description="Track onboarding bonuses and mark paid settlements."
      nav={adminNav}
    >
      <SuperadminReferralsManager />
    </DashboardShell>
  );
}
