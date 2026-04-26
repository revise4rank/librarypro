import Link from "next/link";
import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerDashboardManager } from "../../../../components/owner-dashboard-manager";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerDashboardPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Owner App"
      title="Admissions first. Roster next. Seats only when they are ready."
      description="Run new onboarding from Admissions, manage active students from the roster, and handle seat allotment only when needed."
      nav={ownerNav}
      actions={
        <>
          <Link href="/owner/admissions" className="rounded-[0.95rem] bg-[var(--lp-accent-soft)] px-4 py-2.5 text-sm font-bold text-[var(--lp-accent)]">
            New admission
          </Link>
          <Link href="/owner/students" className="rounded-[0.95rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-2.5 text-sm font-bold text-[var(--lp-text)]">
            Open roster
          </Link>
        </>
      }
    >
      <OwnerDashboardManager />
    </DashboardShell>
  );
}
