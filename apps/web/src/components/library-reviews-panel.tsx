"use client";

import { useState } from "react";
import { apiFetch } from "../lib/api";
import type { PublicLibraryReview } from "../lib/public-library";

export function LibraryReviewsPanel({ reviews }: { reviews: PublicLibraryReview[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [reasonPreset, setReasonPreset] = useState("Suspicious or abusive review content");

  async function reportReview(reviewId: string) {
    try {
      await apiFetch(`/public/reviews/${reviewId}/report`, {
        method: "POST",
        body: JSON.stringify({
          reason: reasonPreset,
        }),
      });
      setMessage("Review reported for moderation.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to report review.");
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {message ? <div className="md:col-span-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">{message}</div> : null}
      <div className="md:col-span-2 flex flex-wrap gap-2">
        {["Suspicious or abusive review content", "Looks fake or promotional", "Personal attack or harassment"].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setReasonPreset(preset)}
            className={`rounded-full px-3 py-2 text-xs font-bold ${reasonPreset === preset ? "bg-rose-100 text-rose-700" : "border border-[var(--lp-border)] bg-white text-[var(--lp-muted)]"}`}
          >
            {preset}
          </button>
        ))}
      </div>
      {reviews.slice(0, 6).map((review) => (
        <div key={review.id} className="rounded-[1.5rem] border border-[var(--lp-border)] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-[var(--lp-text)]">{review.student_name}</p>
            <p className="text-sm font-black text-[var(--lp-accent)]">{review.rating}/5</p>
          </div>
          <p className="mt-3 text-sm leading-7 text-[var(--lp-muted)]">{review.review_text}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {new Date(review.created_at).toLocaleDateString()}
            </p>
            <button type="button" onClick={() => void reportReview(review.id)} className="rounded-full border border-rose-200 px-3 py-1 text-xs font-bold text-rose-600">
              Report abuse
            </button>
          </div>
        </div>
      ))}
      {reviews.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-[var(--lp-border)] bg-white p-5 text-sm text-[var(--lp-muted)]">
          No student reviews yet. Joined students can add the first review from their app.
        </div>
      ) : null}
    </div>
  );
}
