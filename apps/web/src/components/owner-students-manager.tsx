"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type StudentRow = {
  assignment_id: string;
  student_user_id: string;
  student_code: string | null;
  student_name: string;
  father_name: string | null;
  address: string | null;
  class_name: string | null;
  preparing_for: string | null;
  emergency_contact: string | null;
  student_email: string | null;
  student_phone: string | null;
  seat_number: string | null;
  student_plan_id: string | null;
  plan_name: string;
  plan_price: string;
  base_amount: string | null;
  discount_type: string | null;
  discount_value: string | null;
  coupon_code: string | null;
  final_amount: string | null;
  duration_months: number;
  next_due_date: string | null;
  starts_at: string;
  ends_at: string;
  payment_status: string;
  due_amount: string;
  aadhaar_document_url: string | null;
  school_id_document_url: string | null;
  admission_source: string | null;
  admission_status: "SEAT_UNALLOTTED" | "SEAT_ALLOTTED";
  status: string;
};

type OwnerSeatOption = {
  id: string;
  floor_name: string | null;
  section_name?: string | null;
  seat_number: string;
  status: string;
  assignment_id: string | null;
};

type StudentPlanConfig = {
  id: string;
  name: string;
  duration_months: number;
  base_amount: string;
};

async function uploadStudentDocument(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const result = await apiFetch<{ success: boolean; data: { url: string } }>("/owner/admissions/uploads", {
    method: "POST",
    body: formData,
  });
  return result.data.url;
}

function DocumentUploadField({
  id,
  label,
  status,
  href,
  onChange,
}: {
  id: string;
  label: string;
  status: string;
  href?: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="grid gap-3 rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-3 text-sm text-[var(--lp-text-soft)]">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-[var(--lp-text)]">{label}</span>
        <span className="text-xs">{status}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={id}
          className="inline-flex cursor-pointer items-center justify-center rounded-[0.5rem] border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)]"
        >
          Choose file
        </label>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-[var(--lp-primary)] underline underline-offset-2"
          >
            View uploaded file
          </a>
        ) : (
          <span className="text-xs text-[var(--lp-text-soft)]">PDF, JPG, PNG, or WEBP</span>
        )}
      </div>
      <input
        id={id}
        type="file"
        accept=".pdf,image/png,image/jpeg,image/webp"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="sr-only"
      />
    </div>
  );
}

function buildInitialForm(student: StudentRow | null) {
  if (!student) {
    return {
      fullName: "",
      fatherName: "",
      address: "",
      className: "",
      preparingFor: "",
      email: "",
      phone: "",
      emergencyContact: "",
      planName: "",
      planPrice: "",
      durationMonths: "1",
      startsAt: "",
      endsAt: "",
      paymentStatus: "PENDING",
      aadhaarDocumentUrl: "",
      schoolIdDocumentUrl: "",
      notes: "",
    };
  }

  return {
    fullName: student.student_name,
    fatherName: student.father_name ?? "",
    address: student.address ?? "",
    className: student.class_name ?? "",
    preparingFor: student.preparing_for ?? "",
    email: student.student_email ?? "",
    phone: student.student_phone ?? "",
    emergencyContact: student.emergency_contact ?? "",
    planName: student.plan_name,
    planPrice: student.plan_price,
    durationMonths: String(student.duration_months || 1),
    startsAt: student.starts_at,
    endsAt: student.ends_at,
    paymentStatus: student.payment_status,
    aadhaarDocumentUrl: student.aadhaar_document_url ?? "",
    schoolIdDocumentUrl: student.school_id_document_url ?? "",
    notes: "",
  };
}

export function OwnerStudentsManager() {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [seats, setSeats] = useState<OwnerSeatOption[]>([]);
  const [plans, setPlans] = useState<StudentPlanConfig[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seatSaving, setSeatSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<"aadhaar" | "school" | null>(null);
  const [editorMode, setEditorMode] = useState<"summary" | "profile" | "plan">("summary");
  const selectedStudent = rows.find((row) => row.assignment_id === selectedAssignmentId) ?? null;
  const [form, setForm] = useState(buildInitialForm(null));

  async function loadStudents() {
    setLoading(true);
    try {
      const [studentsResponse, seatsResponse, plansResponse] = await Promise.all([
        apiFetch<{ success: boolean; data: StudentRow[] }>("/owner/students"),
        apiFetch<{ success: boolean; data: OwnerSeatOption[] }>("/owner/seats"),
        apiFetch<{ success: boolean; data: StudentPlanConfig[] }>("/owner/student-plans"),
      ]);
      setRows(studentsResponse.data);
      setSeats(seatsResponse.data);
      setPlans(plansResponse.data);
      setSelectedAssignmentId((current) => current ?? studentsResponse.data[0]?.assignment_id ?? null);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load student roster.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStudents();
  }, []);

  useEffect(() => {
    setForm(buildInitialForm(selectedStudent));
    setSelectedSeatId("");
    setEditorMode("summary");
  }, [selectedStudent]);

  const availableSeats = useMemo(
    () =>
      seats.filter((seat) => {
        if (!["AVAILABLE", "RESERVED"].includes(seat.status)) return false;
        if (!selectedStudent) return true;
        return !seat.assignment_id || seat.assignment_id === selectedStudent.assignment_id;
      }),
    [seats, selectedStudent],
  );

  const summary = rows.reduce(
    (acc, student) => {
      acc.total += 1;
      if (student.admission_status === "SEAT_ALLOTTED") acc.allotted += 1;
      if (student.admission_status === "SEAT_UNALLOTTED") acc.unallotted += 1;
      if (student.payment_status === "PAID") acc.paid += 1;
      if (student.payment_status === "DUE" || student.payment_status === "PENDING") acc.due += 1;
      return acc;
    },
    { total: 0, allotted: 0, unallotted: 0, paid: 0, due: 0 },
  );

  async function updateStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStudent) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/owner/students/${selectedStudent.assignment_id}`, {
        method: "PATCH",
        body: JSON.stringify({
          fullName: form.fullName,
          fatherName: form.fatherName,
          address: form.address,
          className: form.className,
          preparingFor: form.preparingFor,
          email: form.email,
          phone: form.phone,
          emergencyContact: form.emergencyContact,
          planName: form.planName,
          planPrice: Number(form.planPrice || "0"),
          durationMonths: Number(form.durationMonths || "1"),
          nextDueDate: form.endsAt,
          startsAt: form.startsAt,
          endsAt: form.endsAt,
          paymentStatus: form.paymentStatus,
          aadhaarDocumentUrl: form.aadhaarDocumentUrl || undefined,
          schoolIdDocumentUrl: form.schoolIdDocumentUrl || undefined,
          notes: form.notes || undefined,
        }),
      });
      setMessage("Student profile updated.");
      await loadStudents();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update student.");
    } finally {
      setSaving(false);
    }
  }

  async function assignSeat() {
    if (!selectedStudent || !selectedSeatId) return;
    setSeatSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/owner/students/${selectedStudent.assignment_id}/seat-allot`, {
        method: "POST",
        body: JSON.stringify({ seatId: selectedSeatId }),
      });
      setMessage("Seat allotted successfully.");
      await loadStudents();
    } catch (seatError) {
      setError(seatError instanceof Error ? seatError.message : "Unable to assign seat.");
    } finally {
      setSeatSaving(false);
    }
  }

  async function removeSeat() {
    if (!selectedStudent?.seat_number) return;
    setSeatSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/owner/students/${selectedStudent.assignment_id}/seat-allot`, {
        method: "DELETE",
      });
      setMessage("Seat removed from student.");
      await loadStudents();
    } catch (seatError) {
      setError(seatError instanceof Error ? seatError.message : "Unable to remove seat.");
    } finally {
      setSeatSaving(false);
    }
  }

  async function handleDocumentUpload(kind: "aadhaar" | "school", file: File | null) {
    if (!file) return;
    setUploadingDoc(kind);
    setError(null);
    try {
      const url = await uploadStudentDocument(file);
      setForm((current) => ({
        ...current,
        aadhaarDocumentUrl: kind === "aadhaar" ? url : current.aadhaarDocumentUrl,
        schoolIdDocumentUrl: kind === "school" ? url : current.schoolIdDocumentUrl,
      }));
      setMessage(`${kind === "aadhaar" ? "Aadhaar" : "School ID"} uploaded.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload document.");
    } finally {
      setUploadingDoc(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
      <DashboardCard title="Active roster">
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[0.75rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--lp-text)]">Roster</p>
            <Link href="/owner/admissions" className="rounded-[0.5rem] border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)]">
              New admission
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <div className="rounded-[0.75rem] border border-[var(--lp-border)] bg-white px-3 py-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Students</p><p className="mt-1 text-xl font-black text-slate-950">{summary.total}</p></div>
            <div className="rounded-[0.75rem] border border-[var(--lp-border)] bg-white px-3 py-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Allotted</p><p className="mt-1 text-xl font-black text-emerald-700">{summary.allotted}</p></div>
            <div className="rounded-[0.75rem] border border-[var(--lp-border)] bg-white px-3 py-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Open</p><p className="mt-1 text-xl font-black text-amber-700">{summary.unallotted}</p></div>
            <div className="rounded-[0.75rem] border border-[var(--lp-border)] bg-white px-3 py-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Paid</p><p className="mt-1 text-xl font-black text-emerald-700">{summary.paid}</p></div>
            <div className="rounded-[0.75rem] border border-[var(--lp-border)] bg-white px-3 py-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Due</p><p className="mt-1 text-xl font-black text-amber-700">{summary.due}</p></div>
          </div>

          {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

          <div className="grid gap-3">
            {loading ? <p className="text-sm text-[var(--lp-text-soft)]">Loading roster...</p> : null}
            {rows.map((student) => (
              <button
                key={student.assignment_id}
                type="button"
                onClick={() => setSelectedAssignmentId(student.assignment_id)}
                className={`grid gap-3 rounded-[0.75rem] border p-4 text-left ${selectedAssignmentId === student.assignment_id ? "border-[var(--lp-accent)] bg-[var(--lp-accent-soft)]/35" : "border-[var(--lp-border)] bg-white"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--lp-text)]">{student.student_name}</p>
                    <p className="text-sm text-[var(--lp-text-soft)]">{student.student_phone ?? student.student_email ?? student.student_code ?? "No contact"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${student.admission_status === "SEAT_ALLOTTED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {student.admission_status === "SEAT_ALLOTTED" ? `Seat ${student.seat_number}` : "Seat Unallotted"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-[var(--lp-text-soft)]">
                  <span>{student.plan_name}</span>
                  <span>{student.payment_status}</span>
                  <span>Due Rs. {Number(student.due_amount).toLocaleString("en-IN")}</span>
                </div>
              </button>
            ))}
            {!loading && rows.length === 0 ? <p className="text-sm text-[var(--lp-text-soft)]">No active students yet.</p> : null}
          </div>
        </div>
      </DashboardCard>

      <div className="grid gap-6">
        {selectedStudent ? (
          <>
            <DashboardCard title="Selected student">
              <div className="grid gap-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-[0.75rem] border border-[var(--lp-border)] bg-white px-4 py-4"><p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Current seat</p><p className="mt-2 text-sm font-semibold text-[var(--lp-text)]">{selectedStudent.seat_number ?? "Unallotted"}</p></div>
                  <div className="rounded-[0.75rem] border border-[var(--lp-border)] bg-white px-4 py-4"><p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Plan</p><p className="mt-2 text-sm font-semibold text-[var(--lp-text)]">{selectedStudent.plan_name}</p></div>
                  <div className="rounded-[0.75rem] border border-[var(--lp-border)] bg-white px-4 py-4"><p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Fee status</p><p className="mt-2 text-sm font-semibold text-[var(--lp-text)]">{selectedStudent.payment_status}</p></div>
                  <div className="rounded-[0.75rem] border border-[var(--lp-border)] bg-white px-4 py-4"><p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Validity</p><p className="mt-2 text-sm font-semibold text-[var(--lp-text)]">{selectedStudent.ends_at}</p></div>
                </div>

                <div className="grid gap-3 rounded-[0.75rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] p-4 md:grid-cols-[1fr_auto_auto]">
                  <select value={selectedSeatId} onChange={(event) => setSelectedSeatId(event.target.value)} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none">
                    <option value="">{selectedStudent.seat_number ? "Change seat" : "Allot seat"}</option>
                    {availableSeats.map((seat) => (
                      <option key={seat.id} value={seat.id}>
                        {seat.seat_number}{seat.floor_name ? ` • ${seat.floor_name}` : ""}{seat.section_name ? ` • ${seat.section_name}` : ""}
                      </option>
                    ))}
                  </select>
                  <button type="button" disabled={seatSaving || !selectedSeatId} onClick={() => void assignSeat()} className="rounded-[0.5rem] border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-60">
                    {seatSaving ? "Saving..." : selectedStudent.seat_number ? "Change seat" : "Allot seat"}
                  </button>
                  <button type="button" disabled={seatSaving || !selectedStudent.seat_number} onClick={() => void removeSeat()} className="rounded-[0.5rem] border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-60">
                    Remove seat
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditorMode("profile")}
                    className={`rounded-[0.5rem] px-4 py-2 text-sm font-semibold ${editorMode === "profile" ? "border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "border border-[var(--lp-border)] bg-white text-[var(--lp-text-soft)]"}`}
                  >
                    Edit profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode("plan")}
                    className={`rounded-[0.5rem] px-4 py-2 text-sm font-semibold ${editorMode === "plan" ? "border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "border border-[var(--lp-border)] bg-white text-[var(--lp-text-soft)]"}`}
                  >
                    Renew / change plan
                  </button>
                </div>

                <Link href={`/owner/students/${selectedStudent.student_user_id}`} className="text-sm font-semibold text-[var(--lp-accent)]">
                  Open detailed student profile
                </Link>
              </div>
            </DashboardCard>

            {editorMode === "profile" ? (
            <DashboardCard title="Edit roster profile">
              <form className="grid gap-4" onSubmit={updateStudent}>
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Full name" />
                  <input value={form.fatherName} onChange={(event) => setForm((current) => ({ ...current, fatherName: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Guardian / father name" />
                </div>
                <textarea value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} className="min-h-20 rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Address" />
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={form.className} onChange={(event) => setForm((current) => ({ ...current, className: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Class" />
                  <input value={form.preparingFor} onChange={(event) => setForm((current) => ({ ...current, preparingFor: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Preparing for" />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Contact number" />
                  <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Email" />
                  <input value={form.emergencyContact} onChange={(event) => setForm((current) => ({ ...current, emergencyContact: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Emergency contact" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <DocumentUploadField
                    id="student-profile-aadhaar-upload"
                    label="Aadhaar upload"
                    status={uploadingDoc === "aadhaar" ? "Uploading..." : form.aadhaarDocumentUrl ? "Uploaded" : "Optional"}
                    href={form.aadhaarDocumentUrl || undefined}
                    onChange={(file) => void handleDocumentUpload("aadhaar", file)}
                  />
                  <DocumentUploadField
                    id="student-profile-school-upload"
                    label="School ID upload"
                    status={uploadingDoc === "school" ? "Uploading..." : form.schoolIdDocumentUrl ? "Uploaded" : "Optional"}
                    href={form.schoolIdDocumentUrl || undefined}
                    onChange={(file) => void handleDocumentUpload("school", file)}
                  />
                </div>
                <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-20 rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Roster notes" />
                <button disabled={saving} className="rounded-[0.5rem] border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-60">
                  {saving ? "Saving..." : "Save profile changes"}
                </button>
              </form>
            </DashboardCard>
            ) : null}

            {editorMode === "plan" ? (
            <DashboardCard title="Renew or change plan">
              <form className="grid gap-4" onSubmit={updateStudent}>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-[0.75rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Current plan</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--lp-text)]">{selectedStudent.plan_name}</p>
                  </div>
                  <div className="rounded-[0.75rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Current fee</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--lp-text)]">Rs. {Number(selectedStudent.plan_price).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="rounded-[0.75rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Coupon</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--lp-text)]">{selectedStudent.coupon_code ?? "No coupon used"}</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input list="owner-plan-names" value={form.planName} onChange={(event) => setForm((current) => ({ ...current, planName: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Plan name" />
                  <input type="number" min="0" value={form.planPrice} onChange={(event) => setForm((current) => ({ ...current, planPrice: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Final amount" />
                </div>
                <datalist id="owner-plan-names">
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.name} />
                  ))}
                </datalist>
                <div className="grid gap-3 md:grid-cols-4">
                  <input type="number" min="1" value={form.durationMonths} onChange={(event) => setForm((current) => ({ ...current, durationMonths: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Duration (months)" />
                  <input type="date" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" />
                  <input type="date" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" />
                  <select value={form.paymentStatus} onChange={(event) => setForm((current) => ({ ...current, paymentStatus: event.target.value }))} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none">
                    <option value="PENDING">Pending</option>
                    <option value="DUE">Due</option>
                    <option value="PAID">Paid</option>
                    <option value="FAILED">Failed</option>
                    <option value="REFUNDED">Refunded</option>
                  </select>
                </div>
                <button disabled={saving} className="rounded-[0.5rem] border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-60">
                  {saving ? "Saving..." : "Save plan and billing changes"}
                </button>
              </form>
            </DashboardCard>
            ) : null}
          </>
        ) : (
          <DashboardCard title="Student controls">
            <p className="text-sm text-[var(--lp-text-soft)]">No student selected yet.</p>
          </DashboardCard>
        )}
      </div>
    </div>
  );
}
