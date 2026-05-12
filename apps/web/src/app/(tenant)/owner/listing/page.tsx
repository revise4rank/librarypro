import Link from "next/link";
import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerListingPageManager } from "../../../../components/owner-listing-page-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerListingPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Listing"
      title="Marketplace Listing"
      description="Manage marketplace visibility, listing copy, admission CTA, and listing media from its own page."
      nav={ownerNav}
      actions={
        <Link href="/owner/website" className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-2 text-sm font-semibold text-[var(--lp-text)]">
          Open website builder
        </Link>
      }
    >
      <OwnerListingPageManager />
    </DashboardShell>
  );
}
