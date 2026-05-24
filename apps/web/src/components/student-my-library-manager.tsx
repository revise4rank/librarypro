"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

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

type LibrariesResponse = {
  success: boolean;
  data: Array<{
    library_id: string;
    library_name: string;
    city: string;
    seat_number: string | null;
    login_id: string;
    is_active: boolean;
    joined_at: string;
  }>;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function StudentMyLibraryManager() {
  const [data, setData] = useState<DashboardResponse["data"] | null>(null);
  const [libraries, setLibraries] = useState<LibrariesResponse["data"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showWifi, setShowWifi] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<DashboardResponse>("/student/dashboard"),
      apiFetch<LibrariesResponse>("/student/libraries"),
    ])
      .then(([dashResponse, libResponse]) => {
        setData(dashResponse.data);
        setLibraries(libResponse.data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to load library info.");
      });
  }, []);

  if (!data) {
    return <p className="text-sm text-slate-500">{error ?? "Loading library info..."}</p>;
  }

  return (
    <div className="grid gap-3 md:gap-6">
      {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}

      {/* Seat + Plan summary */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <span className="flex-shrink-0 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-bold text-cyan-800">
          Seat {data.assignment?.seat_number ?? "-"}
        </span>
        <span className="flex-shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-800">
          {data.assignment?.plan_name ?? "No active plan"}
        </span>
        <span className="flex-shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-800">
          Valid {formatDate(data.assignment?.ends_at)}
        </span>
        <span className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-sm font-bold ${
          data.assignment?.payment_status === "PAID"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-red-200 bg-red-50 text-red-800"
        }`}>
          {data.assignment?.payment_status ?? "No plan"}
        </span>
      </div>

      {/* Library name + notice */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Library</p>
        <p className="mt-2 text-lg font-black text-slate-950">{data.library?.library_name ?? "No library linked"}</p>
        {data.library?.notice_message ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">Notice</p>
            <p className="mt-1.5 text-sm leading-6 text-slate-700">{data.library.notice_message}</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No active notice.</p>
        )}
      </div>

      {/* WiFi */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">WiFi</p>
        <p className="mt-2 text-base font-black text-slate-950">{data.library?.wifi_name ?? "Not set"}</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-sm text-slate-600">{showWifi ? (data.library?.wifi_password ?? "-") : "••••••••"}</span>
          <button
            type="button"
            onClick={() => setShowWifi((v) => !v)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600"
          >
            {showWifi ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-2">
        <Link href="/student/qr" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-800">
          <span className="text-lg">📷</span> My QR
        </Link>
        <Link href="/student/payments" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-800">
          <span className="text-lg">💳</span> Pay
        </Link>
        <Link href="/student/seat" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-800">
          <span className="text-lg">🪑</span> Seat Info
        </Link>
        <Link href="/student/join-library" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-800">
          <span className="text-lg">🏛️</span> Join Library
        </Link>
      </div>

      {/* Connected libraries */}
      {libraries.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Connected libraries</p>
          <div className="mt-3 grid gap-2">
            {libraries.map((lib) => (
              <div key={lib.library_id} className={`rounded-xl border p-3 ${lib.is_active ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                <p className="text-sm font-bold text-slate-950">{lib.library_name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{lib.city} · Login {lib.login_id} · Seat {lib.seat_number ?? "-"}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
