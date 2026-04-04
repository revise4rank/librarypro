"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { getRealtimeSocket } from "../lib/realtime";
import { DashboardCard } from "./dashboard-shell";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
};

export function StudentNotificationsManager() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState("Connecting");

  useEffect(() => {
    async function loadNotifications() {
      try {
        const response = await apiFetch<{ success: boolean; data: NotificationRow[] }>("/student/notifications");
        setRows(response.data);
        setError(null);
      } catch (loadError) {
        setRows([]);
        setError(loadError instanceof Error ? loadError.message : "Unable to load notifications.");
      }
    }

    void loadNotifications();
  }, []);

  useEffect(() => {
    async function refresh() {
      try {
        const response = await apiFetch<{ success: boolean; data: NotificationRow[] }>("/student/notifications");
        setRows(response.data);
      } catch {}
    }

    const socket = getRealtimeSocket();
    if (!socket) {
      setLiveStatus("Offline");
      return;
    }

    const ready = () => setLiveStatus("Live");
    const disconnected = () => setLiveStatus("Disconnected");
    const onNotification = () => {
      setLiveStatus("Live");
      void refresh();
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

  return (
    <DashboardCard title="Latest alerts" subtitle={`Owner broadcasts and reminders sent to this student | Socket ${liveStatus}`}>
      {error ? <p className="mb-4 text-sm font-semibold text-amber-700">{error}</p> : null}
      <div className="space-y-3">
        {rows.map((notification) => (
          <article key={notification.id} className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-black text-slate-950">{notification.title}</p>
              <span className="rounded-full bg-slate-100 px-3 py-2 text-[11px] font-black text-slate-600">{notification.type}</span>
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-600">{notification.message}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{notification.created_at}</p>
          </article>
        ))}
        {rows.length === 0 ? <p className="text-sm text-slate-500">No notifications found for this student.</p> : null}
      </div>
    </DashboardCard>
  );
}
