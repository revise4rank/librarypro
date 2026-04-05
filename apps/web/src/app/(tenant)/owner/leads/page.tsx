import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerLeadsManager } from "../../../../components/owner-leads-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerLeadsPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Lead Inbox"
      title="Track marketplace and website enquiries like a lightweight owner CRM."
      description="Every call, WhatsApp click, and form enquiry from your marketplace listing or subdomain website lands here for follow-up."
      nav={ownerNav}
    >
      <OwnerLeadsManager />
    </DashboardShell>
  );
}
