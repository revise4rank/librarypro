"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type ReviewReport = {
  id: string;
  review_id: string;
  reporter_name: string;
  library_name: string;
  student_name: string;
  rating: number;
  review_text: string;
  reason: string;
  status: string;
  created_at: string;
};

export function SuperadminReviewsManager() {
  const [rows, setRows] = useState<ReviewReport[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [reasonPreset, setReasonPreset] = useState("Hidden by moderation review");

  async function load() {
    const response = await apiFetch<{ success: boolean; data: ReviewReport[] }>("/admin/review-reports");
    setRows(response.data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function moderate(reviewId: string, action: "HIDE" | "RESTORE") {
    await apiFetch(`/admin/reviews/${reviewId}/moderate`, {
      method: "PATCH",
      body: JSON.stringify({
        action,
        reason: action === "HIDE" ? reasonPreset : "",
      }),
    });
    setMessage(action === "HIDE" ? "Review hidden successfully." : "Review restored successfully.");
    await load();
  }

  return (
    <DashboardCard title="Review moderation" subtitle="Reported library reviews, abuse reports, and moderation actions.">
      <div className="grid gap-4">
        {message ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div> : null}
        <div className="flex flex-wrap gap-2">
          {["Hidden by moderation review", "Harassment or abuse", "Promotional spam / fake claim"].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setReasonPreset(preset)}
              className={`rounded-full px-3 py-2 text-xs font-bold ${reasonPreset === preset ? "bg-slate-950 text-white" : "border border-[var(--lp-border)] bg-white text-[var(--lp-muted)]"}`}
            >
              {preset}
            </button>
          ))}
        </div>
        {rows.map((row) => (
          <div key={row.id} className="rounded-[1.6rem] border border-[var(--lp-border)] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-bold text-[var(--lp-text)]">{row.library_name}</p>
                <p className="text-sm text-[var(--lp-muted)]">
                  Review by {row.student_name} · Reported by {row.reporter_name}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{row.status}</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-[var(--lp-accent)]">{row.rating}/5</p>
            <p className="mt-2 text-sm leading-7 text-[var(--lp-text)]">{row.review_text}</p>
            <div className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Report reason: {row.reason}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => void moderate(row.review_id, "HIDE")} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">
                Hide review
              </button>
              <button type="button" onClick={() => void moderate(row.review_id, "RESTORE")} className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-bold text-[var(--lp-primary)]">
                Restore
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 ? <p className="text-sm text-[var(--lp-muted)]">No review reports right now.</p> : null}
      </div>
    </DashboardCard>
  );
}
