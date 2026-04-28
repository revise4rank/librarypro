import { DashboardShell } from "../../../components/dashboard-shell";
import { SuperadminMarketplaceManager } from "../../../components/superadmin-marketplace-manager";
import { adminNav } from "../../../lib/role-nav";

export default function SuperadminMarketplacePage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Marketplace"
      title="Marketplace control"
      description="Edit public discovery headline and rotating banner content."
      nav={adminNav}
    >
      <SuperadminMarketplaceManager />
    </DashboardShell>
  );
}
