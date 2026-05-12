import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerReferralsManager } from "../../../../components/owner-referrals-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerReferralsPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Referrals"
      title="Referral dashboard"
      description="Share your library code and track qualified bonus payouts."
      nav={ownerNav}
    >
      <OwnerReferralsManager />
    </DashboardShell>
  );
}
