"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type PlanRow = {
  plan_code: string;
  plan_name: string;
  amount: string;
  tenants: string;
  active_tenants: string;
  past_due_tenants: string;
};

export function SuperadminPlansManager() {
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlans() {
      try {
        const response = await apiFetch<{ success: boolean; data: PlanRow[] }>("/admin/plans");
        setRows(response.data);
        setError(null);
      } catch (loadError) {
        setRows([]);
        setError(loadError instanceof Error ? loadError.message : "Unable to load plan data.");
      }
    }

    void loadPlans();
  }, []);

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((plan) => (
        <DashboardCard key={plan.plan_code} title={plan.plan_name} subtitle={plan.plan_code}>
          <div className="space-y-3 text-sm leading-7 text-slate-700">
            <p><span className="font-black text-slate-950">Price:</span> {plan.amount === "Custom" ? "Custom" : `Rs. ${plan.amount}`}</p>
            <p><span className="font-black text-slate-950">Tenants:</span> {plan.tenants}</p>
            <p><span className="font-black text-slate-950">Active:</span> {plan.active_tenants}</p>
            <p><span className="font-black text-slate-950">Past Due:</span> {plan.past_due_tenants}</p>
          </div>
        </DashboardCard>
      ))}
      {rows.length === 0 ? <p className="text-sm text-slate-500">No plan summaries found.</p> : null}
      {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}
    </div>
  );
}
