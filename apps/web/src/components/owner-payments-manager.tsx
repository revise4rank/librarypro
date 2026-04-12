"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import {
  enqueueOwnerPaymentAction,
  flushQueuedOwnerPaymentActions,
  listQueuedOwnerPaymentActions,
} from "../lib/offline-queue";
import { getRealtimeSocket } from "../lib/realtime";
import { DashboardCard } from "./dashboard-shell";

type PaymentRow = {
  id: string;
  student_name: string;
  amount: string;
  method: string;
  status: string;
  reference_no: string | null;
  paid_at: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
};

type ListResponse = { success: boolean; data: PaymentRow[] };

export function OwnerPaymentsManager() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState("Connecting");
  const [isOffline, setIsOffline] = useState(false);
  const [queuedPayments, setQueuedPayments] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [form, setForm] = useState({
    studentName: "",
    amount: "",
    method: "Cash",
    status: "PAID",
    dueDate: "",
    paidAt: "",
    referenceNo: "",
    notes: "",
  });

  function showToast(nextMessage: string) {
    setToast(nextMessage);
    window.setTimeout(() => setToast(null), 2400);
  }

  async function loadQueuedPayments() {
    try {
      const queued = await listQueuedOwnerPaymentActions();
      setQueuedPayments(queued.length);
    } catch {
      setQueuedPayments(0);
    }
  }

  async function loadPayments() {
    setLoading(true);
    try {
      const response = await apiFetch<ListResponse>("/owner/payments");
      setRows(response.data);
      setError(null);
    } catch (loadError) {
      setRows([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load payments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPayments();
    setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);
    void loadQueuedPayments();
  }, []);

  useEffect(() => {
    const socket = getRealtimeSocket();
    if (!socket) {
      setLiveStatus("Offline");
      return;
    }

    const ready = () => setLiveStatus("Live");
    const disconnected = () => setLiveStatus("Disconnected");
    const onPaymentUpdate = () => {
      setLiveStatus("Live");
      showToast("Payment ledger updated live.");
      void loadPayments();
    };

    socket.on("connect", ready);
    socket.on("disconnect", disconnected);
    socket.on("realtime.ready", ready);
    socket.on("payment.updated", onPaymentUpdate);

    if (socket.connected) {
      setLiveStatus("Live");
    }

    return () => {
      socket.off("connect", ready);
      socket.off("disconnect", disconnected);
      socket.off("realtime.ready", ready);
      socket.off("payment.updated", onPaymentUpdate);
    };
  }, []);

  useEffect(() => {
    const online = async () => {
      setIsOffline(false);
      try {
        const synced = await flushQueuedOwnerPaymentActions();
        if (synced > 0) {
          setMessage(`${synced} offline payment action(s) synced successfully.`);
          await loadPayments();
        }
      } catch (syncError) {
        setError(syncError instanceof Error ? syncError.message : "Unable to sync offline owner payments.");
      } finally {
        await loadQueuedPayments();
      }
    };

    const offline = async () => {
      setIsOffline(true);
      await loadQueuedPayments();
    };

    window.addEventListener("online", online);
    window.addEventListener("offline", offline);

    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    try {
      if (!editingId && typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueOwnerPaymentAction({
          studentName: form.studentName,
          amount: Number(form.amount || "0"),
          method: form.method,
          status: form.status,
          dueDate: form.dueDate || undefined,
          paidAt: form.paidAt || undefined,
          referenceNo: form.referenceNo || undefined,
          notes: form.notes || undefined,
        });
        await loadQueuedPayments();
        setIsOffline(true);
        setMessage("Offline mode: payment queued and will sync automatically when internet returns.");
        setForm({
          studentName: "",
          amount: "",
          method: "Cash",
          status: "PAID",
          dueDate: "",
          paidAt: "",
          referenceNo: "",
          notes: "",
        });
        return;
      }

      await apiFetch(editingId ? `/owner/payments/${editingId}` : "/owner/payments", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount || "0"),
        }),
      });
      setMessage(editingId ? "Payment updated successfully." : "Payment saved successfully.");
      showToast(editingId ? "Payment updated." : "Payment saved.");
      setEditingId(null);
      setForm({
        studentName: "",
        amount: "",
        method: "Cash",
        status: "PAID",
        dueDate: "",
        paidAt: "",
        referenceNo: "",
        notes: "",
      });
      await loadPayments();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save payment.");
    }
  }

  function loadIntoForm(payment: PaymentRow) {
    setEditingId(payment.id);
    setComposerOpen(true);
    setSelectedPaymentId(payment.id);
    setForm({
      studentName: payment.student_name,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      dueDate: payment.due_date?.slice(0, 10) ?? "",
      paidAt: payment.paid_at?.slice(0, 10) ?? "",
      referenceNo: payment.reference_no ?? "",
      notes: payment.notes ?? "",
    });
    setMessage(null);
    setError(null);
  }

  const summary = rows.reduce(
    (acc, row) => {
      acc.total += Number(row.amount || "0");
      if (row.status === "PAID") acc.paid += Number(row.amount || "0");
      if (row.status === "DUE") acc.due += Number(row.amount || "0");
      if (row.status === "PENDING") acc.pending += 1;
      return acc;
    },
    { total: 0, paid: 0, due: 0, pending: 0 },
  );
  const selectedPayment = rows.find((row) => row.id === selectedPaymentId) ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-2xl">
          {toast}
        </div>
      ) : null}
      <DashboardCard title="Collections desk" subtitle={`Socket ${liveStatus} | keep entry form hidden until needed`}>
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div className={`rounded-[1.2rem] px-4 py-4 text-sm font-semibold ${isOffline ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
              {isOffline ? `Offline mode active. Queued actions: ${queuedPayments}` : `Online and ready. Queued actions: ${queuedPayments}`}
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4 text-center">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Paid</p>
                <p className="mt-2 text-lg font-black text-emerald-700">Rs. {summary.paid.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Due</p>
                <p className="mt-2 text-lg font-black text-amber-700">Rs. {summary.due.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Pending</p>
                <p className="mt-2 text-lg font-black text-slate-950">{summary.pending}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-black text-slate-950">{editingId ? "Edit payment" : "New payment entry"}</p>
              <p className="mt-1 text-sm text-slate-500">Form hidden rakho jab tak actual entry nahi karni.</p>
            </div>
            <button
              type="button"
              onClick={() => setComposerOpen((current) => !current)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-700"
            >
              {composerOpen ? "Hide form" : editingId ? "Open edit form" : "New payment"}
            </button>
          </div>
          {composerOpen ? (
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className={`rounded-[1.4rem] px-4 py-4 text-sm font-semibold ${isOffline ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
            {isOffline ? `Offline mode active. Queued owner payment actions: ${queuedPayments}` : `Online and ready. Queued owner payment actions: ${queuedPayments}`}
          </div>
          <input value={form.studentName} onChange={(e) => setForm((c) => ({ ...c, studentName: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Student name" />
          <div className="grid gap-4 md:grid-cols-2">
            <input value={form.amount} onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Amount" />
            <select value={form.method} onChange={(e) => setForm((c) => ({ ...c, method: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none">
              <option>Cash</option>
              <option>UPI</option>
              <option>Bank Transfer</option>
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input value={form.referenceNo} onChange={(e) => setForm((c) => ({ ...c, referenceNo: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Reference number" />
            <select value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none">
              <option value="PAID">Paid</option>
              <option value="DUE">Due</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input type="date" value={form.paidAt} onChange={(e) => setForm((c) => ({ ...c, paidAt: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" />
            <input type="date" value={form.dueDate} onChange={(e) => setForm((c) => ({ ...c, dueDate: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" />
          </div>
          <textarea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Notes" />
          {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-bold text-white">{editingId ? "Update payment" : "Save payment"}</button>
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setComposerOpen(false);
                setForm({
                  studentName: "",
                  amount: "",
                  method: "Cash",
                  status: "PAID",
                  dueDate: "",
                  paidAt: "",
                  referenceNo: "",
                  notes: "",
                });
              }}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700"
            >
              Reset form
            </button>
          </div>
        </form>
          ) : (
            <div className="rounded-[1rem] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
              Entry form hidden hai. New collection ya payment update ke time isko open karo.
            </div>
          )}
        </div>
      </DashboardCard>

      <div className="grid gap-6">
        {selectedPayment ? (
          <DashboardCard title="Selected payment" subtitle="Quick detail before edit or follow-up">
            <div className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <div>
                  <p className="text-lg font-black text-slate-950">{selectedPayment.student_name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedPayment.method} | {(selectedPayment.paid_at ?? selectedPayment.due_date ?? selectedPayment.created_at).slice(0, 10)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentId(null)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-700"
                >
                  Clear
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Amount</p>
                  <p className="mt-2 text-lg font-black text-slate-950">Rs. {Number(selectedPayment.amount).toLocaleString("en-IN")}</p>
                </div>
                <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Status</p>
                  <p className={`mt-2 text-lg font-black ${selectedPayment.status === "PAID" ? "text-emerald-700" : "text-amber-700"}`}>
                    {selectedPayment.status}
                  </p>
                </div>
                <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Reference</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{selectedPayment.reference_no ?? "-"}</p>
                </div>
                <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Due date</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{selectedPayment.due_date?.slice(0, 10) ?? "-"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => loadIntoForm(selectedPayment)}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
                >
                  Edit selected payment
                </button>
              </div>
            </div>
          </DashboardCard>
        ) : null}

        <DashboardCard title="Payment ledger" subtitle="Recent collection activity">
          {loading ? <p className="text-sm text-slate-500">Loading payments...</p> : null}
          {!loading ? (
            <div className="space-y-3">
              {rows.map((payment) => (
                <button
                  key={payment.id}
                  type="button"
                  onClick={() => setSelectedPaymentId(payment.id)}
                  className={`flex w-full flex-col gap-3 rounded-[1.25rem] border px-4 py-4 text-left transition sm:flex-row sm:items-center sm:justify-between ${
                    selectedPaymentId === payment.id
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div>
                    <p className={`font-bold ${selectedPaymentId === payment.id ? "text-white" : "text-slate-950"}`}>{payment.student_name}</p>
                    <p className={`text-sm ${selectedPaymentId === payment.id ? "text-slate-300" : "text-slate-500"}`}>
                      {payment.method} | {(payment.paid_at ?? payment.due_date ?? payment.created_at).slice(0, 10)}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                        selectedPaymentId === payment.id ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      Select
                    </span>
                  </div>
                  <div className="sm:text-right">
                    <p className={`font-black ${selectedPaymentId === payment.id ? "text-white" : "text-slate-950"}`}>
                      Rs. {payment.amount}
                    </p>
                    <p
                      className={`text-xs font-black ${
                        selectedPaymentId === payment.id
                          ? "text-slate-200"
                          : payment.status === "PAID"
                            ? "text-emerald-700"
                            : "text-amber-700"
                      }`}
                    >
                      {payment.status}
                    </p>
                  </div>
                </button>
              ))}
              {rows.length === 0 ? <p className="text-sm text-slate-500">No payments found yet.</p> : null}
            </div>
          ) : null}
        </DashboardCard>
      </div>
    </div>
  );
}
