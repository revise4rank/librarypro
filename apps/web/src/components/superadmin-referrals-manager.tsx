"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type AdminReferral = {
  id: string;
  referrer_library_name: string;
  referred_library_name: string;
  referred_library_city: string | null;
  referral_code: string;
  plan_code: string | null;
  bonus_amount: string;
  status: "PENDING" | "QUALIFIED" | "PAID" | "REJECTED";
  created_at: string;
  qualified_at: string | null;
  paid_at: string | null;
};

const statuses = ["PENDING", "QUALIFIED", "PAID", "REJECTED"] as const;

export function SuperadminReferralsManager() {
  const [rows, setRows] = useState<AdminReferral[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadRows() {
    try {
      const response = await apiFetch<{ success: boolean; data: AdminReferral[] }>("/admin/referrals");
      setRows(response.data);
      setError(null);
    } catch (loadError) {
      setRows([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load referrals.");
    }
  }

  useEffect(() => {
    void loadRows();
  }, []);

  async function updateStatus(referralId: string, status: AdminReferral["status"]) {
    try {
      await apiFetch(`/admin/referrals/${referralId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setMessage("Referral status updated.");
      await loadRows();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update referral.");
    }
  }

  return (
    <div className="grid gap-4">
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}
      <DashboardCard title="Referral handling" subtitle="Review qualified bonuses and mark payouts after manual settlement.">
        <div className="grid gap-3">
          {rows.map((row) => (
            <article key={row.id} className="rounded-xl border border-[var(--lp-border)] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black text-[var(--lp-text)]">{row.referrer_library_name} to {row.referred_library_name}</p>
                  <p className="mt-1 text-sm text-[var(--lp-muted)]">
                    {row.referral_code} | {row.plan_code ?? "Trial"} | Rs. {Number(row.bonus_amount).toLocaleString("en-IN")}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--lp-surface-muted)] px-3 py-1 text-xs font-black text-[var(--lp-muted)]">{row.status}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => void updateStatus(row.id, status)}
                    className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-xs font-bold text-[var(--lp-text)]"
                  >
                    {status}
                  </button>
                ))}
              </div>
            </article>
          ))}
          {rows.length === 0 ? <p className="text-sm text-[var(--lp-muted)]">No referrals found yet.</p> : null}
        </div>
      </DashboardCard>
    </div>
  );
}
