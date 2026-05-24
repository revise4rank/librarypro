"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type PlanTemplate = {
  id: string;
  name: string;
  price: string;
  type: "MONTHLY" | "DAILY" | "SHIFT";
  duration_months: number | null;
  duration_days: number | null;
  shift_name: string | null;
  shift_start_hour: number | null;
  shift_end_hour: number | null;
  is_active: boolean;
};

function formatHour(h: number | null) {
  if (h === null) return "-";
  const ampm = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${ampm}`;
}

export function OwnerPlansManager() {
  const [plans, setPlans] = useState<PlanTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    price: "",
    type: "MONTHLY" as "MONTHLY" | "DAILY" | "SHIFT",
    durationMonths: "1",
    durationDays: "1",
    shiftName: "",
    shiftStartHour: "6",
    shiftEndHour: "12",
  });

  async function load() {
    try {
      const res = await apiFetch<{ success: boolean; data: PlanTemplate[] }>("/owner/plan-templates");
      setPlans(res.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load plans.");
    }
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    try {
      await apiFetch("/owner/plan-templates", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          price: Number(form.price),
          type: form.type,
          durationMonths: form.type === "MONTHLY" ? Number(form.durationMonths) : null,
          durationDays: form.type === "DAILY" ? Number(form.durationDays) : null,
          shiftName: form.type === "SHIFT" ? form.shiftName : null,
          shiftStartHour: form.type === "SHIFT" ? Number(form.shiftStartHour) : null,
          shiftEndHour: form.type === "SHIFT" ? Number(form.shiftEndHour) : null,
        }),
      });
      setMessage("Plan template created.");
      setShowForm(false);
      setForm({ name: "", price: "", type: "MONTHLY", durationMonths: "1", durationDays: "1", shiftName: "", shiftStartHour: "6", shiftEndHour: "12" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create plan.");
    }
  }

  async function deactivate(planId: string) {
    try {
      await apiFetch(`/owner/plan-templates/${planId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      });
      setMessage("Plan deactivated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate.");
    }
  }

  return (
    <div className="grid gap-3 md:gap-6">
      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <DashboardCard
        title="Plan templates"
        subtitle="Reusable plans for admissions and seat assignment. Monthly, daily, or shift-based."
      >
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-full bg-[var(--lp-primary)] px-5 py-2.5 text-sm font-bold text-white"
          >
            {showForm ? "Cancel" : "+ Add plan"}
          </button>
        </div>

        {showForm ? (
          <form onSubmit={submit} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Plan name
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Monthly, Morning Shift"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Price (Rs.)
                <input
                  required
                  type="number"
                  min="1"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="999"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Type
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof form.type }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="DAILY">Daily</option>
                  <option value="SHIFT">Shift (time slot)</option>
                </select>
              </label>
            </div>

            {form.type === "MONTHLY" ? (
              <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500 sm:w-48">
                Duration (months)
                <input
                  type="number"
                  min="1"
                  value={form.durationMonths}
                  onChange={(e) => setForm((f) => ({ ...f, durationMonths: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                />
              </label>
            ) : null}

            {form.type === "DAILY" ? (
              <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500 sm:w-48">
                Duration (days)
                <input
                  type="number"
                  min="1"
                  value={form.durationDays}
                  onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                />
              </label>
            ) : null}

            {form.type === "SHIFT" ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Shift name
                  <input
                    value={form.shiftName}
                    onChange={(e) => setForm((f) => ({ ...f, shiftName: e.target.value }))}
                    placeholder="e.g. Morning Shift"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Start hour (0–23)
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={form.shiftStartHour}
                    onChange={(e) => setForm((f) => ({ ...f, shiftStartHour: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  End hour (0–23)
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={form.shiftEndHour}
                    onChange={(e) => setForm((f) => ({ ...f, shiftEndHour: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                  />
                </label>
              </div>
            ) : null}

            <button type="submit" className="justify-self-start rounded-xl bg-[var(--lp-primary)] px-6 py-2.5 text-sm font-bold text-white">
              Save plan
            </button>
          </form>
        ) : null}

        {plans.length === 0 ? (
          <p className="text-sm text-slate-500">No plan templates yet. Add your first plan above.</p>
        ) : (
          <div className="grid gap-2">
            {plans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div>
                  <p className="font-black text-slate-950">{plan.name}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                      Rs. {Number(plan.price).toLocaleString()}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                      {plan.type}
                    </span>
                    {plan.type === "MONTHLY" && plan.duration_months ? (
                      <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-bold text-cyan-700">
                        {plan.duration_months} month{plan.duration_months > 1 ? "s" : ""}
                      </span>
                    ) : null}
                    {plan.type === "DAILY" && plan.duration_days ? (
                      <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-bold text-cyan-700">
                        {plan.duration_days} day{plan.duration_days > 1 ? "s" : ""}
                      </span>
                    ) : null}
                    {plan.type === "SHIFT" ? (
                      <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-700">
                        {plan.shift_name ?? "Shift"}: {formatHour(plan.shift_start_hour)} – {formatHour(plan.shift_end_hour)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void deactivate(plan.id)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600"
                >
                  Deactivate
                </button>
              </div>
            ))}
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
