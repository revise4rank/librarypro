import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerMarketingManager } from "../../../../components/owner-marketing-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerOffersPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Marketing"
      title="Offers"
      description="Marketing surfaces are grouped together so offers and visibility work stay in one module."
      nav={ownerNav}
    >
      <OwnerMarketingManager initialTab="offers" />
    </DashboardShell>
  );
}
