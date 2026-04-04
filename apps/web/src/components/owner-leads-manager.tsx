"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type LeadRow = {
  id: string;
  channel: string;
  student_name: string | null;
  student_phone: string | null;
  student_email: string | null;
  message: string | null;
  source_page: string;
  status: string;
  assignee_label: string | null;
  follow_up_at: string | null;
  owner_notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
};

type LeadsResponse = {
  success: boolean;
  data: LeadRow[];
};

export function OwnerLeadsManager() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadLeads(nextStatus = statusFilter) {
    setLoading(true);
    try {
      const query = nextStatus === "ALL" ? "" : `?status=${encodeURIComponent(nextStatus)}`;
      const response = await apiFetch<LeadsResponse>(`/owner/leads${query}`);
      setRows(response.data);
      setError(null);
    } catch (loadError) {
      setRows([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load lead inbox.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLeads();
  }, []);

  async function updateLead(row: LeadRow, status: string) {
    try {
      await apiFetch(`/owner/leads/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          assigneeLabel: row.assignee_label ?? "Owner Desk",
          followUpAt: row.follow_up_at ?? "",
          ownerNotes: row.owner_notes ?? "",
          markContactedNow: status === "CONTACTED",
        }),
      });
      setMessage(`Lead moved to ${status}.`);
      await loadLeads();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update lead.");
    }
  }

  async function saveLead(row: LeadRow, updates: { ownerNotes?: string; assigneeLabel?: string; followUpAt?: string }) {
    try {
      await apiFetch(`/owner/leads/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ownerNotes: updates.ownerNotes ?? row.owner_notes ?? "",
          assigneeLabel: updates.assigneeLabel ?? row.assignee_label ?? "Owner Desk",
          followUpAt: updates.followUpAt ?? row.follow_up_at ?? "",
        }),
      });
      setMessage("Lead updated.");
      await loadLeads();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to save lead notes.");
    }
  }

  return (
    <div className="grid gap-6">
      <DashboardCard title="Lead inbox" subtitle="Marketplace call, WhatsApp, and form interest in one CRM-style inbox">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(event) => {
              const nextStatus = event.target.value;
              setStatusFilter(nextStatus);
              void loadLeads(nextStatus);
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="ALL">All leads</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="WON">Won</option>
            <option value="CLOSED">Closed</option>
          </select>
          {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}
        </div>
      </DashboardCard>

      <div className="grid gap-4">
        {loading ? <p className="text-sm text-slate-500">Loading leads...</p> : null}
        {!loading && rows.length === 0 ? (
          <DashboardCard title="No leads yet" subtitle="Call and WhatsApp clicks from marketplace and subdomain website will appear here." >
            <p className="text-sm text-slate-500">Publish offers on the marketplace and public website to start collecting leads.</p>
          </DashboardCard>
        ) : null}
        {rows.map((row) => (
          <DashboardCard key={row.id} title={row.student_name ?? row.student_phone ?? "Anonymous lead"} subtitle={`${row.channel} | ${row.source_page} | ${row.created_at.slice(0, 10)}`}>
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-5">
                <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Phone</p>
                  <p className="mt-2 font-bold text-slate-950">{row.student_phone ?? "-"}</p>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Email</p>
                  <p className="mt-2 font-bold text-slate-950">{row.student_email ?? "-"}</p>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Status</p>
                  <p className="mt-2 font-bold text-slate-950">{row.status}</p>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Last contacted</p>
                  <p className="mt-2 font-bold text-slate-950">{row.last_contacted_at?.slice(0, 10) ?? "-"}</p>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Follow-up</p>
                  <p className="mt-2 font-bold text-slate-950">{row.follow_up_at?.slice(0, 16).replace("T", " ") ?? "-"}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  defaultValue={row.assignee_label ?? "Owner Desk"}
                  onBlur={(event) => {
                    if ((row.assignee_label ?? "Owner Desk") !== event.target.value) {
                      void saveLead(row, { assigneeLabel: event.target.value });
                    }
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
                  placeholder="Assignee"
                />
                <input
                  type="datetime-local"
                  defaultValue={row.follow_up_at ? row.follow_up_at.slice(0, 16) : ""}
                  onBlur={(event) => {
                    if ((row.follow_up_at ? row.follow_up_at.slice(0, 16) : "") !== event.target.value) {
                      void saveLead(row, { followUpAt: event.target.value });
                    }
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
                />
              </div>
              <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700">
                {row.message ?? "No message provided. This lead was captured from a contact intent action."}
              </div>
              <textarea
                defaultValue={row.owner_notes ?? ""}
                onBlur={(event) => {
                  if ((row.owner_notes ?? "") !== event.target.value) {
                    void saveLead(row, { ownerNotes: event.target.value });
                  }
                }}
                className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
                placeholder="Owner notes, follow-up summary, or conversion details"
              />
              <div className="flex flex-wrap gap-3">
                {["NEW", "CONTACTED", "WON", "CLOSED"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => void updateLead(row, status)}
                    className={`rounded-full px-4 py-2 text-sm font-bold ${row.status === status ? "bg-[var(--lp-primary)] text-white" : "border border-slate-200 bg-white text-slate-700"}`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </DashboardCard>
        ))}
      </div>
    </div>
  );
}
