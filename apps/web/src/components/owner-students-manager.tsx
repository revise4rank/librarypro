"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";
import { FormDrawer } from "./form-drawer";

type StudentRow = {
  assignment_id: string;
  student_user_id: string;
  student_code: string | null;
  student_name: string;
  date_of_birth: string | null;
  gender: string | null;
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
  floor_id: string | null;
  room_id?: string | null;
  floor_name: string | null;
  room_name?: string | null;
  section_name?: string | null;
  seat_number: string;
  status: string;
  assignment_id: string | null;
};

type FloorOption = {
  id: string;
  name: string;
};

type RoomOption = {
  id: string;
  floor_id: string;
  name: string;
  status: string;
  seat_count?: number;
};

type StudentPlanConfig = {
  id: string;
  name: string;
  duration_months: number;
  base_amount: string;
};

type RosterStatTone = "slate" | "green" | "amber";
type RosterFilter = "ALL" | "ALLOTTED" | "NO_SEAT" | "PAID" | "DUE";

function RosterStatCard({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone: RosterStatTone;
  active: boolean;
  onClick: () => void;
}) {
  const toneClass = {
    slate: "bg-slate-50 text-slate-950 ring-slate-200",
    green: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
  }[tone];

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-w-0 rounded-lg px-3 py-2 text-left ring-1 transition hover:-translate-y-0.5 hover:shadow-sm ${toneClass} ${
        active ? "ring-2 ring-[var(--lp-accent)] shadow-sm" : ""
      }`}
    >
      <p className="truncate text-[11px] font-semibold leading-none text-slate-600">{label}</p>
      <p className="mt-1 text-xl font-black leading-none tracking-tight">{value}</p>
    </button>
  );
}

function isLikelyLegacySeatRoom(room: RoomOption) {
  return /^[A-Z]{1,3}\d{1,4}$/i.test(room.name.trim()) && (room.seat_count ?? 0) <= 1;
}

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
    <div className="grid gap-3 rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 text-sm text-[var(--lp-text-soft)]">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-[var(--lp-text)]">{label}</span>
        <span className="text-xs">{status}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={id}
          className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)]"
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
      dateOfBirth: "",
      gender: "",
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
    dateOfBirth: student.date_of_birth ?? "",
    gender: student.gender ?? "",
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
  const [floors, setFloors] = useState<FloorOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [seats, setSeats] = useState<OwnerSeatOption[]>([]);
  const [plans, setPlans] = useState<StudentPlanConfig[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>("ALL");
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedSeatId, setSelectedSeatId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seatSaving, setSeatSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<"aadhaar" | "school" | null>(null);
  const [editorMode, setEditorMode] = useState<"summary" | "profile" | "plan">("summary");
  const [editorOpen, setEditorOpen] = useState(false);
  const [seatDrawerOpen, setSeatDrawerOpen] = useState(false);
  const [form, setForm] = useState(buildInitialForm(null));
  const selectedStudent = rows.find((row) => row.assignment_id === selectedAssignmentId) ?? null;

  async function loadStudents() {
    setLoading(true);
    try {
      const [studentsResponse, seatsResponse, plansResponse, floorsResponse, roomsResponse] = await Promise.all([
        apiFetch<{ success: boolean; data: StudentRow[] }>("/owner/students"),
        apiFetch<{ success: boolean; data: OwnerSeatOption[] }>("/owner/seats"),
        apiFetch<{ success: boolean; data: StudentPlanConfig[] }>("/owner/student-plans"),
        apiFetch<{ success: boolean; data: FloorOption[] }>("/owner/floors"),
        apiFetch<{ success: boolean; data: RoomOption[] }>("/owner/rooms"),
      ]);
      setRows(studentsResponse.data);
      setSeats(seatsResponse.data);
      setPlans(plansResponse.data);
      setFloors(floorsResponse.data);
      setRooms(roomsResponse.data.filter((room) => room.status !== "INACTIVE" && !isLikelyLegacySeatRoom(room)));
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
    setSelectedFloorId("");
    setSelectedRoomId("");
    setSelectedSeatId("");
    setEditorMode("summary");
  }, [selectedStudent]);

  const floorRooms = useMemo(() => rooms.filter((room) => !selectedFloorId || room.floor_id === selectedFloorId), [rooms, selectedFloorId]);
  const availableSeats = useMemo(
    () =>
      seats.filter((seat) => {
        if (!["AVAILABLE", "RESERVED"].includes(seat.status)) return false;
        if (selectedFloorId && seat.floor_id !== selectedFloorId) return false;
        if (selectedRoomId && seat.room_id !== selectedRoomId) return false;
        if (!selectedStudent) return true;
        return !seat.assignment_id || seat.assignment_id === selectedStudent.assignment_id;
      }),
    [seats, selectedFloorId, selectedRoomId, selectedStudent],
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

  const rosterStats = [
    { label: "Students", filter: "ALL" as const, value: summary.total, tone: "slate" as const },
    { label: "Allotted", filter: "ALLOTTED" as const, value: summary.allotted, tone: "green" as const },
    { label: "No seat", filter: "NO_SEAT" as const, value: summary.unallotted, tone: "amber" as const },
    { label: "Paid", filter: "PAID" as const, value: summary.paid, tone: "green" as const },
    { label: "Due", filter: "DUE" as const, value: summary.due, tone: "amber" as const },
  ];

  const filteredRows = useMemo(() => {
    switch (rosterFilter) {
      case "ALLOTTED":
        return rows.filter((student) => student.admission_status === "SEAT_ALLOTTED" || Boolean(student.seat_number));
      case "NO_SEAT":
        return rows.filter((student) => student.admission_status === "SEAT_UNALLOTTED" || !student.seat_number);
      case "PAID":
        return rows.filter((student) => student.payment_status === "PAID");
      case "DUE":
        return rows.filter((student) => student.payment_status === "DUE" || student.payment_status === "PENDING" || Number(student.due_amount) > 0);
      default:
        return rows;
    }
  }, [rows, rosterFilter]);

  const activeFilterLabel = rosterStats.find((stat) => stat.filter === rosterFilter)?.label ?? "Students";

  useEffect(() => {
    if (loading) return;
    if (filteredRows.length === 0) {
      setSelectedAssignmentId(null);
      return;
    }
    if (!selectedAssignmentId || !filteredRows.some((student) => student.assignment_id === selectedAssignmentId)) {
      setSelectedAssignmentId(filteredRows[0].assignment_id);
    }
  }, [filteredRows, loading, selectedAssignmentId]);

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
          dateOfBirth: form.dateOfBirth || undefined,
          gender: form.gender || undefined,
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
      setEditorOpen(false);
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
      setSeatDrawerOpen(false);
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
      setSeatDrawerOpen(false);
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
    <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
      <DashboardCard title="Active roster">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 shadow-sm">
            <div>
              <p className="text-sm font-bold tracking-tight text-[var(--lp-text)]">Roster</p>
              <p className="mt-0.5 text-xs text-[var(--lp-text-soft)]">Select a student to manage seat or plan.</p>
            </div>
            <Link href="/owner/admissions" className="rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-3 py-2 text-xs font-semibold text-[var(--lp-accent)] transition hover:bg-emerald-100">
              Create admission
            </Link>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {rosterStats.map((stat) => (
              <RosterStatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                tone={stat.tone}
                active={rosterFilter === stat.filter}
                onClick={() => setRosterFilter(stat.filter)}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-[var(--lp-text-soft)]">
            <span>{activeFilterLabel} filter</span>
            <span>{filteredRows.length} shown</span>
          </div>

          {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

          <div className="max-h-[min(58vh,34rem)] overflow-y-auto rounded-lg border border-[var(--lp-border)] bg-white p-1.5">
            {loading ? <p className="text-sm text-[var(--lp-text-soft)]">Loading roster...</p> : null}
            <div className="grid gap-1.5">
              {filteredRows.map((student) => (
                <button
                  key={student.assignment_id}
                  type="button"
                  onClick={() => setSelectedAssignmentId(student.assignment_id)}
                  className={`grid gap-1.5 rounded-md border px-3 py-2 text-left transition ${selectedAssignmentId === student.assignment_id ? "border-[var(--lp-accent)] bg-[var(--lp-accent-soft)]/45" : "border-transparent bg-white hover:border-[var(--lp-border)] hover:bg-slate-50"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold leading-tight text-[var(--lp-text)]">{student.student_name}</p>
                      <p className="mt-0.5 truncate text-xs leading-tight text-[var(--lp-text-soft)]">{student.student_phone ?? student.student_email ?? student.student_code ?? "No contact"}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold leading-none ${student.admission_status === "SEAT_ALLOTTED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {student.admission_status === "SEAT_ALLOTTED" ? `Seat ${student.seat_number}` : "No seat"}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-[11px] leading-tight text-[var(--lp-text-soft)]">
                    <span className="max-w-[9rem] truncate">{student.plan_name}</span>
                    <span className="font-semibold text-[var(--lp-text)]">{student.payment_status}</span>
                    <span>Due Rs. {Number(student.due_amount).toLocaleString("en-IN")}</span>
                  </div>
                </button>
              ))}
            </div>
            {!loading && rows.length === 0 ? <p className="text-sm text-[var(--lp-text-soft)]">No active students yet.</p> : null}
            {!loading && rows.length > 0 && filteredRows.length === 0 ? (
              <p className="px-2 py-3 text-sm text-[var(--lp-text-soft)]">No students match this filter.</p>
            ) : null}
          </div>
        </div>
      </DashboardCard>

      <div className="grid gap-4">
        {selectedStudent ? (
          <>
            <DashboardCard title="Selected student">
              <div className="grid gap-3">
                <div className="grid gap-2 md:grid-cols-4">
                  <div className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2"><p className="text-[10px] font-black uppercase text-slate-400">Current seat</p><p className="mt-1 truncate text-sm font-semibold text-[var(--lp-text)]">{selectedStudent.seat_number ?? "Unallotted"}</p></div>
                  <div className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2"><p className="text-[10px] font-black uppercase text-slate-400">Plan</p><p className="mt-1 truncate text-sm font-semibold text-[var(--lp-text)]">{selectedStudent.plan_name}</p></div>
                  <div className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2"><p className="text-[10px] font-black uppercase text-slate-400">Fee status</p><p className="mt-1 truncate text-sm font-semibold text-[var(--lp-text)]">{selectedStudent.payment_status}</p></div>
                  <div className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2"><p className="text-[10px] font-black uppercase text-slate-400">Validity</p><p className="mt-1 truncate text-sm font-semibold text-[var(--lp-text)]">{selectedStudent.ends_at}</p></div>
                  <div className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2"><p className="text-[10px] font-black uppercase text-slate-400">DOB</p><p className="mt-1 truncate text-sm font-semibold text-[var(--lp-text)]">{selectedStudent.date_of_birth ?? "-"}</p></div>
                  <div className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2"><p className="text-[10px] font-black uppercase text-slate-400">Gender</p><p className="mt-1 truncate text-sm font-semibold text-[var(--lp-text)]">{selectedStudent.gender ? selectedStudent.gender.replaceAll("_", " ") : "-"}</p></div>
                </div>

                <div className="grid gap-2 rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface)] px-3 py-2 md:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-sm font-black text-[var(--lp-text)]">Seat assignment</p>
                    <p className="mt-0.5 text-xs text-[var(--lp-text-soft)]">
                      {selectedStudent.seat_number ? `Current seat ${selectedStudent.seat_number}. Change or remove from the focused drawer.` : "No seat allotted yet. Assign from the focused drawer."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSeatDrawerOpen(true)}
                    className="rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-3 py-2 text-xs font-semibold text-[var(--lp-accent)]"
                  >
                    Manage seat
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditorMode("profile");
                      setEditorOpen(true);
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${editorMode === "profile" ? "border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "border border-[var(--lp-border)] bg-white text-[var(--lp-text-soft)]"}`}
                  >
                    Edit student profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditorMode("plan");
                      setEditorOpen(true);
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${editorMode === "plan" ? "border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "border border-[var(--lp-border)] bg-white text-[var(--lp-text-soft)]"}`}
                  >
                    Renew / change plan
                  </button>
                </div>

                <Link href={`/owner/students/${selectedStudent.student_user_id}`} className="text-sm font-semibold text-[var(--lp-accent)]">
                  Open detailed student profile
                </Link>
              </div>
            </DashboardCard>

            <FormDrawer
              open={seatDrawerOpen}
              onClose={() => setSeatDrawerOpen(false)}
              title="Manage student seat"
              description="Allot, change, or remove the selected student's seat without stretching the roster page."
            >
              <div className="grid gap-4">
                <div className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Student</p>
                  <p className="mt-2 text-lg font-black text-[var(--lp-text)]">{selectedStudent.student_name}</p>
                  <p className="mt-1 text-sm text-[var(--lp-text-soft)]">Current seat: {selectedStudent.seat_number ?? "Unallotted"}</p>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <select
                    value={selectedFloorId}
                    onChange={(event) => {
                      setSelectedFloorId(event.target.value);
                      setSelectedRoomId("");
                      setSelectedSeatId("");
                    }}
                    className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none"
                  >
                    <option value="">Choose floor</option>
                    {floors.map((floor) => (
                      <option key={floor.id} value={floor.id}>{floor.name}</option>
                    ))}
                  </select>
                  <select
                    value={selectedRoomId}
                    onChange={(event) => {
                      setSelectedRoomId(event.target.value);
                      setSelectedSeatId("");
                    }}
                    disabled={!selectedFloorId}
                    className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">{selectedFloorId ? "Choose room" : "Floor first"}</option>
                    {floorRooms.map((room) => (
                      <option key={room.id} value={room.id}>{room.name}</option>
                    ))}
                  </select>
                  <select
                    value={selectedSeatId}
                    onChange={(event) => setSelectedSeatId(event.target.value)}
                    disabled={!selectedFloorId || !selectedRoomId}
                    className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">{selectedRoomId ? "Choose seat" : "Room first"}</option>
                    {availableSeats.map((seat) => (
                      <option key={seat.id} value={seat.id}>{seat.seat_number}</option>
                    ))}
                  </select>
                </div>
                {selectedRoomId && availableSeats.length === 0 ? <p className="text-xs font-semibold text-amber-700">Selected room me available seats nahi hain.</p> : null}
                <button type="button" disabled={seatSaving || !selectedSeatId} onClick={() => void assignSeat()} className="rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-3 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-60">
                  {seatSaving ? "Saving seat..." : selectedStudent.seat_number ? "Change seat" : "Allot seat"}
                </button>
                <button type="button" disabled={seatSaving || !selectedStudent.seat_number} onClick={() => void removeSeat()} className="rounded-lg border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 disabled:opacity-60">
                  Remove current seat
                </button>
              </div>
            </FormDrawer>

            <FormDrawer
              open={editorOpen && editorMode === "profile"}
              onClose={() => setEditorOpen(false)}
              title="Edit student profile"
              description="Update contact, class, guardian, address, and documents for the selected roster student."
            >
              <form className="grid gap-4" onSubmit={updateStudent}>
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Full name" />
                  <input value={form.fatherName} onChange={(event) => setForm((current) => ({ ...current, fatherName: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Guardian / father name" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input type="date" value={form.dateOfBirth} onChange={(event) => setForm((current) => ({ ...current, dateOfBirth: event.target.value }))} aria-label="Date of birth" className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" />
                  <select value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none">
                    <option value="">Gender optional</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                    <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                  </select>
                </div>
                <textarea value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} className="min-h-20 rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Address" />
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={form.className} onChange={(event) => setForm((current) => ({ ...current, className: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Class" />
                  <input value={form.preparingFor} onChange={(event) => setForm((current) => ({ ...current, preparingFor: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Preparing for" />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Contact number" />
                  <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Email" />
                  <input value={form.emergencyContact} onChange={(event) => setForm((current) => ({ ...current, emergencyContact: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Emergency contact" />
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
                <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-20 rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Roster notes" />
                <button disabled={saving} className="rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-60">
                  {saving ? "Saving profile..." : "Save student profile"}
                </button>
              </form>
            </FormDrawer>

            <FormDrawer
              open={editorOpen && editorMode === "plan"}
              onClose={() => setEditorOpen(false)}
              title="Renew or change student plan"
              description="Update the student's plan, amount, validity dates, and payment status."
            >
              <form className="grid gap-4" onSubmit={updateStudent}>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Current plan</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--lp-text)]">{selectedStudent.plan_name}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Current fee</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--lp-text)]">Rs. {Number(selectedStudent.plan_price).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Coupon</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--lp-text)]">{selectedStudent.coupon_code ?? "No coupon used"}</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input list="owner-plan-names" value={form.planName} onChange={(event) => setForm((current) => ({ ...current, planName: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Plan name" />
                  <input type="number" min="0" value={form.planPrice} onChange={(event) => setForm((current) => ({ ...current, planPrice: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Final amount" />
                </div>
                <datalist id="owner-plan-names">
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.name} />
                  ))}
                </datalist>
                <div className="grid gap-3 md:grid-cols-4">
                  <input type="number" min="1" value={form.durationMonths} onChange={(event) => setForm((current) => ({ ...current, durationMonths: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Duration (months)" />
                  <input type="date" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" />
                  <input type="date" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" />
                  <select value={form.paymentStatus} onChange={(event) => setForm((current) => ({ ...current, paymentStatus: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none">
                    <option value="PENDING">Pending</option>
                    <option value="DUE">Due</option>
                    <option value="PAID">Paid</option>
                    <option value="FAILED">Failed</option>
                    <option value="REFUNDED">Refunded</option>
                  </select>
                </div>
                <button disabled={saving} className="rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-60">
                  {saving ? "Saving plan..." : "Save student plan changes"}
                </button>
              </form>
            </FormDrawer>
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
