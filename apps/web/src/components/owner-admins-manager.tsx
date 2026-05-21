"use client";

import { useEffect, useState } from "react";
import { apiFetch, displayApiError } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";
import { FormDrawer } from "./form-drawer";
import { isPlanAccessMessage, PlanAccessNotice } from "./plan-access-notice";

type AdminsResponse = {
  success: boolean;
  data: {
    isHeadAdmin: boolean;
    admins: Array<{
      user_id: string;
      full_name: string;
      email: string | null;
      phone: string | null;
      is_head_admin: boolean;
      permissions?: string[];
      created_at: string;
    }>;
  };
};

type AuditLogsResponse = {
  success: boolean;
  data: Array<{
    id: string;
    actor_name: string | null;
    action: string;
    entity_type: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
};

export function OwnerAdminsManager() {
  const [admins, setAdmins] = useState<AdminsResponse["data"] | null>(null);
  const [logs, setLogs] = useState<AuditLogsResponse["data"]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [logDate, setLogDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const permissionCatalog = ["students", "payments", "reports", "checkins", "notifications", "seat_control", "admissions"];

  async function load() {
    try {
      const [adminsResponse, logsResponse] = await Promise.all([
        apiFetch<AdminsResponse>("/owner/admins"),
        apiFetch<AuditLogsResponse>("/owner/audit-logs?limit=200"),
      ]);
      setAdmins(adminsResponse.data);
      setLogs(logsResponse.data);
      setError(null);
    } catch (loadError) {
      setError(displayApiError(loadError, "Unable to load admin controls."));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createAdmin() {
    try {
      const result = await apiFetch<{ success: boolean; data: { temporaryPassword: string } }>("/owner/admins", {
        method: "POST",
        body: JSON.stringify({ fullName, email, phone }),
      });
      setMessage(`Admin created. Temporary password: ${result.data.temporaryPassword}`);
      setError(null);
      setFullName("");
      setEmail("");
      setPhone("");
      setCreateDrawerOpen(false);
      await load();
    } catch (createError) {
      setError(displayApiError(createError, "Unable to create admin."));
    }
  }

  async function removeAdmin(adminUserId: string) {
    try {
      await apiFetch(`/owner/admins/${adminUserId}`, { method: "DELETE" });
      await load();
    } catch (removeError) {
      setError(displayApiError(removeError, "Unable to remove admin."));
    }
  }

  async function togglePermission(adminUserId: string, permissions: string[], permission: string) {
    const next = permissions.includes(permission) ? permissions.filter((item) => item !== permission) : [...permissions, permission];
    try {
      await apiFetch(`/owner/admins/${adminUserId}/permissions`, {
        method: "PATCH",
        body: JSON.stringify({ permissions: next.length ? next : ["reports"] }),
      });
      await load();
    } catch (permissionError) {
      setError(displayApiError(permissionError, "Unable to update permissions."));
    }
  }

  const filteredLogs = logs.filter((log) => {
    const search = logSearch.trim().toLowerCase();
    const matchesSearch = !search || `${log.actor_name ?? "System"} ${log.action}`.toLowerCase().includes(search);
    const matchesDate = !logDate || log.created_at.slice(0, 10) === logDate;
    return matchesSearch && matchesDate;
  });

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      {error ? (
        <div className="xl:col-span-2">
          {isPlanAccessMessage(error) ? <PlanAccessNotice message={error} /> : <p className="text-sm font-semibold text-rose-600">{error}</p>}
        </div>
      ) : null}

      <div className="self-start">
        <DashboardCard title="Multi-admin control" subtitle="Head admin creates and removes workspace admins.">
        <div className="grid gap-3">
          {message ? <div className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">{message}</div> : null}
          <div className="rounded-xl border border-[var(--lp-border)] bg-white p-3">
            <p className="text-sm font-black text-[var(--lp-text)]">{admins?.admins.length ?? 0} workspace admins</p>
            <p className="mt-1 text-sm leading-5 text-[var(--lp-muted)]">Create admins in a focused drawer. Permission toggles stay with each roster row.</p>
          </div>
          <button
            type="button"
            disabled={!admins?.isHeadAdmin}
            onClick={() => setCreateDrawerOpen(true)}
            className="rounded-xl bg-[var(--lp-primary)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            Add workspace admin
          </button>
          {!admins?.isHeadAdmin ? (
            <p className="text-sm text-[var(--lp-muted)]">Only the head admin can create or remove admins. All admins can still view shared actions.</p>
          ) : null}
        </div>
        </DashboardCard>
      </div>

      <FormDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        title="Add workspace admin"
        description="Create a login for a team member, then tune permissions from the roster."
      >
        <div className="grid gap-4">
          <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Admin full name" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3" />
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3" />
          <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3" />
          <button
            type="button"
            disabled={!admins?.isHeadAdmin || !fullName.trim()}
            onClick={() => void createAdmin()}
            className="rounded-2xl bg-[var(--lp-primary)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            Create admin login
          </button>
        </div>
      </FormDrawer>

      <DashboardCard title="Admin roster and shared actions" subtitle="Latest actions stay inside this tile. Use filters for older entries.">
        <div className="grid gap-4">
          <div className="grid gap-3">
            {(admins?.admins ?? []).map((admin) => (
              <div key={admin.user_id} className="rounded-xl border border-[var(--lp-border)] bg-white px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-[var(--lp-text)]">{admin.full_name}</p>
                    <p className="text-sm text-[var(--lp-muted)]">{admin.email ?? admin.phone ?? "No contact saved"}</p>
                  </div>
                  {admin.is_head_admin ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">Head admin</span>
                  ) : admins?.isHeadAdmin ? (
                    <button type="button" onClick={() => void removeAdmin(admin.user_id)} className="rounded-full border border-rose-200 px-3 py-1 text-xs font-black text-rose-600">
                      Remove
                    </button>
                  ) : null}
                </div>
                {!admin.is_head_admin ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {permissionCatalog.map((permission) => {
                      const enabled = (admin.permissions ?? []).includes(permission);
                      return (
                        <button
                          key={permission}
                          type="button"
                          disabled={!admins?.isHeadAdmin}
                          onClick={() => void togglePermission(admin.user_id, admin.permissions ?? [], permission)}
                          className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                            enabled ? "bg-emerald-100 text-emerald-700" : "border border-[var(--lp-border)] text-[var(--lp-muted)]"
                          } disabled:opacity-60`}
                        >
                          {permission}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[var(--lp-border)] bg-slate-50 p-3">
            <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
              <input
                value={logSearch}
                onChange={(event) => setLogSearch(event.target.value)}
                placeholder="Search by admin name or action"
                className="rounded-xl border border-[var(--lp-border)] bg-white px-4 py-2.5 text-sm outline-none"
              />
              <input
                type="date"
                value={logDate}
                onChange={(event) => setLogDate(event.target.value)}
                className="rounded-xl border border-[var(--lp-border)] bg-white px-4 py-2.5 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setLogSearch("");
                  setLogDate("");
                }}
                className="rounded-xl border border-[var(--lp-border)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--lp-text)]"
              >
                Clear
              </button>
            </div>
            <div className="mt-3 max-h-[360px] overflow-y-auto pr-1">
              <div className="grid gap-2">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-[var(--lp-border)] bg-white px-4 py-3 text-sm">
                    <p className="font-bold text-[var(--lp-text)]">
                      {log.actor_name ?? "System"} - {log.action}
                    </p>
                    <p className="mt-1 text-[var(--lp-muted)]">{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                ))}
                {filteredLogs.length === 0 ? <p className="px-2 py-6 text-center text-sm font-semibold text-[var(--lp-muted)]">No actions match this filter.</p> : null}
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
