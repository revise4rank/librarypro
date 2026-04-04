"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

export function StudentJoinLibraryManager() {
  const [qrPayload, setQrPayload] = useState("");
  const [seatPreference, setSeatPreference] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState("5");
  const [selectedReviewLibraryId, setSelectedReviewLibraryId] = useState("");
  const [history, setHistory] = useState<Array<{
    id: string;
    library_name: string;
    status: string;
    created_at: string;
    reviewed_at?: string | null;
    review_reason?: string | null;
    linked_assignment_id?: string | null;
  }>>([]);
  const [libraries, setLibraries] = useState<Array<{
    library_id: string;
    library_name: string;
    city: string;
    seat_number: string | null;
    login_id: string;
    is_active: boolean;
    joined_at: string;
    left_at: string | null;
    status: "ACTIVE" | "LEFT";
  }>>([]);
  const [rejoinLibraryId, setRejoinLibraryId] = useState("");
  const [rejoinOptions, setRejoinOptions] = useState<{
    libraryName: string | null;
    suggestedPlanPrice: string | null;
    availableSeats: Array<{ seat_number: string; label: string | null }>;
  } | null>(null);
  const [reserveMessage, setReserveMessage] = useState<string | null>(null);

  async function loadHistory() {
    const response = await apiFetch<{ success: boolean; data: Array<{
      id: string;
      library_name: string;
      status: string;
      created_at: string;
      reviewed_at?: string | null;
      review_reason?: string | null;
      linked_assignment_id?: string | null;
    }> }>("/student/join-requests");
    setHistory(response.data);
  }

  async function loadLibraries() {
    const response = await apiFetch<{ success: boolean; data: Array<{
      library_id: string;
      library_name: string;
      city: string;
      seat_number: string | null;
      login_id: string;
      is_active: boolean;
      joined_at: string;
      left_at: string | null;
      status: "ACTIVE" | "LEFT";
    }> }>("/student/libraries");
    setLibraries(response.data);
    setSelectedReviewLibraryId((current) => current || response.data[0]?.library_id || "");
  }

  useEffect(() => {
    void loadHistory();
    void loadLibraries();
  }, []);

  async function submit() {
    const response = await apiFetch<{ success: boolean; data: { libraryName: string } }>("/student/join-requests/scan", {
      method: "POST",
      body: JSON.stringify({ qrPayload, seatPreference, message }),
    });
    setStatus(`Join request sent to ${response.data.libraryName}. Owner can now collect payment and allot your seat.`);
    setQrPayload("");
    setSeatPreference("");
    setMessage("");
    await loadHistory();
  }

  async function rejoinLibrary(libraryId: string) {
    await apiFetch(`/student/libraries/${libraryId}/rejoin`, {
      method: "POST",
      body: JSON.stringify({
        seatPreference,
        message: message || "Rejoin request from existing student account",
      }),
    });
    setStatus("Rejoin request sent to library desk.");
    await loadHistory();
  }

  async function loadRejoinOptions(libraryId: string) {
    const response = await apiFetch<{ success: boolean; data: {
      libraryName: string | null;
      suggestedPlanPrice: string | null;
      availableSeats: Array<{ seat_number: string; label: string | null }>;
    } }>(`/student/libraries/${libraryId}/rejoin-options`);
    setRejoinLibraryId(libraryId);
    setRejoinOptions(response.data);
  }

  async function submitReview() {
    await apiFetch(`/student/libraries/${selectedReviewLibraryId}/reviews`, {
      method: "POST",
      body: JSON.stringify({
        rating: Number(reviewRating),
        reviewText,
      }),
    });
    setStatus("Your library review has been published to the marketplace.");
    setReviewText("");
    setReviewRating("5");
  }

  async function reserveSuggestedSeat(libraryId: string, seatNumber: string) {
    const response = await apiFetch<{ success: boolean; data: { reserved_until: string } }>(
      `/student/libraries/${libraryId}/rejoin-seats/${encodeURIComponent(seatNumber)}/reserve`,
      { method: "POST" },
    );
    setSeatPreference(seatNumber);
    setReserveMessage(`Seat ${seatNumber} reserved till ${new Date(response.data.reserved_until).toLocaleTimeString()}.`);
    await loadRejoinOptions(libraryId);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <DashboardCard title="Join a new library" subtitle="Student can keep using productivity tools even without an active library.">
        <div className="grid gap-4">
          {status ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{status}</div> : null}
          <textarea value={qrPayload} onChange={(event) => setQrPayload(event.target.value)} placeholder="Paste scanned library QR payload" className="min-h-32 rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3" />
          <input value={seatPreference} onChange={(event) => setSeatPreference(event.target.value)} placeholder="Preferred seat or section" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3" />
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message for library owner" className="min-h-24 rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3" />
          <button type="button" onClick={() => void submit()} disabled={!qrPayload.trim()} className="rounded-2xl bg-[var(--lp-primary)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
            Send join request
          </button>
        </div>
      </DashboardCard>

      <DashboardCard title="Library timeline and reviews" subtitle="Track active or past libraries, rejoin quickly, and review only the libraries you actually joined.">
        <div className="grid gap-4">
          <div className="grid gap-4 text-sm leading-7 text-[var(--lp-muted)]">
          <p>Student khud apna app account bana sakta hai, bina library ke bhi pomodoro, focus, syllabus, revision, rewards, offers sab use kar sakta hai.</p>
          <p>Nayi library join karne ke liye bas library QR scan karo. Request owner/admin desk ko chali jayegi.</p>
          <p>Owner payment collect karke seat allot karega, phir wahi library QR se attendance check-in/check-out chalega.</p>
          <p>Agar library chhodni ho, to student exit kar sakta hai aur same app se next library join request bhej sakta hai.</p>
          <Link href="/student/offers" className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3 text-center font-bold text-[var(--lp-primary)]">
            Explore coaching and library offers
          </Link>
          </div>
          <div className="grid gap-3">
            {libraries.map((library) => (
              <div key={library.library_id} className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[var(--lp-text)]">{library.library_name}</p>
                    <p className="text-[var(--lp-muted)]">{library.city} · Joined {new Date(library.joined_at).toLocaleDateString()}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--lp-accent)]">
                      {library.status} {library.seat_number ? `· Seat ${library.seat_number}` : ""}
                    </p>
                  </div>
                  {library.status === "LEFT" ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void loadRejoinOptions(library.library_id)}
                        className="rounded-full border border-[var(--lp-border)] bg-[#f4faf5] px-3 py-2 text-xs font-bold text-[var(--lp-primary)]"
                      >
                        Seat suggestions
                      </button>
                      <button
                        type="button"
                        onClick={() => void rejoinLibrary(library.library_id)}
                        className="rounded-full border border-[var(--lp-border)] bg-[#f4faf5] px-3 py-2 text-xs font-bold text-[var(--lp-primary)]"
                      >
                        Rejoin
                      </button>
                    </div>
                  ) : null}
                </div>
                {library.left_at ? <p className="mt-2 text-[var(--lp-muted)]">Exited on {new Date(library.left_at).toLocaleDateString()}</p> : null}
                {rejoinLibraryId === library.library_id && rejoinOptions ? (
                  <div className="mt-3 rounded-2xl bg-[#f9f5ee] p-4 text-sm">
                    <p className="font-bold text-[var(--lp-text)]">Rejoin suggestions</p>
                    <p className="mt-1 text-[var(--lp-muted)]">
                      Suggested monthly plan: Rs. {rejoinOptions.suggestedPlanPrice ?? "N/A"}
                    </p>
                    {reserveMessage ? <p className="mt-2 font-semibold text-emerald-700">{reserveMessage}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {rejoinOptions.availableSeats.map((seat) => (
                        <div key={seat.seat_number} className="flex items-center gap-2 rounded-full border border-[var(--lp-border)] bg-white px-3 py-2 text-xs font-bold text-[var(--lp-primary)]">
                          <button type="button" onClick={() => setSeatPreference(seat.seat_number)}>
                            {seat.seat_number}{seat.label ? ` · ${seat.label}` : ""}
                          </button>
                          <button
                            type="button"
                            onClick={() => void reserveSuggestedSeat(library.library_id, seat.seat_number)}
                            className="rounded-full bg-[var(--lp-primary)] px-2 py-1 text-[10px] text-white"
                          >
                            Reserve 30m
                          </button>
                        </div>
                      ))}
                      {rejoinOptions.availableSeats.length === 0 ? <span className="text-[var(--lp-muted)]">No seats visible right now.</span> : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
            {libraries.length === 0 ? <p className="text-sm text-[var(--lp-muted)]">No library history yet.</p> : null}
          </div>

          <div className="grid gap-3 rounded-2xl border border-[var(--lp-border)] bg-white p-4">
            <div>
              <p className="text-sm font-bold text-[var(--lp-text)]">Review a joined library</p>
              <p className="mt-1 text-sm text-[var(--lp-muted)]">
                Review marketplace par tabhi show hoga jab student ne library actually join ki ho.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <select
                value={selectedReviewLibraryId}
                onChange={(event) => setSelectedReviewLibraryId(event.target.value)}
                className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3"
              >
                {libraries.map((library) => (
                  <option key={library.library_id} value={library.library_id}>
                    {library.library_name}
                  </option>
                ))}
              </select>
              <select
                value={reviewRating}
                onChange={(event) => setReviewRating(event.target.value)}
                className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3"
              >
                {[5, 4, 3, 2, 1].map((item) => (
                  <option key={item} value={String(item)}>
                    {item}/5
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={reviewText}
              onChange={(event) => setReviewText(event.target.value)}
              placeholder="Write an honest review about seats, discipline, environment, and management"
              className="min-h-24 rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3"
            />
            <button
              type="button"
              onClick={() => void submitReview()}
              disabled={!selectedReviewLibraryId || reviewText.trim().length < 8}
              className="rounded-2xl bg-[var(--lp-primary)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              Publish review
            </button>
          </div>

          <div className="grid gap-3">
            {history.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[var(--lp-text)]">{item.library_name}</p>
                    <p className="text-[var(--lp-muted)]">{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{item.status}</span>
                </div>
                {item.review_reason ? <p className="mt-2 text-[var(--lp-muted)]">Reason: {item.review_reason}</p> : null}
                {item.linked_assignment_id ? <p className="mt-2 font-semibold text-emerald-700">Seat admission activated</p> : null}
              </div>
            ))}
            {history.length === 0 ? <p className="text-sm text-[var(--lp-muted)]">No join requests yet.</p> : null}
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
