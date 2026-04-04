"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type LibraryRow = {
  id: string;
  name: string;
  slug: string;
  city: string;
  status: string;
  total_seats: number;
  available_seats: number;
  owner_name: string;
  owner_email: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
};

export function SuperadminLibrariesManager() {
  const [rows, setRows] = useState<LibraryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLibraries() {
      try {
        const response = await apiFetch<{ success: boolean; data: LibraryRow[] }>("/admin/libraries");
        setRows(response.data);
        setError(null);
      } catch (loadError) {
        setRows([]);
        setError(loadError instanceof Error ? loadError.message : "Unable to load libraries.");
      }
    }

    void loadLibraries();
  }, []);

  return (
    <DashboardCard title="Tenant directory" subtitle="All onboarded libraries">
      {error ? <p className="mb-4 text-sm font-semibold text-amber-700">{error}</p> : null}
      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200">
        <div className="hidden grid-cols-[1.2fr_0.8fr_1fr_0.9fr_0.7fr_0.8fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500 md:grid">
          <span>Library</span>
          <span>City</span>
          <span>Owner</span>
          <span>Plan</span>
          <span>Seats</span>
          <span>Status</span>
        </div>
        {rows.map((library) => (
          <div key={library.id} className="border-t border-slate-200 bg-white px-4 py-4 text-sm">
            <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_1fr_0.9fr_0.7fr_0.8fr]">
              <span className="font-black text-slate-950">{library.name}</span>
              <span><span className="mr-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400 md:hidden">City</span>{library.city}</span>
              <span><span className="mr-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400 md:hidden">Owner</span>{library.owner_name}</span>
              <span><span className="mr-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400 md:hidden">Plan</span>{library.plan_name ?? "No Plan"}</span>
              <span><span className="mr-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400 md:hidden">Seats</span>{library.available_seats}/{library.total_seats}</span>
              <span><span className="mr-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400 md:hidden">Status</span>{library.subscription_status ?? library.status}</span>
            </div>
          </div>
        ))}
        {rows.length === 0 ? <div className="border-t border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">No onboarded libraries found.</div> : null}
      </div>
    </DashboardCard>
  );
}
