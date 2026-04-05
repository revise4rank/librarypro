import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerOffersManager } from "../../../../components/owner-offers-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerOffersPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Offers"
      title="Submit owner promotions and library discounts for admin moderation."
      description="Keep promotions clean and relevant. Student feed is optional and separate from productivity flow."
      nav={ownerNav}
    >
      <OwnerOffersManager />
    </DashboardShell>
  );
}
