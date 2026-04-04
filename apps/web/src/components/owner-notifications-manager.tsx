"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import {
  enqueueOwnerNotificationAction,
  flushQueuedOwnerNotificationActions,
  listQueuedOwnerNotificationActions,
} from "../lib/offline-queue";
import { getRealtimeSocket } from "../lib/realtime";
import { DashboardCard } from "./dashboard-shell";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  recipient_name: string | null;
};

type ListResponse = { success: boolean; data: NotificationRow[] };

export function OwnerNotificationsManager() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveStatus, setLiveStatus] = useState("Connecting");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    type: "GENERAL",
    audience: "ALL_STUDENTS",
    message: "",
  });
  const [toast, setToast] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [queuedNotifications, setQueuedNotifications] = useState(0);

  function showToast(nextMessage: string) {
    setToast(nextMessage);
    window.setTimeout(() => setToast(null), 2400);
  }

  async function loadQueuedNotifications() {
    try {
      const queued = await listQueuedOwnerNotificationActions();
      setQueuedNotifications(queued.length);
    } catch {
      setQueuedNotifications(0);
    }
  }

  async function loadNotifications() {
    setLoading(true);
    try {
      const response = await apiFetch<ListResponse>("/owner/notifications");
      setRows(response.data);
      setError(null);
    } catch (loadError) {
      setRows([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
    setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);
    void loadQueuedNotifications();
  }, []);

  useEffect(() => {
    const socket = getRealtimeSocket();
    if (!socket) {
      setLiveStatus("Offline");
      return;
    }

    const ready = () => setLiveStatus("Live");
    const disconnected = () => setLiveStatus("Disconnected");
    const onNotification = () => {
      setLiveStatus("Live");
      showToast("New broadcast activity synced.");
      void loadNotifications();
    };

    socket.on("connect", ready);
    socket.on("disconnect", disconnected);
    socket.on("realtime.ready", ready);
    socket.on("notification.created", onNotification);

    if (socket.connected) {
      setLiveStatus("Live");
    }

    return () => {
      socket.off("connect", ready);
      socket.off("disconnect", disconnected);
      socket.off("realtime.ready", ready);
      socket.off("notification.created", onNotification);
    };
  }, []);

  useEffect(() => {
    const online = async () => {
      setIsOffline(false);
      try {
        const synced = await flushQueuedOwnerNotificationActions();
        if (synced > 0) {
          setMessage(`${synced} offline notification action(s) synced successfully.`);
          await loadNotifications();
        }
      } catch (syncError) {
        setError(syncError instanceof Error ? syncError.message : "Unable to sync offline notifications.");
      } finally {
        await loadQueuedNotifications();
      }
    };

    const offline = async () => {
      setIsOffline(true);
      await loadQueuedNotifications();
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
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueOwnerNotificationAction(form);
        await loadQueuedNotifications();
        setIsOffline(true);
        setMessage("Offline mode: notification queued and will sync automatically when internet returns.");
        setForm({
          title: "",
          type: "GENERAL",
          audience: "ALL_STUDENTS",
          message: "",
        });
        return;
      }

      const response = await apiFetch<{ success: boolean; data: { recipientCount: number } }>("/owner/notifications", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage(`Notification sent to ${response.data.recipientCount} recipients.`);
      showToast("Notification pushed live.");
      setForm({
        title: "",
        type: "GENERAL",
        audience: "ALL_STUDENTS",
        message: "",
      });
      await loadNotifications();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to send notification.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.84fr_1.16fr]">
      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-2xl">
          {toast}
        </div>
      ) : null}
      <DashboardCard title="Compose broadcast" subtitle={`Owner to student communication workflow | Socket ${liveStatus}`}>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className={`rounded-[1.4rem] px-4 py-4 text-sm font-semibold ${isOffline ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
            {isOffline ? `Offline mode active. Queued notification actions: ${queuedNotifications}` : `Online and ready. Queued notification actions: ${queuedNotifications}`}
          </div>
          <input value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Notification title" />
          <div className="grid gap-4 md:grid-cols-2">
            <select value={form.type} onChange={(e) => setForm((c) => ({ ...c, type: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none">
              <option value="PAYMENT_REMINDER">Payment reminder</option>
              <option value="EXPIRY_ALERT">Expiry alert</option>
              <option value="GENERAL">General message</option>
            </select>
            <select value={form.audience} onChange={(e) => setForm((c) => ({ ...c, audience: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none">
              <option value="ALL_STUDENTS">All students</option>
              <option value="DUE_STUDENTS">Only unpaid students</option>
              <option value="EXPIRING_STUDENTS">Expiring in 3 days</option>
            </select>
          </div>
          <textarea value={form.message} onChange={(e) => setForm((c) => ({ ...c, message: e.target.value }))} className="min-h-36 rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Write message" />
          {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-bold text-white">Send notification</button>
            <button type="button" className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700">Save template</button>
          </div>
        </form>
      </DashboardCard>

      <DashboardCard title="Recent campaigns" subtitle="Latest sent reminders and notices">
        {loading ? <p className="text-sm text-slate-500">Loading campaigns...</p> : null}
        {!loading ? (
          <div className="space-y-4">
            {rows.map((notification) => (
              <article key={notification.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{notification.title}</p>
                    <p className="text-sm text-slate-500">{notification.recipient_name ?? "Student audience"}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">{notification.type}</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-700">{notification.message}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{notification.created_at}</p>
              </article>
            ))}
            {rows.length === 0 ? <p className="text-sm text-slate-500">No notification campaigns found yet.</p> : null}
          </div>
        ) : null}
      </DashboardCard>
    </div>
  );
}
