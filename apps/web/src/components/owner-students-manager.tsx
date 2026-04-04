"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type StudentRow = {
  assignment_id: string;
  student_user_id: string;
  student_code: string | null;
  student_name: string;
  father_name: string | null;
  student_email: string | null;
  student_phone: string | null;
  seat_number: string | null;
  plan_name: string;
  plan_price: string;
  duration_months: number;
  next_due_date: string | null;
  starts_at: string;
  ends_at: string;
  payment_status: string;
  due_amount: string;
  status: string;
};

type ListResponse = { success: boolean; data: StudentRow[] };
type SaveStudentResponse = {
  success: boolean;
  data?: {
    loginId?: string | null;
    temporaryPassword?: string | null;
  };
};

type ProductivityDetailResponse = {
  success: boolean;
  data: {
    summary: {
      totalStudyHours: number;
      weeklyStudyHours: number;
      attendanceDays: number;
      missedDays: number;
      longestStreak: number;
      deepWorkHours: number;
      mostStudiedSubject: string | null;
      completedTopics: number;
      totalTopics: number;
      dailyCompletedTopics: number;
    };
    focusSubjects: Array<{
      subjectLabel: string;
      totalMinutes: number;
      totalSessions: number;
    }>;
    recentSessions: Array<{
      topicTitle: string | null;
      sessionType: string;
      durationMinutes: number;
      completedAt: string;
    }>;
  };
};

export function OwnerStudentsManager() {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    fatherName: "",
    email: "",
    phone: "",
    seatNumber: "",
    planName: "",
    planPrice: "",
    startsAt: "",
    endsAt: "",
    durationMonths: "1",
    paymentStatus: "PENDING",
    notes: "",
  });
  const [credentialSlip, setCredentialSlip] = useState<{
    studentName: string;
    loginId: string;
    password: string;
    seatNumber: string;
    validity: string;
  } | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);
  const [productivity, setProductivity] = useState<ProductivityDetailResponse["data"] | null>(null);
  const [productivityLoading, setProductivityLoading] = useState(false);

  async function loadStudents() {
    setLoading(true);
    try {
      const response = await apiFetch<ListResponse>("/owner/students");
      setRows(response.data);
      setError(null);
    } catch (loadError) {
      setRows([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load student roster.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStudents();
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    try {
      const response = await apiFetch<SaveStudentResponse>(editingId ? `/owner/students/${editingId}` : "/owner/students", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify({
          ...form,
          planPrice: Number(form.planPrice || "0"),
          nextDueDate: form.endsAt,
        }),
      });
      setMessage(
        editingId
          ? "Student updated successfully."
          : response.data?.temporaryPassword
            ? `Student saved. Login: ${response.data.loginId ?? "phone/email"} | Password: ${response.data.temporaryPassword}`
            : "Student saved successfully.",
      );
      if (!editingId && response.data?.temporaryPassword) {
        setCredentialSlip({
          studentName: form.fullName,
          loginId: response.data.loginId ?? form.phone ?? form.email ?? "Use student phone/email",
          password: response.data.temporaryPassword,
          seatNumber: form.seatNumber || "To be allotted",
          validity: form.endsAt,
        });
      }
      setEditingId(null);
      setForm({
        fullName: "",
        fatherName: "",
        email: "",
        phone: "",
        seatNumber: "",
        planName: "",
        planPrice: "",
        startsAt: "",
        endsAt: "",
        durationMonths: "1",
        paymentStatus: "PENDING",
        notes: "",
      });
      await loadStudents();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save student.");
    }
  }

  async function onDelete(assignmentId: string) {
    setMessage(null);
    setError(null);
    try {
      await apiFetch(`/owner/students/${assignmentId}`, {
        method: "DELETE",
      });
      if (editingId === assignmentId) {
        setEditingId(null);
      }
      setMessage("Student assignment removed.");
      await loadStudents();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete student.");
    }
  }

  async function loadProductivity(studentUserId: string, studentName: string) {
    setSelectedStudentName(studentName);
    setProductivityLoading(true);
    setMessage(null);
    setError(null);
    try {
      const response = await apiFetch<ProductivityDetailResponse>(`/owner/students/${studentUserId}/productivity`);
      setProductivity(response.data);
    } catch (loadError) {
      setProductivity(null);
      setError(loadError instanceof Error ? loadError.message : "Unable to load student productivity.");
    } finally {
      setProductivityLoading(false);
    }
  }

  function loadIntoForm(student: StudentRow) {
    setEditingId(student.assignment_id);
    setForm({
      fullName: student.student_name,
      fatherName: student.father_name ?? "",
      email: student.student_email ?? "",
      phone: student.student_phone ?? "",
      seatNumber: student.seat_number ?? "",
      planName: student.plan_name,
      planPrice: student.plan_price,
      startsAt: student.starts_at,
      endsAt: student.ends_at,
      durationMonths: String(student.duration_months || 1),
      paymentStatus: student.payment_status,
      notes: student.next_due_date ? `Next due ${student.next_due_date}` : "",
    });
    setMessage(null);
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      fullName: "",
      fatherName: "",
      email: "",
      phone: "",
      seatNumber: "",
      planName: "",
      planPrice: "",
      startsAt: "",
      endsAt: "",
      durationMonths: "1",
      paymentStatus: "PENDING",
      notes: "",
    });
  }

  function handleStartDateChange(value: string) {
    const duration = Number(form.durationMonths || "1");
    let nextEndDate = "";
    if (value) {
      const date = new Date(value);
      date.setMonth(date.getMonth() + duration);
      nextEndDate = date.toISOString().slice(0, 10);
    }
    setForm((current) => ({ ...current, startsAt: value, endsAt: nextEndDate || current.endsAt }));
  }

  function handleDurationChange(value: string) {
    const duration = Number(value || "1");
    let nextEndDate = form.endsAt;
    if (form.startsAt) {
      const date = new Date(form.startsAt);
      date.setMonth(date.getMonth() + duration);
      nextEndDate = date.toISOString().slice(0, 10);
    }
    setForm((current) => ({ ...current, durationMonths: value, endsAt: nextEndDate }));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <DashboardCard title="New student / update assignment" subtitle="Basic CRUD form owners expect">
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <input value={form.fullName} onChange={(e) => setForm((c) => ({ ...c, fullName: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Student name" />
            <input value={form.fatherName} onChange={(e) => setForm((c) => ({ ...c, fatherName: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Father name" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input value={form.phone} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Phone number" />
            <input value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Email" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <input value={form.seatNumber} onChange={(e) => setForm((c) => ({ ...c, seatNumber: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Seat number" />
            <input value={form.planName} onChange={(e) => setForm((c) => ({ ...c, planName: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Plan name" />
            <input value={form.planPrice} onChange={(e) => setForm((c) => ({ ...c, planPrice: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Plan price" />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <input type="date" value={form.startsAt} onChange={(e) => handleStartDateChange(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" />
            <input value={form.durationMonths} onChange={(e) => handleDurationChange(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Months" type="number" min="1" />
            <input type="date" value={form.endsAt} onChange={(e) => setForm((c) => ({ ...c, endsAt: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" />
            <select value={form.paymentStatus} onChange={(e) => setForm((c) => ({ ...c, paymentStatus: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none">
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="DUE">Due</option>
            </select>
          </div>
          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
            Next due date: <span className="font-bold text-slate-950">{form.endsAt || "-"}</span> | Duration: <span className="font-bold text-slate-950">{form.durationMonths} month(s)</span>
          </div>
          <textarea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Notes" />
          {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-bold text-white">{editingId ? "Update student" : "Save student"}</button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700"
            >
              Reset form
            </button>
          </div>
        </form>
      </DashboardCard>

      <div className="grid gap-6">
        {credentialSlip ? (
          <DashboardCard title="Printable credential slip" subtitle="Give this to the student for first login and QR entry">
            <div className="rounded-[1.5rem] border border-dashed border-[var(--lp-border)] bg-white p-5">
              <p className="text-lg font-black text-slate-950">{credentialSlip.studentName}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <p className="text-sm text-slate-700">Login ID: <span className="font-bold text-slate-950">{credentialSlip.loginId}</span></p>
                <p className="text-sm text-slate-700">Password: <span className="font-bold text-slate-950">{credentialSlip.password}</span></p>
                <p className="text-sm text-slate-700">Seat: <span className="font-bold text-slate-950">{credentialSlip.seatNumber}</span></p>
                <p className="text-sm text-slate-700">Valid till: <span className="font-bold text-slate-950">{credentialSlip.validity}</span></p>
              </div>
              <button type="button" onClick={() => window.print()} className="mt-4 rounded-full bg-[var(--lp-primary)] px-4 py-2 text-sm font-bold text-white">
                Print slip
              </button>
            </div>
          </DashboardCard>
        ) : null}

        {selectedStudentName ? (
          <DashboardCard title={`Productivity: ${selectedStudentName}`} subtitle="Owner visibility into discipline, focus, and syllabus coverage">
            {productivityLoading ? <p className="text-sm text-slate-500">Loading productivity snapshot...</p> : null}
            {!productivityLoading && productivity ? (
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Weekly study</p>
                    <p className="mt-3 text-2xl font-black text-slate-950">{productivity.summary.weeklyStudyHours} hrs</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Attendance</p>
                    <p className="mt-3 text-2xl font-black text-slate-950">{productivity.summary.attendanceDays} days</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Syllabus</p>
                    <p className="mt-3 text-2xl font-black text-slate-950">{productivity.summary.completedTopics}/{productivity.summary.totalTopics}</p>
                  </div>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-700">
                    Longest streak {productivity.summary.longestStreak} days | Deep work {productivity.summary.deepWorkHours} hrs | Missed days {productivity.summary.missedDays} | Most studied {productivity.summary.mostStudiedSubject ?? "-"}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-3">
                    {productivity.focusSubjects.map((subject) => (
                      <div key={subject.subjectLabel} className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                        <p className="font-black text-slate-950">{subject.subjectLabel}</p>
                        <p className="mt-2 text-sm text-slate-500">{subject.totalSessions} sessions</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--lp-primary)]">{subject.totalMinutes} min</p>
                      </div>
                    ))}
                    {productivity.focusSubjects.length === 0 ? <p className="text-sm text-slate-500">No focus subject data yet.</p> : null}
                  </div>
                  <div className="grid gap-3">
                    {productivity.recentSessions.map((session, index) => (
                      <div key={`${session.completedAt}-${index}`} className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                        <p className="font-black text-slate-950">{session.topicTitle ?? "Focus session"}</p>
                        <p className="mt-1 text-sm text-slate-500">{session.completedAt.slice(0, 16).replace("T", " ")}</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--lp-primary)]">{session.durationMinutes} min | {session.sessionType}</p>
                      </div>
                    ))}
                    {productivity.recentSessions.length === 0 ? <p className="text-sm text-slate-500">No recent session data yet.</p> : null}
                  </div>
                </div>
              </div>
            ) : null}
          </DashboardCard>
        ) : null}

      <DashboardCard title="Active roster" subtitle="Current assignments and due tracking">
        {loading ? <p className="text-sm text-slate-500">Loading student roster...</p> : null}
        {!loading ? (
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200">
            <div className="hidden grid-cols-[1.3fr_0.7fr_1fr_0.85fr_0.75fr_0.8fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500 md:grid">
              <span>Student</span>
              <span>Seat</span>
              <span>Plan</span>
              <span>Validity</span>
              <span>Status</span>
              <span>Due</span>
            </div>
            {rows.map((student) => (
              <div key={student.assignment_id} className="border-t border-slate-200 bg-white px-4 py-4 text-sm">
                <div className="grid gap-3 md:grid-cols-[1.3fr_0.7fr_1fr_0.85fr_0.75fr_0.8fr]">
                <div className="min-w-0">
                  <p className="font-bold text-slate-950">{student.student_name}</p>
                  <p className="text-slate-500">{student.student_phone ?? student.student_email ?? "-"}</p>
                  <p className="text-xs text-[var(--lp-primary)]">Login ID: {student.student_code ?? student.student_phone ?? student.student_email ?? "-"}</p>
                  <p className="text-xs text-slate-400">Father: {student.father_name ?? "-"}</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => loadIntoForm(student)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Edit</button>
                    <button type="button" onClick={() => void loadProductivity(student.student_user_id, student.student_name)} className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-700">Focus</button>
                    <Link href={`/owner/students/${student.student_user_id}?name=${encodeURIComponent(student.student_name)}`} className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">Open page</Link>
                    <button type="button" onClick={() => void onDelete(student.assignment_id)} className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">Delete</button>
                  </div>
                </div>
                <span className="font-semibold text-slate-700"><span className="mr-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400 md:hidden">Seat</span>{student.seat_number ?? "-"}</span>
                <span className="font-semibold text-slate-700"><span className="mr-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400 md:hidden">Plan</span>{student.plan_name}</span>
                <span className="font-semibold text-slate-700"><span className="mr-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400 md:hidden">Validity</span>{student.ends_at}<br /><span className="text-xs text-slate-400">Due {student.next_due_date ?? "-"}</span></span>
                <span className={`rounded-full px-3 py-2 text-center text-xs font-black ${student.payment_status === "PAID" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {student.payment_status}
                </span>
                <span className="font-bold text-slate-950"><span className="mr-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400 md:hidden">Due</span>Rs. {student.due_amount}</span>
                </div>
              </div>
            ))}
            {rows.length === 0 ? <div className="border-t border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">No active students found.</div> : null}
          </div>
        ) : null}
      </DashboardCard>
      </div>
    </div>
  );
}
