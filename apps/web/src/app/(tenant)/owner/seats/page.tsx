import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerSeatsManager } from "../../../../components/owner-seats-manager";
import { ownerNav } from "../../../../lib/role-nav";
import Link from "next/link";

export default function OwnerSeatsPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Seat Control"
      title="RedBus-style visual seat control with live assignment persistence."
      description="Seat clicks and student drops should save instantly, free old seats correctly, and keep marketplace availability honest."
      nav={ownerNav}
      actions={
        <>
          <Link href="/owner/seats#seat-create-floor" className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-5 py-3 text-sm font-bold text-[var(--lp-primary)]">
            Add floor
          </Link>
          <Link href="/owner/seats#seat-create-bank" className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-5 py-3 text-sm font-bold text-[var(--lp-primary)]">
            Add seats
          </Link>
          <Link href="/owner/seats#seat-planner" className="rounded-full bg-[var(--lp-primary)] px-5 py-3 text-sm font-bold text-white">
            Open planner
          </Link>
        </>
      }
    >
      <OwnerSeatsManager />
    </DashboardShell>
  );
}
