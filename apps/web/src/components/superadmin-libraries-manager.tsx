"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";
import { StatCard } from "./stat-card";

type LibraryRow = {
  id: string;
  name: string;
  slug: string;
  city: string;
  area: string | null;
  address: string;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  total_seats: number;
  available_seats: number;
  owner_user_id: string;
  owner_name: string;
  owner_email: string | null;
  owner_phone: string | null;
  owner_active: boolean;
  plan_name: string | null;
  plan_code: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  active_students: string;
  admins: string;
  pending_join_requests: string;
  unpaid_amount: string;
  created_at: string;
  updated_at: string;
};

type FormState = {
  name: string;
  city: string;
  area: string;
  address: string;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  ownerFullName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerActive: boolean;
};

function toForm(library: LibraryRow): FormState {
  return {
    name: library.name,
    city: library.city,
    area: library.area ?? "",
    address: library.address,
    status: library.status,
    ownerFullName: library.owner_name,
    ownerEmail: library.owner_email ?? "",
    ownerPhone: library.owner_phone ?? "",
    ownerActive: library.owner_active,
  };
}

function statusTone(status: string) {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700";
  if (status === "SUSPENDED") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

export function SuperadminLibrariesManager() {
  const [rows, setRows] = useState<LibraryRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [form, setForm] = useState<FormState | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadLibraries(nextSelectedId?: string) {
    const response = await apiFetch<{ success: boolean; data: LibraryRow[] }>("/admin/libraries");
    setRows(response.data);
    const nextSelected = response.data.find((row) => row.id === (nextSelectedId ?? selectedId)) ?? response.data[0] ?? null;
    setSelectedId(nextSelected?.id ?? "");
    setForm(nextSelected ? toForm(nextSelected) : null);
    setError(null);
  }

  useEffect(() => {
    loadLibraries().catch((loadError) => {
      setRows([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load libraries.");
    });
  }, []);

  const selected = useMemo(() => rows.find((row) => row.id === selectedId) ?? null, [rows, selectedId]);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = statusFilter === "ALL" || row.status === statusFilter;
      const matchesQuery = !query || [row.name, row.city, row.area, row.owner_name, row.owner_email, row.slug]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [rows, search, statusFilter]);

  const activeCount = rows.filter((row) => row.status === "ACTIVE").length;
  const blockedCount = rows.filter((row) => row.status !== "ACTIVE" || !row.owner_active).length;
  const studentsCount = rows.reduce((sum, row) => sum + Number(row.active_students || 0), 0);
  const unpaidTotal = rows.reduce((sum, row) => sum + Number(row.unpaid_amount || 0), 0);

  function selectLibrary(library: LibraryRow) {
    setSelectedId(library.id);
    setForm(toForm(library));
    setMessage(null);
    setError(null);
  }

  async function saveLibrary(next?: Partial<FormState>) {
    if (!selected || !form) return;
    const payload = { ...form, ...next };
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch(`/admin/libraries/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setMessage(`${payload.name} updated.`);
      await loadLibraries(selected.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update library.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active libraries" value={activeCount} note="Tenants allowed to operate." />
        <StatCard label="Blocked / risk" value={blockedCount} note="Suspended, inactive, or owner blocked." />
        <StatCard label="Active students" value={studentsCount} note="Live assigned student count." />
        <StatCard label="Unpaid dues" value={`Rs. ${unpaidTotal.toFixed(0)}`} note="Pending and due student payments." />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <DashboardCard title="Tenant control center" subtitle="Select any library to edit, suspend, unblock, or inspect.">
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search library, city, owner, email"
                className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none"
              >
                <option value="ALL">All</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div className="grid max-h-[34rem] gap-2 overflow-auto pr-1">
              {filteredRows.map((library) => (
                <button
                  key={library.id}
                  type="button"
                  onClick={() => selectLibrary(library)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selectedId === library.id ? "border-[var(--lp-primary)] bg-[#fff7f1]" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-slate-950">{library.name}</p>
                      <p className="mt-1 truncate text-sm text-slate-500">{[library.city, library.owner_name].filter(Boolean).join(" | ")}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusTone(library.status)}`}>{library.status}</span>
                  </div>
                </button>
              ))}
              {filteredRows.length === 0 ? <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">No libraries found.</p> : null}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Super admin powers" subtitle="Block access, edit owner details, and inspect operational data.">
          {selected && form ? (
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-bold text-slate-700">
                  Library name
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none" />
                </label>
                <label className="grid gap-1 text-sm font-bold text-slate-700">
                  Status
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as FormState["status"] })} className="rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none">
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-bold text-slate-700">
                  City
                  <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none" />
                </label>
                <label className="grid gap-1 text-sm font-bold text-slate-700">
                  Area
                  <input value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none" />
                </label>
                <label className="grid gap-1 text-sm font-bold text-slate-700 md:col-span-2">
                  Address
                  <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none" />
                </label>
                <label className="grid gap-1 text-sm font-bold text-slate-700">
                  Owner name
                  <input value={form.ownerFullName} onChange={(event) => setForm({ ...form, ownerFullName: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none" />
                </label>
                <label className="grid gap-1 text-sm font-bold text-slate-700">
                  Owner email
                  <input value={form.ownerEmail} onChange={(event) => setForm({ ...form, ownerEmail: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none" />
                </label>
                <label className="grid gap-1 text-sm font-bold text-slate-700">
                  Owner phone
                  <input value={form.ownerPhone} onChange={(event) => setForm({ ...form, ownerPhone: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none" />
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">
                  <input type="checkbox" checked={form.ownerActive} onChange={(event) => setForm({ ...form, ownerActive: event.target.checked })} />
                  Owner login active
                </label>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <button type="button" onClick={() => void saveLibrary()} disabled={saving} className="rounded-xl bg-[var(--lp-primary)] px-4 py-3 text-sm font-black text-white disabled:opacity-50">
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button type="button" onClick={() => void saveLibrary({ status: "SUSPENDED", ownerActive: false })} disabled={saving} className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">
                  Block tenant
                </button>
                <button type="button" onClick={() => void saveLibrary({ status: "ACTIVE", ownerActive: true })} disabled={saving} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 disabled:opacity-50">
                  Unblock
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-3"><p className="lp-stat-label">Plan</p><p className="mt-1 font-black">{selected.plan_name ?? "No plan"}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="lp-stat-label">Subscription</p><p className="mt-1 font-black">{selected.subscription_status ?? "-"}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="lp-stat-label">Renewal</p><p className="mt-1 font-black">{selected.current_period_end ?? "-"}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="lp-stat-label">Students</p><p className="mt-1 font-black">{selected.active_students}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="lp-stat-label">Admins</p><p className="mt-1 font-black">{selected.admins}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="lp-stat-label">Pending joins</p><p className="mt-1 font-black">{selected.pending_join_requests}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="lp-stat-label">Seats</p><p className="mt-1 font-black">{selected.available_seats}/{selected.total_seats}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="lp-stat-label">Dues</p><p className="mt-1 font-black">Rs. {Number(selected.unpaid_amount || 0).toFixed(0)}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="lp-stat-label">Slug</p><p className="mt-1 truncate font-black">{selected.slug}</p></div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a library to manage it.</p>
          )}
        </DashboardCard>
      </section>
    </div>
  );
}
