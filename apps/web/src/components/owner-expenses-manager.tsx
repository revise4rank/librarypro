"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import {
  enqueueOwnerExpenseAction,
  flushQueuedOwnerExpenseActions,
  listQueuedOwnerExpenseActions,
} from "../lib/offline-queue";
import { Surface } from "./shell";

type ExpensesResponse = {
  success: boolean;
  data: {
    summary: {
      monthlyExpenses: number;
      monthlyRevenue: number;
      monthlyProfit: number;
    };
    rows: Array<{
      id: string;
      category: string;
      title: string;
      amount: string;
      spent_on: string;
      notes: string | null;
      created_at: string;
    }>;
  };
};

export function OwnerExpensesManager() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<ExpensesResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [queuedExpenses, setQueuedExpenses] = useState(0);
  const [form, setForm] = useState({
    category: "",
    title: "",
    amount: "",
    spentOn: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  async function loadExpenses(activeMonth: string) {
    try {
      const response = await apiFetch<ExpensesResponse>(`/owner/expenses?month=${encodeURIComponent(activeMonth)}`);
      setData(response.data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load expenses.");
    }
  }

  async function loadQueuedExpenses() {
    try {
      const queued = await listQueuedOwnerExpenseActions();
      setQueuedExpenses(queued.length);
    } catch {
      setQueuedExpenses(0);
    }
  }

  useEffect(() => {
    void loadExpenses(month);
    setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);
    void loadQueuedExpenses();
  }, [month]);

  useEffect(() => {
    const online = async () => {
      setIsOffline(false);
      try {
        const synced = await flushQueuedOwnerExpenseActions();
        if (synced > 0) {
          setMessage(`${synced} offline expense action(s) synced successfully.`);
          await loadExpenses(month);
        }
      } catch (syncError) {
        setError(syncError instanceof Error ? syncError.message : "Unable to sync offline expenses.");
      } finally {
        await loadQueuedExpenses();
      }
    };

    const offline = async () => {
      setIsOffline(true);
      await loadQueuedExpenses();
    };

    window.addEventListener("online", online);
    window.addEventListener("offline", offline);

    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [month]);

  async function submitExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueOwnerExpenseAction({
          category: form.category,
          title: form.title,
          amount: Number(form.amount),
          spentOn: form.spentOn,
          notes: form.notes || undefined,
        });
        await loadQueuedExpenses();
        setIsOffline(true);
        setMessage("Offline mode: expense queued and will sync automatically when internet returns.");
        setError(null);
        setForm({
          category: "",
          title: "",
          amount: "",
          spentOn: new Date().toISOString().slice(0, 10),
          notes: "",
        });
        return;
      }

      await apiFetch("/owner/expenses", {
        method: "POST",
        body: JSON.stringify({
          category: form.category,
          title: form.title,
          amount: Number(form.amount),
          spentOn: form.spentOn,
          notes: form.notes,
        }),
      });
      setMessage("Expense saved successfully.");
      setForm({
        category: "",
        title: "",
        amount: "",
        spentOn: new Date().toISOString().slice(0, 10),
        notes: "",
      });
      await loadExpenses(month);
      setError(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save expense.");
    }
  }

  return (
    <div className="grid gap-6">
      <div className={`rounded-[1.4rem] px-4 py-4 text-sm font-semibold ${isOffline ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
        {isOffline ? `Offline mode active. Queued expense actions: ${queuedExpenses}` : `Online and ready. Queued expense actions: ${queuedExpenses}`}
      </div>
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.75rem] bg-white p-5 ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Monthly revenue</p>
          <p className="mt-3 text-3xl font-black text-slate-950">Rs. {data ? data.summary.monthlyRevenue.toLocaleString() : 0}</p>
        </article>
        <article className="rounded-[1.75rem] bg-white p-5 ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Monthly expenses</p>
          <p className="mt-3 text-3xl font-black text-slate-950">Rs. {data ? data.summary.monthlyExpenses.toLocaleString() : 0}</p>
        </article>
        <article className="rounded-[1.75rem] bg-white p-5 ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Monthly profit</p>
          <p className="mt-3 text-3xl font-black text-slate-950">Rs. {data ? data.summary.monthlyProfit.toLocaleString() : 0}</p>
        </article>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Surface title="Add expense" subtitle="Track staff, rent, electricity, internet, and other library costs">
          <form className="grid gap-4" onSubmit={submitExpense}>
            <input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="Category" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Expense title" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            <div className="grid gap-4 md:grid-cols-2">
              <input value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Amount" type="number" min="0" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
              <input value={form.spentOn} onChange={(event) => setForm((current) => ({ ...current, spentOn: event.target.value }))} type="date" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            </div>
            <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes" className="min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" />
            <button className="rounded-2xl bg-[var(--lp-primary)] px-5 py-4 text-sm font-bold text-white">Save expense</button>
          </form>
        </Surface>

        <Surface title="Expense ledger" subtitle="Live monthly list with revenue-profit view">
          <div className="mb-4 flex items-center gap-3">
            <input value={month} onChange={(event) => setMonth(event.target.value)} type="month" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data?.rows.map((expense) => (
              <article key={expense.id} className="rounded-[1.75rem] bg-white p-5 ring-1 ring-slate-200">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">{expense.category}</p>
                <p className="mt-3 text-xl font-black text-slate-950">{expense.title}</p>
                <p className="mt-3 text-3xl font-black text-slate-950">Rs. {Number(expense.amount).toLocaleString()}</p>
                <p className="mt-2 text-sm text-slate-500">{expense.spent_on}</p>
                {expense.notes ? <p className="mt-3 text-sm text-slate-600">{expense.notes}</p> : null}
              </article>
            ))}
            {data && data.rows.length === 0 ? <p className="text-sm text-slate-500">No expenses found for selected month.</p> : null}
          </div>
        </Surface>
      </div>
    </div>
  );
}
