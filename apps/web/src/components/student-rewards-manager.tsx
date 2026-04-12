"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type AnalyticsResponse = {
  success: boolean;
  data: {
    badges: Array<{
      badgeCode: string;
      badgeLabel: string;
      awardedAt: string;
      metadata?: {
        tier?: string;
        icon?: string;
        family?: string;
      };
    }>;
    longestStreak: number;
    totalStudyHours: number;
    attendanceDays: number;
    deepWorkHours: number;
  };
};

function getTheme(code: string, metadata?: { tier?: string; icon?: string; family?: string }) {
  const tier = metadata?.tier ?? (code.includes("14") || code.includes("50") ? "GOLD" : code.includes("7") ? "SILVER" : "BRONZE");
  const icon = metadata?.icon ?? (tier === "GOLD" ? "Crown" : tier === "SILVER" ? "Spark" : "Bolt");
  if (tier === "GOLD") {
    return { tier, icon, card: "border-amber-200 bg-amber-50", text: "text-amber-700" };
  }
  if (tier === "SILVER") {
    return { tier, icon, card: "border-slate-300 bg-slate-50", text: "text-slate-700" };
  }
  return { tier, icon, card: "border-emerald-200 bg-emerald-50", text: "text-emerald-700" };
}

export function StudentRewardsManager() {
  const [data, setData] = useState<AnalyticsResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    apiFetch<AnalyticsResponse>("/student/analytics")
      .then((response) => {
        setData(response.data);
        setError(null);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load rewards timeline.");
      });
  }, []);

  if (!data) {
    return <p className="text-sm text-slate-500">{error ?? "Loading rewards timeline..."}</p>;
  }

  return (
    <div className="grid gap-6">
      {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Badges earned</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{data.badges.length}</p>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Longest streak</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{data.longestStreak} days</p>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Total study</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{data.totalStudyHours} hrs</p>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Attendance days</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{data.attendanceDays}</p>
        </div>
      </section>

      <DashboardCard title="Badge timeline" subtitle="A visible reward history helps students stay attached to the app">
        <div className="grid gap-4">
          <button
            type="button"
            onClick={() => setShowTimeline((current) => !current)}
            className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700"
          >
            {showTimeline ? "Hide badge timeline" : `Show badge timeline (${data.badges.length})`}
          </button>
          {showTimeline ? (
            <>
              {data.badges.map((badge, index) => {
                const theme = getTheme(badge.badgeCode, badge.metadata);
                return (
                  <div key={badge.badgeCode} className={`rounded-[1.5rem] border p-5 ${theme.card}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Milestone {String(index + 1).padStart(2, "0")}</p>
                        <p className="mt-2 text-2xl font-black text-slate-950">{badge.badgeLabel}</p>
                        <p className={`mt-2 text-xs font-black uppercase tracking-[0.22em] ${theme.text}`}>{theme.icon} | {theme.tier}</p>
                      </div>
                      <div className="rounded-full bg-white/80 px-4 py-2 text-xs font-black text-slate-700">
                        {badge.awardedAt.slice(0, 10)}
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-600">
                      {badge.metadata?.family ?? "CONSISTENCY"} milestone unlocked. Keep stacking streaks, attendance, and deep work blocks.
                    </p>
                  </div>
                );
              })}
              {data.badges.length === 0 ? <p className="text-sm text-slate-500">No badges yet. Start with a short streak and one focused week.</p> : null}
            </>
          ) : (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-600">{data.badges.length > 0 ? `${data.badges.length} badges unlocked so far.` : "No badges yet. Start with a short streak and one focused week."}</p>
            </div>
          )}
        </div>
      </DashboardCard>
    </div>
  );
}
