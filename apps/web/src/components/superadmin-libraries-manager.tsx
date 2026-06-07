"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";
import { FormDrawer } from "./form-drawer";
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

type TenantOverview = {
  overview: LibraryRow & {
    today_checkins: string;
    starting_price: string;
    offer_text: string | null;
  };
  users: Array<Record<string, string | boolean | string[] | null>>;
  students: Array<Record<string, string | boolean | null>>;
  payments: Array<Record<string, string | null>>;
  seats: Record<string, string>;
  website: Record<string, unknown> | null;
  activity: Array<Record<string, string | null>>;
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

const tabs = ["Overview", "Users", "Students", "Payments", "Seats", "Website", "Activity", "Danger"] as const;
type TenantTab = (typeof tabs)[number];

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

function text(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export function SuperadminLibrariesManager() {
  const [rows, setRows] = useState<LibraryRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [overview, setOverview] = useState<TenantOverview | null>(null);
  const [tab, setTab] = useState<TenantTab>("Overview");
  const [form, setForm] = useState<FormState | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [archiveConfirm, setArchiveConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  async function loadLibraries(nextSelectedId?: string) {
    const response = await apiFetch<{ success: boolean; data: LibraryRow[] }>("/admin/libraries");
    setRows(response.data);
    const nextSelected = response.data.find((row) => row.id === (nextSelectedId ?? selectedId)) ?? response.data[0] ?? null;
    setSelectedId(nextSelected?.id ?? "");
    setForm(nextSelected ? toForm(nextSelected) : null);
    setError(null);
    if (nextSelected) await loadOverview(nextSelected.id);
  }

  async function loadOverview(libraryId: string) {
    const response = await apiFetch<{ success: boolean; data: TenantOverview }>(`/admin/libraries/${libraryId}/overview`);
    setOverview(response.data);
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
      const matchesQuery = !query || [row.name, row.city, row.area, row.owner_name, row.owner_email, row.slug, row.plan_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [rows, search, statusFilter]);

  const activeCount = rows.filter((row) => row.status === "ACTIVE").length;
  const blockedCount = rows.filter((row) => row.status !== "ACTIVE" || !row.owner_active).length;
  const studentsCount = rows.reduce((sum, row) => sum + Number(row.active_students || 0), 0);
  const unpaidTotal = rows.reduce((sum, row) => sum + Number(row.unpaid_amount || 0), 0);

  async function selectLibrary(library: LibraryRow) {
    setSelectedId(library.id);
    setForm(toForm(library));
    setTab("Overview");
    setMessage(null);
    setError(null);
    await loadOverview(library.id);
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
      setFormOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update library.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(status: "ACTIVE" | "SUSPENDED" | "INACTIVE", ownerActive: boolean, reason?: string) {
    if (!selected) return;
    setSaving(true);
    try {
      await apiFetch(`/admin/libraries/${selected.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, ownerActive, reason: reason ?? "" }),
      });
      setMessage(`${selected.name} ${status.toLowerCase()} updated.`);
      await loadLibraries(selected.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update tenant status.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveTenant() {
    if (!selected || archiveConfirm !== selected.name) return;
    setSaving(true);
    try {
      await apiFetch(`/admin/libraries/${selected.id}/archive`, { method: "POST" });
      setMessage(`${selected.name} archived.`);
      setArchiveConfirm("");
      await loadLibraries(selected.id);
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Unable to archive tenant.");
    } finally {
      setSaving(false);
    }
  }

  function renderRows(items: Array<Record<string, unknown>>, columns: Array<[string, string]>) {
    if (items.length === 0) return <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">No data found.</p>;
    return (
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-400">
            <tr>{columns.map(([key, label]) => <th key={key} className="px-3 py-3">{label}</th>)}</tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={String(item.id ?? item.assignment_id ?? index)} className="border-t border-slate-100">
                {columns.map(([key]) => <td key={key} className="px-3 py-3 font-semibold text-slate-700">{text(item[key])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active libraries" value={activeCount} note="Tenants allowed to operate." />
        <StatCard label="Blocked / archived" value={blockedCount} note="Suspended, inactive, or owner blocked." />
        <StatCard label="Active students" value={studentsCount} note="Live assigned student count." />
        <StatCard label="Unpaid dues" value={`Rs. ${unpaidTotal.toFixed(0)}`} note="Pending and due student payments." />
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <DashboardCard title="Tenant control center" subtitle="Search, filter, and select any library.">
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search library, city, owner, plan"
                className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none"
              />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none">
                <option value="ALL">All</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="INACTIVE">Archived</option>
              </select>
            </div>

            <div className="grid max-h-[36rem] gap-2 overflow-auto pr-1">
              {filteredRows.map((library) => (
                <button
                  key={library.id}
                  type="button"
                  onClick={() => void selectLibrary(library)}
                  className={`rounded-xl border p-3 text-left transition ${selectedId === library.id ? "border-[var(--lp-primary)] bg-[#fff7f1]" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-slate-950">{library.name}</p>
                      <p className="mt-1 truncate text-sm text-slate-500">{[library.city, library.owner_name].filter(Boolean).join(" | ")}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">{library.active_students} students | {library.plan_name ?? "No plan"} | Rs. {Number(library.unpaid_amount || 0).toFixed(0)} dues</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusTone(library.status)}`}>{library.status}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={selected ? selected.name : "Tenant 360"} subtitle="Overview, users, students, money, website, activity, and danger controls.">
          {selected && overview && form ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setFormOpen(true)} className="rounded-lg bg-[var(--lp-primary)] px-3 py-2 text-sm font-black text-white">Edit tenant</button>
                <button type="button" onClick={() => void updateStatus("SUSPENDED", false, "Suspended by superadmin")} disabled={saving} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-black text-white disabled:opacity-50">Suspend tenant</button>
                <button type="button" onClick={() => void updateStatus("ACTIVE", true, "Reactivated by superadmin")} disabled={saving} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700 disabled:opacity-50">Reactivate tenant</button>
                <button type="button" onClick={() => void updateStatus(selected.status, false, "Owner login blocked by superadmin")} disabled={saving} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 disabled:opacity-50">Block owner login</button>
                <button type="button" onClick={() => void updateStatus(selected.status, true, "Owner login restored by superadmin")} disabled={saving} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 disabled:opacity-50">Reset owner access</button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {tabs.map((item) => (
                  <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-3 py-1.5 text-sm font-black ${tab === item ? "bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "border border-slate-200 text-slate-600"}`}>
                    {item}
                  </button>
                ))}
              </div>

              {tab === "Overview" ? (
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    ["Owner", overview.overview.owner_name],
                    ["Owner login", overview.overview.owner_active ? "Active" : "Blocked"],
                    ["Plan", overview.overview.plan_name ?? "No plan"],
                    ["Subscription", overview.overview.subscription_status ?? "-"],
                    ["Renewal", overview.overview.current_period_end ?? "-"],
                    ["Students", overview.overview.active_students],
                    ["Admins", overview.overview.admins],
                    ["Pending joins", overview.overview.pending_join_requests],
                    ["Today checkins", overview.overview.today_checkins],
                    ["Seats", `${Number(overview.seats.occupied || 0)}/${overview.seats.total || 0}`],
                    ["Dues", `Rs. ${Number(overview.overview.unpaid_amount || 0).toFixed(0)}`],
                    ["Status", overview.overview.status],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-slate-50 p-3">
                      <p className="lp-stat-label">{label}</p>
                      <p className="mt-1 font-black text-slate-950">{value}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {tab === "Users" ? renderRows(overview.users, [["full_name", "Name"], ["library_role", "Role"], ["email", "Email"], ["phone", "Phone"], ["is_active", "Active"], ["last_login_at", "Last login"]]) : null}
              {tab === "Students" ? renderRows(overview.students, [["full_name", "Student"], ["phone", "Phone"], ["date_of_birth", "DOB"], ["gender", "Gender"], ["seat_number", "Seat"], ["status", "Status"], ["payment_status", "Payment"], ["plan_name", "Plan"], ["ends_at", "Ends"]]) : null}
              {tab === "Payments" ? renderRows(overview.payments, [["student_name", "Student"], ["amount", "Amount"], ["status", "Status"], ["method", "Method"], ["due_date", "Due"], ["paid_at", "Paid"]]) : null}
              {tab === "Seats" ? (
                <div className="grid gap-3 sm:grid-cols-5">
                  {Object.entries(overview.seats).map(([key, value]) => <div key={key} className="rounded-lg bg-slate-50 p-3"><p className="lp-stat-label capitalize">{key}</p><p className="mt-1 text-xl font-black">{value}</p></div>)}
                </div>
              ) : null}
              {tab === "Website" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-3"><p className="lp-stat-label">Subdomain</p><p className="mt-1 font-black">{text(overview.website?.subdomain ?? selected.slug)}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="lp-stat-label">Website</p><p className="mt-1 font-black">{text(overview.website?.status)}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="lp-stat-label">Marketplace</p><p className="mt-1 font-black">{overview.website?.show_in_marketplace ? "Visible" : "Hidden"}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="lp-stat-label">Published at</p><p className="mt-1 font-black">{text(overview.website?.published_at)}</p></div>
                </div>
              ) : null}
              {tab === "Activity" ? renderRows(overview.activity, [["actor_name", "Actor"], ["action", "Action"], ["entity_type", "Entity"], ["created_at", "Time"]]) : null}
              {tab === "Danger" ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-lg font-black text-rose-800">Archive tenant</p>
                  <p className="mt-1 text-sm text-rose-700">Soft delete only: tenant becomes inactive, owner login is blocked, data remains available to superadmin.</p>
                  <input value={archiveConfirm} onChange={(event) => setArchiveConfirm(event.target.value)} placeholder={`Type ${selected.name} to confirm`} className="mt-4 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm outline-none" />
                  <button type="button" onClick={() => void archiveTenant()} disabled={archiveConfirm !== selected.name || saving} className="mt-3 rounded-lg bg-rose-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50">Archive tenant</button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a library to manage it.</p>
          )}
        </DashboardCard>
      </section>

      <FormDrawer open={formOpen} onClose={() => setFormOpen(false)} title="Edit tenant details" description="Superadmin can edit library identity, status, owner contact, and owner login access.">
        {selected && form ? (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold text-slate-700">Library name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none" /></label>
              <label className="grid gap-1 text-sm font-bold text-slate-700">Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as FormState["status"] })} className="rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none"><option value="ACTIVE">ACTIVE</option><option value="SUSPENDED">SUSPENDED</option><option value="INACTIVE">INACTIVE</option></select></label>
              <label className="grid gap-1 text-sm font-bold text-slate-700">City<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none" /></label>
              <label className="grid gap-1 text-sm font-bold text-slate-700">Area<input value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none" /></label>
              <label className="grid gap-1 text-sm font-bold text-slate-700 md:col-span-2">Address<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none" /></label>
              <label className="grid gap-1 text-sm font-bold text-slate-700">Owner name<input value={form.ownerFullName} onChange={(event) => setForm({ ...form, ownerFullName: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none" /></label>
              <label className="grid gap-1 text-sm font-bold text-slate-700">Owner email<input value={form.ownerEmail} onChange={(event) => setForm({ ...form, ownerEmail: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none" /></label>
              <label className="grid gap-1 text-sm font-bold text-slate-700">Owner phone<input value={form.ownerPhone} onChange={(event) => setForm({ ...form, ownerPhone: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none" /></label>
              <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={form.ownerActive} onChange={(event) => setForm({ ...form, ownerActive: event.target.checked })} />Owner login active</label>
            </div>
            <button type="button" onClick={() => void saveLibrary()} disabled={saving} className="rounded-xl bg-[var(--lp-primary)] px-4 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? "Saving tenant details..." : "Save tenant details"}</button>
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}
