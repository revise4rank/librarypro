"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type PaymentRow = {
  id: string;
  library_name: string;
  amount: string;
  currency: string;
  status: string;
  reference_no: string | null;
  paid_at: string | null;
  created_at: string;
  invoice_url: string | null;
};

export function SuperadminPaymentsManager() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPayments() {
      try {
        const response = await apiFetch<{ success: boolean; data: PaymentRow[] }>("/admin/payments");
        setRows(response.data);
        setError(null);
      } catch (loadError) {
        setRows([]);
        setError(loadError instanceof Error ? loadError.message : "Unable to load platform payments.");
      }
    }

    void loadPayments();
  }, []);

  return (
    <DashboardCard title="Platform payment ledger" subtitle="Subscription payment history across all tenant libraries">
      {error ? <p className="mb-4 text-sm font-semibold text-amber-700">{error}</p> : null}
      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200">
        <div className="hidden grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.7fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500 md:grid">
          <span>Library</span>
          <span>Amount</span>
          <span>Reference</span>
          <span>Date</span>
          <span>Status</span>
        </div>
        {rows.map((payment) => (
          <div key={payment.id} className="border-t border-slate-200 bg-white px-4 py-4 text-sm">
            <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.7fr]">
              <span className="font-black text-slate-950">{payment.library_name}</span>
              <span><span className="mr-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400 md:hidden">Amount</span>Rs. {payment.amount}</span>
              <span><span className="mr-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400 md:hidden">Reference</span>{payment.reference_no ?? "-"}</span>
              <span><span className="mr-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400 md:hidden">Date</span>{(payment.paid_at ?? payment.created_at).slice(0, 10)}</span>
              <span><span className="mr-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400 md:hidden">Status</span>{payment.status}</span>
            </div>
          </div>
        ))}
        {rows.length === 0 ? <div className="border-t border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">No platform payments found.</div> : null}
      </div>
    </DashboardCard>
  );
}
