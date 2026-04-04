"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type FeedResponse = {
  success: boolean;
  data: {
    items: Array<{
      id: string;
      studentUserId: string;
      libraryId: string | null;
      eventType: string;
      visibility: "PUBLIC" | "LIBRARY_MEMBERS" | "PRIVATE";
      actorName: string;
      title: string;
      body: string;
      metrics: Record<string, unknown>;
      metadata: Record<string, unknown>;
      createdAt: string;
      likeCount: number;
    }>;
    visibility: {
      defaultVisibility: "PUBLIC" | "LIBRARY_MEMBERS" | "PRIVATE";
      allowSubjectCompletionPosts: boolean;
      allowFocusPosts: boolean;
      allowStreakPosts: boolean;
    };
  };
};

export function StudentFeedManager() {
  const [feed, setFeed] = useState<FeedResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [postForm, setPostForm] = useState({
    eventType: "CUSTOM_PROGRESS",
    title: "",
    body: "",
    visibility: "LIBRARY_MEMBERS" as FeedResponse["data"]["visibility"]["defaultVisibility"],
  });

  async function loadFeed() {
    try {
      const response = await apiFetch<FeedResponse>("/student/feed");
      setFeed(response.data);
      setError(null);
      setPostForm((current) => ({
        ...current,
        visibility: response.data.visibility.defaultVisibility,
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load feed.");
    }
  }

  useEffect(() => {
    void loadFeed();
  }, []);

  async function createPost() {
    try {
      await apiFetch("/student/feed/posts", {
        method: "POST",
        body: JSON.stringify(postForm),
      });
      setPostForm((current) => ({ ...current, title: "", body: "" }));
      setMessage("Progress update shared.");
      await loadFeed();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to share progress.");
    }
  }

  async function saveVisibility(next: FeedResponse["data"]["visibility"]) {
    try {
      await apiFetch("/student/feed/visibility", {
        method: "PATCH",
        body: JSON.stringify(next),
      });
      setMessage("Feed privacy updated.");
      await loadFeed();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update privacy.");
    }
  }

  if (!feed) {
    return <p className="text-sm text-slate-500">{error ?? "Loading library feed..."}</p>;
  }

  return (
    <div className="grid gap-6">
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardCard title="Share progress" subtitle="Healthy accountability inside the library ecosystem">
          <div className="grid gap-4">
            <input
              value={postForm.title}
              onChange={(event) => setPostForm((current) => ({ ...current, title: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
              placeholder="Completed 5 thermodynamics questions today"
            />
            <textarea
              value={postForm.body}
              onChange={(event) => setPostForm((current) => ({ ...current, body: event.target.value }))}
              className="min-h-[140px] rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 outline-none"
              placeholder="Keep it short and motivating. Example: Finished revision block 2 and stayed consistent."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <select
                value={postForm.eventType}
                onChange={(event) => setPostForm((current) => ({ ...current, eventType: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
              >
                <option value="CUSTOM_PROGRESS">Custom progress</option>
                <option value="TOPIC_COMPLETED">Topic completed</option>
                <option value="FOCUS_MILESTONE">Focus milestone</option>
                <option value="STREAK_MILESTONE">Streak milestone</option>
              </select>
              <select
                value={postForm.visibility}
                onChange={(event) => setPostForm((current) => ({
                  ...current,
                  visibility: event.target.value as FeedResponse["data"]["visibility"]["defaultVisibility"],
                }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
              >
                <option value="PUBLIC">Public</option>
                <option value="LIBRARY_MEMBERS">Library members</option>
                <option value="PRIVATE">Private</option>
              </select>
            </div>
            <button type="button" onClick={() => void createPost()} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">
              Share update
            </button>
          </div>
        </DashboardCard>

        <DashboardCard title="Privacy control" subtitle="Students should control what gets shared automatically">
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-slate-600">
              Default visibility
              <select
                value={feed.visibility.defaultVisibility}
                onChange={(event) =>
                  void saveVisibility({
                    ...feed.visibility,
                    defaultVisibility: event.target.value as FeedResponse["data"]["visibility"]["defaultVisibility"],
                  })
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
              >
                <option value="PUBLIC">Public</option>
                <option value="LIBRARY_MEMBERS">Library members</option>
                <option value="PRIVATE">Private</option>
              </select>
            </label>
            {[
              ["allowSubjectCompletionPosts", "Share subject completion posts"],
              ["allowFocusPosts", "Share focus milestones"],
              ["allowStreakPosts", "Share streak updates"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4">
                <span className="text-sm font-semibold text-slate-700">{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(feed.visibility[key as keyof typeof feed.visibility])}
                  onChange={(event) =>
                    void saveVisibility({
                      ...feed.visibility,
                      [key]: event.target.checked,
                    })
                  }
                />
              </label>
            ))}
          </div>
        </DashboardCard>
      </section>

      <DashboardCard title="Library feed" subtitle="Minimal, motivational, and clean. No distraction patterns.">
        <div className="grid gap-4">
          {feed.items.map((item) => (
            <article key={item.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">{item.eventType.replaceAll("_", " ")}</p>
                  <h3 className="mt-2 text-xl font-black text-slate-950">{item.title}</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                  {item.visibility}
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
              <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                <span>{item.actorName}</span>
                <span>{item.createdAt.slice(0, 16).replace("T", " ")}</span>
              </div>
            </article>
          ))}
          {feed.items.length === 0 ? <p className="text-sm text-slate-500">No feed updates yet. Share your first progress win.</p> : null}
        </div>
      </DashboardCard>
    </div>
  );
}
