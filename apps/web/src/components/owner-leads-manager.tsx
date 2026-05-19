"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";
import { FormDrawer } from "./form-drawer";

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
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);

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
      setSelectedLead(null);
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
      setSelectedLead(null);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to save lead notes.");
    }
  }

  const newCount = rows.filter((row) => row.status === "NEW").length;
  const contactedCount = rows.filter((row) => row.status === "CONTACTED").length;
  const wonCount = rows.filter((row) => row.status === "WON").length;

  return (
    <>
    <div className="grid gap-6">
      <DashboardCard title="Lead inbox" subtitle="Marketplace call, WhatsApp, and form interest in one CRM-style inbox">
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Total</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{rows.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">New</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{newCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Contacted</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{contactedCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Won</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{wonCount}</p>
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(event) => {
              const nextStatus = event.target.value;
              setStatusFilter(nextStatus);
              void loadLeads(nextStatus);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none sm:max-w-xs"
          >
            <option value="ALL">Show all leads</option>
            <option value="NEW">Show new leads</option>
            <option value="CONTACTED">Show contacted leads</option>
            <option value="WON">Show won leads</option>
            <option value="CLOSED">Show closed leads</option>
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
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Phone</p>
                  <p className="mt-2 font-bold text-slate-950">{row.student_phone ?? "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Email</p>
                  <p className="mt-2 font-bold text-slate-950">{row.student_email ?? "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Status</p>
                  <p className="mt-2 font-bold text-slate-950">{row.status}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Last contacted</p>
                  <p className="mt-2 font-bold text-slate-950">{row.last_contacted_at?.slice(0, 10) ?? "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Follow-up</p>
                  <p className="mt-2 font-bold text-slate-950">{row.follow_up_at?.slice(0, 16).replace("T", " ") ?? "-"}</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700">
                {row.message ?? "No message provided. This lead was captured from a contact intent action."}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedLead(row)}
                  className="rounded-full border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-bold text-[var(--lp-accent-strong)]"
                >
                  Manage lead
                </button>
                {["NEW", "CONTACTED", "WON", "CLOSED"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => void updateLead(row, status)}
                    className={`rounded-full px-4 py-2 text-sm font-bold ${row.status === status ? "border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent-strong)]" : "border border-slate-200 bg-white text-slate-700"}`}
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
    <FormDrawer
      open={Boolean(selectedLead)}
      onClose={() => setSelectedLead(null)}
      title="Manage lead"
      description="Update ownership, follow-up time, notes, and conversion status without stretching the lead list."
    >
      {selectedLead ? (
        <LeadDrawerContent
          row={selectedLead}
          onSave={(updates) => void saveLead(selectedLead, updates)}
          onMove={(status) => void updateLead(selectedLead, status)}
        />
      ) : null}
    </FormDrawer>
    </>
  );
}

function LeadDrawerContent({
  row,
  onSave,
  onMove,
}: {
  row: LeadRow;
  onSave: (updates: { ownerNotes?: string; assigneeLabel?: string; followUpAt?: string }) => void;
  onMove: (status: string) => void;
}) {
  const [assigneeLabel, setAssigneeLabel] = useState(row.assignee_label ?? "Owner Desk");
  const [followUpAt, setFollowUpAt] = useState(row.follow_up_at ? row.follow_up_at.slice(0, 16) : "");
  const [ownerNotes, setOwnerNotes] = useState(row.owner_notes ?? "");

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Lead</p>
        <p className="mt-2 text-xl font-black text-slate-950">{row.student_name ?? row.student_phone ?? "Anonymous lead"}</p>
        <p className="mt-1 text-sm text-slate-600">{[row.student_phone, row.student_email].filter(Boolean).join(" | ") || "No contact saved"}</p>
      </div>
      <input
        value={assigneeLabel}
        onChange={(event) => setAssigneeLabel(event.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-4 py-4 outline-none"
        placeholder="Assignee"
      />
      <input
        type="datetime-local"
        value={followUpAt}
        onChange={(event) => setFollowUpAt(event.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-4 py-4 outline-none"
      />
      <textarea
        value={ownerNotes}
        onChange={(event) => setOwnerNotes(event.target.value)}
        className="min-h-32 rounded-xl border border-slate-200 bg-white px-4 py-4 outline-none"
        placeholder="Owner notes, follow-up summary, or conversion details"
      />
      <button
        type="button"
        onClick={() => onSave({ assigneeLabel, followUpAt, ownerNotes })}
        className="rounded-full bg-[var(--lp-primary)] px-5 py-3 text-sm font-bold text-white"
      >
        Save lead details
      </button>
      <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Move status</p>
        <div className="flex flex-wrap gap-2">
          {["NEW", "CONTACTED", "WON", "CLOSED"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onMove(status)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${row.status === status ? "border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent-strong)]" : "border border-slate-200 bg-white text-slate-700"}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
