"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import {
  enqueueStudentPaymentAction,
  flushQueuedStudentPaymentActions,
  listQueuedStudentPaymentActions,
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

type StudentPaymentsResponse = {
  success: boolean;
  data: {
    summary: {
      seatNumber: string | null;
      planName: string | null;
      validityEnd: string | null;
      paymentStatus: string | null;
      totalDue: number;
    };
    payments: PaymentRow[];
  };
};

export function StudentPaymentsManager() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState<StudentPaymentsResponse["data"]["summary"]>({
    seatNumber: null,
    planName: null,
    validityEnd: null,
    paymentStatus: null,
    totalDue: 0,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveStatus, setLiveStatus] = useState("Connecting");
  const [isOffline, setIsOffline] = useState(false);
  const [queuedPayments, setQueuedPayments] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  async function loadQueuedPayments() {
    try {
      const queued = await listQueuedStudentPaymentActions();
      setQueuedPayments(queued.length);
    } catch {
      setQueuedPayments(0);
    }
  }

  async function loadPayments() {
    setLoading(true);
    try {
      const response = await apiFetch<StudentPaymentsResponse>("/student/payments");
      setRows(response.data.payments);
      setSummary(response.data.summary);
      setError(null);
    } catch (loadError) {
      setRows([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load student payments.");
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
    const refresh = () => {
      setLiveStatus("Live");
      void loadPayments();
    };

    socket.on("connect", ready);
    socket.on("disconnect", disconnected);
    socket.on("realtime.ready", ready);
    socket.on("payment.updated", refresh);

    if (socket.connected) {
      setLiveStatus("Live");
    }

    return () => {
      socket.off("connect", ready);
      socket.off("disconnect", disconnected);
      socket.off("realtime.ready", ready);
      socket.off("payment.updated", refresh);
    };
  }, []);

  useEffect(() => {
    const online = async () => {
      setIsOffline(false);
      try {
        const synced = await flushQueuedStudentPaymentActions();
        if (synced > 0) {
          setMessage(`${synced} offline payment action(s) synced successfully.`);
          await loadPayments();
        }
      } catch (syncError) {
        setError(syncError instanceof Error ? syncError.message : "Unable to sync offline payments.");
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

  async function payNow(paymentId: string) {
    setMessage(null);
    setError(null);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueStudentPaymentAction(paymentId, `OFFLINE-WEB-${Date.now()}`);
        await loadQueuedPayments();
        setIsOffline(true);
        setMessage("Offline mode: payment action queued and will sync automatically when internet returns.");
        return;
      }

      await apiFetch(`/student/payments/${paymentId}/pay`, {
        method: "POST",
        body: JSON.stringify({
          method: "ONLINE",
          referenceNo: `WEB-${Date.now()}`,
        }),
      });
      setMessage("Payment marked paid and receipt is ready.");
      await loadPayments();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Payment action failed.");
    }
  }

  async function downloadReceipt(paymentId: string) {
    setMessage(null);
    setError(null);
    try {
      const response = await apiFetch<{ success: boolean; data: { receiptNo: string } }>(`/student/payments/${paymentId}/receipt`);
      setMessage(`Receipt ready: ${response.data.receiptNo}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Receipt fetch failed.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <DashboardCard title="Current billing status" subtitle={`Real student payment summary | Socket ${liveStatus}`}>
        <div className="grid gap-4">
          <div className={`rounded-[1.4rem] px-4 py-4 text-sm font-semibold ${isOffline ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
            {isOffline ? `Offline mode active. Queued payment actions: ${queuedPayments}` : `Online and ready. Queued payment actions: ${queuedPayments}`}
          </div>
          <div className="rounded-[1.5rem] bg-amber-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">Status</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{summary.paymentStatus ?? "UNKNOWN"}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Seat</p>
              <p className="mt-3 text-xl font-black text-slate-950">{summary.seatNumber ?? "-"}</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Current due</p>
              <p className="mt-3 text-xl font-black text-slate-950">Rs. {summary.totalDue}</p>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Plan validity</p>
            <p className="mt-3 text-xl font-black text-slate-950">{summary.validityEnd ?? "-"}</p>
            <p className="mt-2 text-sm text-slate-500">{summary.planName ?? "No active plan"}</p>
          </div>
          {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}
          {loading ? <p className="text-sm text-slate-500">Loading payments...</p> : null}
        </div>
      </DashboardCard>

      <DashboardCard title="Receipts and dues" subtitle="Payment actions students actually need">
        <div className="grid gap-4">
          <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 text-sm text-slate-600">
            {rows.filter((payment) => payment.status !== "PAID").length} payment item(s) still need action. Old receipts can stay tucked away.
          </div>
          <button
            type="button"
            onClick={() => setShowHistory((current) => !current)}
            className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700"
          >
            {showHistory ? "Hide receipt history" : `Show receipt history (${rows.length})`}
          </button>
          {showHistory ? (
            <div className="space-y-3">
              {rows.map((payment) => (
                <div key={payment.id} className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">{payment.student_name}</p>
                      <p className="text-sm text-slate-500">{payment.method} | {(payment.paid_at ?? payment.due_date ?? payment.created_at).slice(0, 10)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-950">Rs. {payment.amount}</p>
                      <p className={`text-xs font-black ${payment.status === "PAID" ? "text-emerald-700" : "text-amber-700"}`}>{payment.status}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {payment.status !== "PAID" ? (
                      <button onClick={() => void payNow(payment.id)} className="rounded-[1.1rem] border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] px-4 py-3 text-sm font-bold text-[var(--lp-accent-strong)]">
                        Pay now
                      </button>
                    ) : null}
                    <button onClick={() => void downloadReceipt(payment.id)} className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                      Get receipt
                    </button>
                  </div>
                </div>
              ))}
              {!loading && rows.length === 0 ? <p className="text-sm text-slate-500">No student payments found yet.</p> : null}
            </div>
          ) : null}
        </div>
      </DashboardCard>
    </div>
  );
}
