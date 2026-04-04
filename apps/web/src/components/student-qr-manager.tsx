"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { enqueueQrAction, flushQueuedQrActions, listQueuedQrActions } from "../lib/offline-queue";
import { DashboardCard } from "./dashboard-shell";

type EntryQrResponse = {
  success: boolean;
  data: {
    assignmentId: string;
    seatId: string | null;
    seatNumber: string | null;
    validFrom: string;
    validUntil: string;
    qrKeyId: string;
    qrPayload: string;
  };
};

type CheckinActionResponse = {
  success: boolean;
  data: {
    id: string;
    checkedInAt?: string;
    checkedOutAt?: string;
    assignmentId: string;
    seatId: string | null;
    qrKeyId: string;
    mode: string;
  };
};

export function StudentQrManager() {
  const [data, setData] = useState<EntryQrResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"checkin" | "checkout" | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);

  async function loadQueueCount() {
    try {
      const queued = await listQueuedQrActions();
      setQueuedCount(queued.length);
    } catch {
      setQueuedCount(0);
    }
  }

  async function loadQr() {
    setLoading(true);
    try {
      const response = await apiFetch<EntryQrResponse>("/student/entry-qr");
      setData(response.data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load QR pass.");
    } finally {
      setLoading(false);
    }
  }

  async function runAction(action: "checkin" | "checkout") {
    if (!data) return;
    setSubmitting(action);
    setMessage(null);

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueQrAction({
          action,
          qrPayload: data.qrPayload,
          createdAt: new Date().toISOString(),
        });
        await loadQueueCount();
        setIsOffline(true);
        setMessage(
          action === "checkin"
            ? "Offline mode: check-in queued and will sync automatically when internet returns."
            : "Offline mode: check-out queued and will sync automatically when internet returns.",
        );
        setError(null);
        return;
      }

      const response = await apiFetch<CheckinActionResponse>(
        action === "checkin" ? "/checkins/scan" : "/checkins/checkout",
        {
          method: "POST",
          body: JSON.stringify({
            qrPayload: data.qrPayload,
            scannedAtDevice: new Date().toISOString(),
          }),
        },
      );

      setMessage(
        action === "checkin"
          ? `Check-in done at ${new Date(response.data.checkedInAt ?? new Date().toISOString()).toLocaleString()}`
          : `Check-out done at ${new Date(response.data.checkedOutAt ?? new Date().toISOString()).toLocaleString()}`,
      );
      setError(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to process QR action.");
    } finally {
      setSubmitting(null);
    }
  }

  useEffect(() => {
    void loadQr();
    setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);
    void loadQueueCount();
  }, []);

  useEffect(() => {
    const online = async () => {
      setIsOffline(false);
      try {
        const synced = await flushQueuedQrActions();
        if (synced > 0) {
          setMessage(`${synced} offline QR action(s) synced successfully.`);
          await loadQr();
        }
      } catch (syncError) {
        setError(syncError instanceof Error ? syncError.message : "Unable to sync offline QR actions.");
      } finally {
        await loadQueueCount();
      }
    };

    const offline = async () => {
      setIsOffline(true);
      await loadQueueCount();
    };

    window.addEventListener("online", online);
    window.addEventListener("offline", offline);

    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [data?.qrPayload]);

  if (loading && !data) {
    return <p className="text-sm text-slate-500">{error ?? "Loading QR pass..."}</p>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.84fr_1.16fr]">
      <DashboardCard title="Active QR pass" subtitle="Show this at entry or exit gate">
        <div className="flex flex-col items-center gap-5">
          <div className="grid h-72 w-72 place-items-center rounded-[2rem] bg-slate-950 px-6 text-center text-sm font-black tracking-[0.12em] text-white">
            LIVE ENTRY PASS
            <br />
            {data?.seatNumber ?? "NO SEAT"}
          </div>
          <p className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black tracking-[0.12em] text-slate-600">
            {data?.qrPayload.slice(0, 36)}...
          </p>
          <div className="grid w-full gap-3 md:grid-cols-2">
            <button
              type="button"
              disabled={!data || submitting !== null}
              onClick={() => void runAction("checkin")}
              className="rounded-[1.25rem] bg-[var(--lp-primary)] px-4 py-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {submitting === "checkin" ? "Checking in..." : "Check in now"}
            </button>
            <button
              type="button"
              disabled={!data || submitting !== null}
              onClick={() => void runAction("checkout")}
              className="rounded-[1.25rem] border border-[var(--lp-border)] bg-white px-4 py-4 text-sm font-bold text-[var(--lp-text)] disabled:opacity-60"
            >
              {submitting === "checkout" ? "Checking out..." : "Check out now"}
            </button>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard title="QR status and validity" subtitle="Live entry controls from your library subdomain">
        <div className="grid gap-4">
          <div className={`rounded-[1.4rem] px-4 py-4 text-sm font-semibold ${isOffline ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
            {isOffline ? `Offline mode active. Queued QR actions: ${queuedCount}` : `Online and ready. Queued QR actions: ${queuedCount}`}
          </div>
          {message ? <div className="rounded-[1.4rem] bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700">{message}</div> : null}
          {error ? <div className="rounded-[1.4rem] bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-600">{error}</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Seat</p>
              <p className="mt-3 text-2xl font-black text-slate-950">{data?.seatNumber ?? "-"}</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">QR key</p>
              <p className="mt-3 text-sm font-black text-slate-950">{data?.qrKeyId ?? "-"}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Valid from</p>
              <p className="mt-3 text-sm font-semibold text-slate-800">
                {data?.validFrom ? new Date(data.validFrom).toLocaleString() : "-"}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Valid until</p>
              <p className="mt-3 text-sm font-semibold text-slate-800">
                {data?.validUntil ? new Date(data.validUntil).toLocaleString() : "-"}
              </p>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700">
            Owner ke library subdomain se hi student login, QR entry, payment status, notice board, aur study progress chalega. Yeh pass active assignment ke against live generate ho raha hai, static mock code nahi.
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700">
            Offline-first mode me QR button press karne par action IndexedDB me queue hota hai. Internet aate hi app auto-sync karke real attendance register update kar deta hai.
          </div>
          <button
            type="button"
            onClick={() => void loadQr()}
            className="rounded-[1.25rem] border border-[var(--lp-border)] bg-white px-4 py-4 text-sm font-bold text-[var(--lp-text)]"
          >
            Refresh QR pass
          </button>
        </div>
      </DashboardCard>
    </div>
  );
}
