import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerSeatsManager } from "../../../../components/owner-seats-manager";
import { ownerNav } from "../../../../lib/role-nav";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function OwnerSeatsPage() {
  return (
    <DashboardShell
      productLabel="LibraryPro"
      panelLabel="Seatmap"
      title="Manage floors, seats, and assignment flow from one cleaner seat app."
      description="Built for fast setup, quick layout edits, and simpler daily seat operations."
      nav={ownerNav}
      actions={
        <>
          <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Seat App v2
          </span>
          <Link href="/owner/seats?workspace=setup&ribbon=floor#seat-create-floor" className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-2.5 text-sm font-bold text-[var(--lp-primary)]">
            Add floor
          </Link>
          <Link href="/owner/seats?workspace=setup&ribbon=bank#seat-create-bank" className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-2.5 text-sm font-bold text-[var(--lp-primary)]">
            Add seats
          </Link>
          <Link href="/owner/seats?workspace=layout&planner=layout#seat-planner" className="rounded-lg bg-[var(--lp-accent-soft)] px-4 py-2.5 text-sm font-bold text-[var(--lp-accent)]">
            Open planner
          </Link>
        </>
      }
    >
      <OwnerSeatsManager />
    </DashboardShell>
  );
}
