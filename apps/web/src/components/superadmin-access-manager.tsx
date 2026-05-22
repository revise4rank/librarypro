"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";
import { FormDrawer } from "./form-drawer";
import { StatCard } from "./stat-card";

type PlatformAdmin = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  role_code: "SUPER_ADMIN_FULL" | "SUPPORT" | "FINANCE" | "CONTENT" | "OPS";
  permissions: string[];
  created_at: string;
  last_login_at: string | null;
};

const roles = ["SUPER_ADMIN_FULL", "SUPPORT", "FINANCE", "CONTENT", "OPS"] as const;
const permissions = ["TENANTS", "USERS", "PAYMENTS", "PLANS", "CONTENT", "OPS", "SETTINGS", "ACCESS"];
const defaults: Record<string, string[]> = {
  SUPER_ADMIN_FULL: permissions,
  SUPPORT: ["TENANTS", "USERS", "OPS"],
  FINANCE: ["TENANTS", "PAYMENTS", "PLANS"],
  CONTENT: ["CONTENT", "TENANTS"],
  OPS: ["TENANTS", "USERS", "OPS"],
};

export function SuperadminAccessManager() {
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    roleCode: "SUPPORT" as PlatformAdmin["role_code"],
    permissions: defaults.SUPPORT,
    isActive: true,
  });

  async function load() {
    const response = await apiFetch<{ success: boolean; data: PlatformAdmin[] }>("/admin/platform-admins");
    setAdmins(response.data);
    setSelectedId((current) => current || response.data[0]?.id || "");
  }

  useEffect(() => {
    load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load platform admins."));
  }, []);

  const selected = useMemo(() => admins.find((admin) => admin.id === selectedId) ?? null, [admins, selectedId]);

  function openCreate() {
    setForm({ fullName: "", email: "", phone: "", roleCode: "SUPPORT", permissions: defaults.SUPPORT, isActive: true });
    setSelectedId("");
    setDrawerOpen(true);
  }

  function openEdit(admin: PlatformAdmin) {
    setSelectedId(admin.id);
    setForm({
      fullName: admin.full_name,
      email: admin.email ?? "",
      phone: admin.phone ?? "",
      roleCode: admin.role_code,
      permissions: admin.permissions,
      isActive: admin.is_active,
    });
    setDrawerOpen(true);
  }

  function setRole(roleCode: PlatformAdmin["role_code"]) {
    setForm((current) => ({ ...current, roleCode, permissions: defaults[roleCode] ?? [] }));
  }

  function togglePermission(permission: string) {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      if (selectedId) {
        await apiFetch(`/admin/platform-admins/${selectedId}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
        setMessage("Platform admin updated.");
      } else {
        const response = await apiFetch<{ success: boolean; data: { temporaryPassword: string } }>("/admin/platform-admins", {
          method: "POST",
          body: JSON.stringify(form),
        });
        setMessage(`Platform admin created. Temporary password: ${response.data.temporaryPassword}`);
      }
      setDrawerOpen(false);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save platform admin.");
    } finally {
      setSaving(false);
    }
  }

  async function quickActive(admin: PlatformAdmin, isActive: boolean) {
    setSaving(true);
    try {
      await apiFetch(`/admin/platform-admins/${admin.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
      setMessage(`${admin.full_name} ${isActive ? "enabled" : "disabled"}.`);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update access.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Platform admins" value={admins.length} note="Superadmin-level accounts." />
        <StatCard label="Active" value={admins.filter((admin) => admin.is_active).length} note="Can currently log in." />
        <StatCard label="Disabled" value={admins.filter((admin) => !admin.is_active).length} note="Login blocked." />
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <DashboardCard title="Platform admins" subtitle="Grant controlled access without sharing the main account.">
          <div className="grid gap-3">
            <button type="button" onClick={openCreate} className="rounded-xl bg-[var(--lp-primary)] px-4 py-3 text-sm font-black text-white">Create platform admin</button>
            <div className="grid max-h-[32rem] gap-2 overflow-auto pr-1">
              {admins.map((admin) => (
                <button key={admin.id} type="button" onClick={() => setSelectedId(admin.id)} className={`rounded-xl border p-3 text-left ${selectedId === admin.id ? "border-[var(--lp-primary)] bg-[#fff7f1]" : "border-slate-200 bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{admin.full_name}</p>
                      <p className="mt-1 text-sm text-slate-500">{admin.email ?? admin.phone ?? "No contact"}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">{admin.role_code}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${admin.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{admin.is_active ? "ACTIVE" : "BLOCKED"}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={selected?.full_name ?? "Access details"} subtitle="Role, granular permissions, last login, and login status.">
          {selected ? (
            <div className="grid gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xl font-black text-slate-950">{selected.full_name}</p>
                <p className="mt-1 text-sm text-slate-500">{selected.email ?? selected.phone ?? "No contact"} | {selected.role_code}</p>
                <p className="mt-1 text-sm text-slate-500">Last login: {selected.last_login_at ?? "-"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selected.permissions.map((permission) => <span key={permission} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{permission}</span>)}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => openEdit(selected)} className="rounded-lg bg-[var(--lp-primary)] px-3 py-2 text-sm font-black text-white">Edit access</button>
                <button type="button" onClick={() => void quickActive(selected, !selected.is_active)} disabled={saving} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 disabled:opacity-50">{selected.is_active ? "Disable login" : "Enable login"}</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select or create a platform admin.</p>
          )}
        </DashboardCard>
      </section>

      <FormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selectedId ? "Edit platform admin" : "Create platform admin"} description="Choose a role and fine-tune permissions.">
        <div className="grid gap-4">
          <input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Full name" className="rounded-lg border border-slate-200 px-3 py-2 outline-none" />
          <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" className="rounded-lg border border-slate-200 px-3 py-2 outline-none" />
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Phone" className="rounded-lg border border-slate-200 px-3 py-2 outline-none" />
          <div className="grid gap-2">
            <p className="text-sm font-black text-slate-700">Role</p>
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => <button key={role} type="button" onClick={() => setRole(role)} className={`rounded-full px-3 py-1.5 text-xs font-black ${form.roleCode === role ? "bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "border border-slate-200 text-slate-600"}`}>{role}</button>)}
            </div>
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-black text-slate-700">Permissions</p>
            <div className="flex flex-wrap gap-2">
              {permissions.map((permission) => <button key={permission} type="button" onClick={() => togglePermission(permission)} className={`rounded-full px-3 py-1.5 text-xs font-black ${form.permissions.includes(permission) ? "bg-emerald-100 text-emerald-700" : "border border-slate-200 text-slate-600"}`}>{permission}</button>)}
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />Login active</label>
          <button type="button" onClick={() => void save()} disabled={saving || !form.fullName.trim()} className="rounded-xl bg-[var(--lp-primary)] px-4 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? "Saving..." : "Save access"}</button>
        </div>
      </FormDrawer>
    </div>
  );
}
