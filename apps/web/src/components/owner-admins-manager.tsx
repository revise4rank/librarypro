"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

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
  const [message, setMessage] = useState<string | null>(null);
  const permissionCatalog = ["students", "payments", "reports", "checkins", "notifications", "seat_control", "admissions"];

  async function load() {
    const [adminsResponse, logsResponse] = await Promise.all([
      apiFetch<AdminsResponse>("/owner/admins"),
      apiFetch<AuditLogsResponse>("/owner/audit-logs"),
    ]);
    setAdmins(adminsResponse.data);
    setLogs(logsResponse.data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createAdmin() {
    const result = await apiFetch<{ success: boolean; data: { temporaryPassword: string } }>("/owner/admins", {
      method: "POST",
      body: JSON.stringify({ fullName, email, phone }),
    });
    setMessage(`Admin created. Temporary password: ${result.data.temporaryPassword}`);
    setFullName("");
    setEmail("");
    setPhone("");
    await load();
  }

  async function removeAdmin(adminUserId: string) {
    await apiFetch(`/owner/admins/${adminUserId}`, { method: "DELETE" });
    await load();
  }

  async function togglePermission(adminUserId: string, permissions: string[], permission: string) {
    const next = permissions.includes(permission)
      ? permissions.filter((item) => item !== permission)
      : [...permissions, permission];
    await apiFetch(`/owner/admins/${adminUserId}/permissions`, {
      method: "PATCH",
      body: JSON.stringify({ permissions: next.length ? next : ["reports"] }),
    });
    await load();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <DashboardCard title="Multi-admin control" subtitle="Head admin creates and removes workspace admins.">
        <div className="grid gap-4">
          {message ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div> : null}
          <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Admin full name" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3" />
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3" />
          <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3" />
          <button
            type="button"
            disabled={!admins?.isHeadAdmin || !fullName.trim()}
            onClick={() => void createAdmin()}
            className="rounded-2xl bg-[var(--lp-primary)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            Create admin
          </button>
          {!admins?.isHeadAdmin ? (
            <p className="text-sm text-[var(--lp-muted)]">Only the head admin can create or remove admins. All admins can still view shared actions.</p>
          ) : null}
        </div>
      </DashboardCard>

      <DashboardCard title="Admin roster and shared actions" subtitle="Every admin can see who did what inside the library workspace.">
        <div className="grid gap-6">
          <div className="grid gap-3">
            {(admins?.admins ?? []).map((admin) => (
              <div key={admin.user_id} className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-4">
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

          <div className="grid gap-3">
            {logs.slice(0, 12).map((log) => (
              <div key={log.id} className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-4 text-sm">
                <p className="font-bold text-[var(--lp-text)]">{log.actor_name ?? "System"} · {log.action}</p>
                <p className="mt-1 text-[var(--lp-muted)]">{new Date(log.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
