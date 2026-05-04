"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type DashboardResponse = {
  success: boolean;
  data: {
    assignment: {
      seat_number: string | null;
      plan_name: string;
      ends_at: string;
      payment_status: string;
    } | null;
    library: {
      library_name: string;
      wifi_name: string | null;
      wifi_password: string | null;
      notice_message: string | null;
    } | null;
    upcomingDueDate: string | null;
  };
};

export function StudentSeatManager() {
  const [data, setData] = useState<DashboardResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLibraryInfo, setShowLibraryInfo] = useState(false);

  useEffect(() => {
    apiFetch<DashboardResponse>("/student/dashboard")
      .then((response) => {
        setData(response.data);
        setError(null);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load seat information.");
      });
  }, []);

  if (!data) {
    return <p className="text-sm text-slate-500">{error ?? "Loading seat details..."}</p>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <DashboardCard title="Assignment summary" subtitle="Current active subscription and seat">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Seat Number</p>
            <p className="mt-3 text-2xl font-bold text-slate-950">{data.assignment?.seat_number ?? "-"}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">Plan</p>
            <p className="mt-3 text-xl font-black text-slate-950">{data.assignment?.plan_name ?? "No active plan"}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">Valid Till</p>
            <p className="mt-3 text-xl font-black text-slate-950">{data.assignment?.ends_at ?? "-"}</p>
          </div>
          <div className="rounded-xl bg-cyan-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">Next Due</p>
            <p className="mt-3 text-xl font-black text-slate-950">{data.upcomingDueDate ?? "-"}</p>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard title="Library details" subtitle="Useful when arriving or contacting owner">
        <div className="grid gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            {data.library?.library_name ?? "No library linked"} | Payment status {data.assignment?.payment_status ?? "-"}
          </div>
          <button
            type="button"
            onClick={() => setShowLibraryInfo((current) => !current)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700"
          >
            {showLibraryInfo ? "Hide library details" : "Show library details"}
          </button>
          {showLibraryInfo ? (
            <div className="space-y-4 text-sm leading-7 text-slate-700">
              <p><span className="font-black text-slate-950">Library:</span> {data.library?.library_name ?? "-"}</p>
              <p><span className="font-black text-slate-950">WiFi:</span> {data.library?.wifi_name ?? "-"}</p>
              <p><span className="font-black text-slate-950">Password:</span> {data.library?.wifi_password ?? "-"}</p>
              <p><span className="font-black text-slate-950">Current notice:</span> {data.library?.notice_message ?? "No notice available right now."}</p>
              <p><span className="font-black text-slate-950">Payment status:</span> {data.assignment?.payment_status ?? "-"}</p>
            </div>
          ) : null}
        </div>
      </DashboardCard>
    </div>
  );
}
