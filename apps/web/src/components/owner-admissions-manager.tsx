"use client";

import { useEffect, useState } from "react";
import { apiFetch, getApiBaseUrl } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type JoinRequestsResponse = {
  success: boolean;
  data: Array<{
    id: string;
    student_user_id: string;
    student_name: string;
    student_code: string | null;
    student_email: string | null;
    student_phone: string | null;
    seat_preference: string | null;
    message: string | null;
    requested_via: string;
    status: string;
    created_at: string;
  }>;
};

type OwnerSeatOption = {
  id: string;
  floor_name: string | null;
  section_name?: string | null;
  seat_number: string;
  status: string;
  assignment_id: string | null;
  reserved_until?: string | null;
};

type OwnerFloorOption = {
  id: string;
  name: string;
  floor_number: number;
};

type OwnerReceipt = {
  receiptNo: string;
  verificationId: string;
  issuedAt: string;
  studentName: string;
  amount: string;
  method: string;
  status: string;
  referenceNo: string | null;
  dueDate?: string | null;
  notes: string | null;
};

export function OwnerAdmissionsManager() {
  const [requests, setRequests] = useState<JoinRequestsResponse["data"]>([]);
  const [seats, setSeats] = useState<OwnerSeatOption[]>([]);
  const [floors, setFloors] = useState<OwnerFloorOption[]>([]);
  const [selectedFloorIds, setSelectedFloorIds] = useState<Record<string, string>>({});
  const [seatNumbers, setSeatNumbers] = useState<Record<string, string>>({});
  const [planPrices, setPlanPrices] = useState<Record<string, string>>({});
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<OwnerReceipt | null>(null);
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  async function load() {
    const [joinResponse, seatResponse, floorResponse] = await Promise.all([
      apiFetch<JoinRequestsResponse>("/owner/join-requests"),
      apiFetch<{ success: boolean; data: OwnerSeatOption[] }>("/owner/seats"),
      apiFetch<{ success: boolean; data: OwnerFloorOption[] }>("/owner/floors"),
    ]);
    setRequests(joinResponse.data);
    setSeats(seatResponse.data);
    setFloors(floorResponse.data);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!requests.length) {
      setActiveRequestId(null);
      return;
    }

    setActiveRequestId((current) => {
      if (current && requests.some((request) => request.id === current)) return current;
      return requests[0]?.id ?? null;
    });
  }, [requests]);

  function getAvailableSeats(requestId: string) {
    const selectedFloorId = selectedFloorIds[requestId];
    return seats.filter((seat) => {
      if (seat.assignment_id) return false;
      if (!["AVAILABLE", "RESERVED"].includes(seat.status)) return false;
      if (selectedFloorId) {
        return seat.floor_name === floors.find((floor) => floor.id === selectedFloorId)?.name;
      }
      return true;
    });
  }

  function suggestedFloorId(requestId: string) {
    const selectedFloorId = selectedFloorIds[requestId];
    if (selectedFloorId) return selectedFloorId;

    const seatPreference = requests.find((request) => request.id === requestId)?.seat_preference?.toLowerCase() ?? "";
    const matchingFloor = floors.find((floor) => floor.name.toLowerCase().includes(seatPreference));
    return matchingFloor?.id ?? floors[0]?.id ?? "";
  }

  async function approve(requestId: string) {
    const today = new Date();
    const end = new Date(today);
    end.setMonth(end.getMonth() + 1);
    const response = await apiFetch<{ success: boolean; data: { paymentId: string; assignmentId: string } }>(`/owner/join-requests/${requestId}/approve`, {
      method: "POST",
      body: JSON.stringify({
        seatNumber: seatNumbers[requestId] || "",
        planName: "Monthly Plan",
        planPrice: Number(planPrices[requestId] || "999"),
        durationMonths: 1,
        startsAt: today.toISOString(),
        endsAt: end.toISOString(),
        paymentStatus: "DUE",
      }),
    });
    const receiptResponse = await apiFetch<{ success: boolean; data: OwnerReceipt }>(`/owner/payments/${response.data.paymentId}/receipt`);
    setReceipt(receiptResponse.data);
    setReceiptPaymentId(response.data.paymentId);
    setResultMessage(`Admission approved. Assignment ${response.data.assignmentId} created and payment ${response.data.paymentId} added to ledger.`);
    await load();
  }

  async function downloadReceipt() {
    if (!receiptPaymentId) return;
    const download = await fetch(`${getApiBaseUrl()}/v1/owner/payments/${receiptPaymentId}/receipt/export`, {
      credentials: "include",
    });
    const blob = await download.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${receipt?.receiptNo ?? "receipt"}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function reject(requestId: string) {
    await apiFetch(`/owner/join-requests/${requestId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason: "Not approved by library desk" }),
    });
    await load();
  }

  return (
    <DashboardCard title="QR admissions queue" subtitle="Review requests in a lighter queue, then open only the one you want to approve.">
      <div className="grid gap-4">
        {resultMessage ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{resultMessage}</div> : null}
        {receipt ? (
          <div className="rounded-[1.6rem] border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Generated payment receipt</p>
                <p className="mt-2 text-lg font-bold text-slate-950">{receipt.receiptNo}</p>
                <p className="text-sm text-slate-600">{receipt.studentName}</p>
              </div>
              <div className="text-right text-sm text-slate-600">
                <p>{new Date(receipt.issuedAt).toLocaleString()}</p>
                <p className="mt-1 font-bold text-emerald-700">{receipt.status}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-white px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Amount</p>
                <p className="mt-2 text-base font-bold text-slate-950">Rs. {receipt.amount}</p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Method</p>
                <p className="mt-2 text-base font-bold text-slate-950">{receipt.method}</p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Due date</p>
                <p className="mt-2 text-base font-bold text-slate-950">{receipt.dueDate ? new Date(receipt.dueDate).toLocaleDateString() : "N/A"}</p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Reference</p>
                <p className="mt-2 text-base font-bold text-slate-950">{receipt.referenceNo ?? "Desk entry"}</p>
              </div>
            </div>
            <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">QR verification ID</p>
              <p className="mt-2 font-bold text-slate-950">{receipt.verificationId}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => window.print()} className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-bold text-[var(--lp-primary)]">
                Print receipt
              </button>
              <button type="button" onClick={() => void downloadReceipt()} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">
                Download PDF
              </button>
            </div>
          </div>
        ) : null}
        {requests.map((request) => {
          const isOpen = activeRequestId === request.id;
          return (
            <div key={request.id} className="rounded-[1.6rem] border border-[var(--lp-border)] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-[var(--lp-text)]">{request.student_name}</p>
                  <p className="text-sm text-[var(--lp-muted)]">{request.student_code ?? request.student_email ?? request.student_phone ?? "Student app account"}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--lp-accent)]">{request.requested_via} - {request.status}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs text-[var(--lp-muted)]">{new Date(request.created_at).toLocaleString()}</p>
                  <button
                    type="button"
                    onClick={() => setActiveRequestId((current) => (current === request.id ? null : request.id))}
                    className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--lp-primary)]"
                  >
                    {isOpen ? "Hide review" : "Review request"}
                  </button>
                </div>
              </div>
              {request.message ? <p className="mt-3 text-sm text-[var(--lp-muted)]">{request.message}</p> : null}

              <div className="mt-4 grid gap-3 rounded-2xl bg-[#f9f5ee] p-4 text-sm text-[var(--lp-muted)] sm:grid-cols-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--lp-accent)]">Plan</p>
                  <p className="mt-2 font-semibold text-[var(--lp-text)]">Monthly Plan</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--lp-accent)]">Payment</p>
                  <p className="mt-2 font-semibold text-[var(--lp-text)]">Pending desk collection</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--lp-accent)]">Seat preference</p>
                  <p className="mt-2 font-semibold text-[var(--lp-text)]">{request.seat_preference ?? "No preference"}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--lp-accent)]">Review mode</p>
                  <p className="mt-2 font-semibold text-[var(--lp-text)]">{isOpen ? "Open now" : "Collapsed"}</p>
                </div>
              </div>

              {isOpen ? (
                <div className="mt-4 grid gap-3">
                  <div className="grid gap-3 rounded-2xl bg-[#f9f5ee] p-4 text-sm text-[var(--lp-muted)] sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--lp-accent)]">Student profile</p>
                      <p className="mt-2 font-semibold text-[var(--lp-text)]">{request.student_name}</p>
                      <p>{request.student_email ?? request.student_phone ?? request.student_code ?? "App-only profile"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--lp-accent)]">Approval checklist</p>
                      <p className="mt-2">Choose floor, then available seat, then approve with desk amount.</p>
                      <p>Seat control par alag jaane ki zarurat nahi.</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[180px_1fr_140px_auto_auto]">
                    <select
                      value={selectedFloorIds[request.id] ?? suggestedFloorId(request.id)}
                      onChange={(event) => setSelectedFloorIds((current) => ({ ...current, [request.id]: event.target.value }))}
                      className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3"
                    >
                      {floors.map((floor) => (
                        <option key={floor.id} value={floor.id}>
                          Floor {floor.floor_number} - {floor.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={seatNumbers[request.id] ?? ""}
                      onChange={(event) => setSeatNumbers((current) => ({ ...current, [request.id]: event.target.value }))}
                      className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3"
                    >
                      <option value="">Choose seat</option>
                      {getAvailableSeats(request.id).map((seat) => (
                        <option key={seat.id} value={seat.seat_number}>
                          {seat.seat_number} - {seat.floor_name ?? "No floor"}{seat.section_name ? ` - ${seat.section_name}` : ""}{seat.status === "RESERVED" ? " - Reserved" : ""}
                        </option>
                      ))}
                    </select>
                    <input
                      value={planPrices[request.id] ?? "999"}
                      onChange={(event) => setPlanPrices((current) => ({ ...current, [request.id]: event.target.value }))}
                      placeholder="Plan amount"
                      className="rounded-2xl border border-[var(--lp-border)] bg-white px-4 py-3"
                    />
                    <button type="button" onClick={() => void approve(request.id)} disabled={request.status !== "PENDING" || !seatNumbers[request.id]} className="rounded-2xl bg-[var(--lp-primary)] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
                      Approve
                    </button>
                    <button type="button" onClick={() => void reject(request.id)} disabled={request.status !== "PENDING"} className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-bold text-rose-600 disabled:opacity-50">
                      Reject
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
        {requests.length === 0 ? <p className="text-sm text-[var(--lp-muted)]">No admission requests right now.</p> : null}
      </div>
    </DashboardCard>
  );
}
