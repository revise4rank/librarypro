"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type JoinRequest = {
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
};

type StudentPlanConfig = {
  id: string;
  name: string;
  target_audience: string | null;
  description: string | null;
  duration_months: number;
  base_amount: string;
  default_discount_type: "PERCENTAGE" | "FLAT" | null;
  default_discount_value: string | null;
  is_active: boolean;
};

type CouponConfig = {
  id: string;
  student_plan_id: string | null;
  code: string;
  discount_type: "PERCENTAGE" | "FLAT";
  discount_value: string;
  valid_until: string | null;
  is_active: boolean;
};

type AdmissionResult = {
  assignmentId: string;
  paymentId: string;
  loginId: string | null;
  temporaryPassword: string | null;
  planName: string;
  finalAmount: number;
};

type AdmissionFormState = {
  fullName: string;
  fatherName: string;
  address: string;
  className: string;
  preparingFor: string;
  email: string;
  phone: string;
  emergencyContact: string;
  studentPlanId: string;
  planAmountOverride: string;
  durationMonthsOverride: string;
  couponCode: string;
  paymentStatus: "PAID" | "UNPAID" | "DUE";
  aadhaarDocumentUrl: string;
  schoolIdDocumentUrl: string;
  notes: string;
};

function createEmptyForm(): AdmissionFormState {
  return {
    fullName: "",
    fatherName: "",
    address: "",
    className: "",
    preparingFor: "",
    email: "",
    phone: "",
    emergencyContact: "",
    studentPlanId: "",
    planAmountOverride: "",
    durationMonthsOverride: "",
    couponCode: "",
    paymentStatus: "UNPAID",
    aadhaarDocumentUrl: "",
    schoolIdDocumentUrl: "",
    notes: "",
  };
}

function computePreviewAmount(plan: StudentPlanConfig | undefined, coupon: CouponConfig | undefined, overrideAmount: string) {
  if (!plan) return 0;
  const baseAmount = Number(overrideAmount || plan.base_amount || "0");
  const activeDiscountType = coupon?.discount_type ?? plan.default_discount_type;
  const activeDiscountValue = Number(coupon?.discount_value ?? plan.default_discount_value ?? "0");

  if (!activeDiscountType || !activeDiscountValue) {
    return baseAmount;
  }

  if (activeDiscountType === "PERCENTAGE") {
    return Math.max(0, baseAmount - Math.round((baseAmount * activeDiscountValue) / 100));
  }

  return Math.max(0, baseAmount - activeDiscountValue);
}

async function uploadAdmissionDocument(file: File) {
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

export function OwnerAdmissionsManager() {
  const [mode, setMode] = useState<"desk" | "requests">("desk");
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [plans, setPlans] = useState<StudentPlanConfig[]>([]);
  const [coupons, setCoupons] = useState<CouponConfig[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [form, setForm] = useState<AdmissionFormState>(createEmptyForm());
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<"aadhaar" | "school" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdmissionResult | null>(null);

  async function load() {
    try {
      const [requestsResponse, plansResponse, couponsResponse] = await Promise.all([
        apiFetch<{ success: boolean; data: JoinRequest[] }>("/owner/join-requests"),
        apiFetch<{ success: boolean; data: StudentPlanConfig[] }>("/owner/student-plans"),
        apiFetch<{ success: boolean; data: CouponConfig[] }>("/owner/coupons"),
      ]);
      setRequests(requestsResponse.data);
      setPlans(plansResponse.data.filter((plan) => plan.is_active));
      setCoupons(couponsResponse.data.filter((coupon) => coupon.is_active));
      setSelectedRequestId((current) => current ?? requestsResponse.data[0]?.id ?? null);
      if (!form.studentPlanId && plansResponse.data[0]?.id) {
        setForm((current) => ({ ...current, studentPlanId: plansResponse.data[0]?.id ?? "" }));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load admissions workspace.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const selectedRequest = requests.find((request) => request.id === selectedRequestId) ?? null;
  const selectedPlan = plans.find((plan) => plan.id === form.studentPlanId);
  const selectedCoupon = coupons.find((coupon) => coupon.code === form.couponCode.trim().toUpperCase()) ?? undefined;
  const previewAmount = useMemo(() => computePreviewAmount(selectedPlan, selectedCoupon, form.planAmountOverride), [selectedPlan, selectedCoupon, form.planAmountOverride]);

  useEffect(() => {
    if (!selectedRequest || mode !== "requests") return;
    setForm((current) => ({
      ...current,
      fullName: current.fullName || selectedRequest.student_name,
      email: current.email || selectedRequest.student_email || "",
      phone: current.phone || selectedRequest.student_phone || "",
      notes: current.notes || selectedRequest.message || "",
    }));
  }, [selectedRequest, mode]);

  async function handleDocumentUpload(kind: "aadhaar" | "school", file: File | null) {
    if (!file) return;
    setUploadingDoc(kind);
    setError(null);
    try {
      const url = await uploadAdmissionDocument(file);
      setForm((current) => ({
        ...current,
        aadhaarDocumentUrl: kind === "aadhaar" ? url : current.aadhaarDocumentUrl,
        schoolIdDocumentUrl: kind === "school" ? url : current.schoolIdDocumentUrl,
      }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload document.");
    } finally {
      setUploadingDoc(null);
    }
  }

  async function submitAdmission(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    setResult(null);

    try {
      const payload = {
        fullName: form.fullName,
        fatherName: form.fatherName,
        address: form.address,
        className: form.className,
        preparingFor: form.preparingFor,
        email: form.email,
        phone: form.phone,
        emergencyContact: form.emergencyContact,
        studentPlanId: form.studentPlanId,
        planAmountOverride: form.planAmountOverride ? Number(form.planAmountOverride) : undefined,
        durationMonthsOverride: form.durationMonthsOverride ? Number(form.durationMonthsOverride) : undefined,
        couponCode: form.couponCode || undefined,
        paymentStatus: form.paymentStatus,
        aadhaarDocumentUrl: form.aadhaarDocumentUrl || undefined,
        schoolIdDocumentUrl: form.schoolIdDocumentUrl || undefined,
        notes: form.notes || undefined,
      };

      const endpoint = mode === "requests" && selectedRequestId ? `/owner/join-requests/${selectedRequestId}/approve` : "/owner/admissions";
      const response = await apiFetch<{ success: boolean; data: AdmissionResult }>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setResult(response.data);
      setMessage(mode === "requests" ? "Join request approved and student added to roster." : "Desk admission created and added to roster.");
      setForm((current) => ({ ...createEmptyForm(), studentPlanId: current.studentPlanId }));
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save admission.");
    } finally {
      setSaving(false);
    }
  }

  async function rejectRequest(requestId: string) {
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/owner/join-requests/${requestId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: "Rejected from admissions desk" }),
      });
      setMessage("Join request rejected.");
      if (selectedRequestId === requestId) {
        setSelectedRequestId(null);
      }
      await load();
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : "Unable to reject request.");
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
      <DashboardCard title="Admissions flow" subtitle="Onboard students from one place, then allot seats later from the student roster.">
        <div className="grid gap-4">
          <div className="rounded-xl bg-[linear-gradient(135deg,#17314f_0%,#285d6d_100%)] p-4 text-white">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">Operator model</p>
            <h3 className="mt-2 text-xl font-black tracking-tight">Plans first. Admissions next. Seats later.</h3>
            <p className="mt-2 text-sm leading-6 text-white/85">
              Admissions now creates the student, assignment, and first ledger entry. Seat allotment happens later from Students.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("desk")}
              className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold ${mode === "desk" ? "border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "border-[var(--lp-border)] bg-white text-[var(--lp-text)]"}`}
            >
              Desk Admission
            </button>
            <button
              type="button"
              onClick={() => setMode("requests")}
              className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold ${mode === "requests" ? "border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "border-[var(--lp-border)] bg-white text-[var(--lp-text)]"}`}
            >
              Join Requests
            </button>
          </div>

          <div className="grid gap-3 rounded-lg border border-[var(--lp-border)] bg-white p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--lp-accent)]">Status rules</p>
            <p className="text-sm text-[var(--lp-text-soft)]">Every admission lands in roster first. Seat status starts as <span className="font-semibold text-[var(--lp-text)]">Seat Unallotted</span>.</p>
          </div>

          {mode === "requests" ? (
            <div className="grid gap-3">
              {requests.map((request) => (
                <div key={request.id} className={`rounded-lg border p-4 ${selectedRequestId === request.id ? "border-[var(--lp-accent)] bg-[var(--lp-accent-soft)]/40" : "border-[var(--lp-border)] bg-white"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--lp-text)]">{request.student_name}</p>
                      <p className="text-sm text-[var(--lp-text-soft)]">{request.student_email ?? request.student_phone ?? request.student_code ?? "Student account"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedRequestId(request.id)}
                      className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--lp-text)]"
                    >
                      Review
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-[var(--lp-text-soft)]">{request.message ?? "No message shared."}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--lp-text-soft)]">
                    <span>{request.requested_via} • {new Date(request.created_at).toLocaleString()}</span>
                    <button type="button" onClick={() => void rejectRequest(request.id)} className="text-rose-600">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
              {requests.length === 0 ? <p className="text-sm text-[var(--lp-text-soft)]">No pending join requests right now.</p> : null}
            </div>
          ) : (
            <div className="grid gap-3 rounded-lg border border-[var(--lp-border)] bg-white p-4 text-sm text-[var(--lp-text-soft)]">
              <p>Use desk admissions for walk-ins, phone enquiries, or direct operator-created students.</p>
              <p>Pick a reusable plan, optionally apply a coupon, set fee status, and save.</p>
            </div>
          )}
        </div>
      </DashboardCard>

      <DashboardCard title={mode === "desk" ? "Desk admission" : "Approve request into admission"} subtitle="The same form powers manual onboarding and request approvals.">
        <form className="grid gap-4" onSubmit={submitAdmission}>
          <div className="grid gap-3 md:grid-cols-2">
            <input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Full name" />
            <input value={form.fatherName} onChange={(event) => setForm((current) => ({ ...current, fatherName: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Guardian / father name" />
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

          <div className="grid gap-3 rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface)] p-4 md:grid-cols-2">
            <select value={form.studentPlanId} onChange={(event) => setForm((current) => ({ ...current, studentPlanId: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none">
              <option value="">Select plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>{plan.name} • Rs. {Number(plan.base_amount).toLocaleString("en-IN")}</option>
              ))}
            </select>
            <input value={form.couponCode} onChange={(event) => setForm((current) => ({ ...current, couponCode: event.target.value.toUpperCase() }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Coupon code (optional)" />
            <input type="number" min="0" value={form.planAmountOverride} onChange={(event) => setForm((current) => ({ ...current, planAmountOverride: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Manual fee override" />
            <input type="number" min="1" value={form.durationMonthsOverride} onChange={(event) => setForm((current) => ({ ...current, durationMonthsOverride: event.target.value }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Duration override (months)" />
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <select value={form.paymentStatus} onChange={(event) => setForm((current) => ({ ...current, paymentStatus: event.target.value as AdmissionFormState["paymentStatus"] }))} className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none">
              <option value="UNPAID">Unpaid</option>
              <option value="DUE">Due</option>
              <option value="PAID">Paid</option>
            </select>
            <div className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--lp-text)]">
              Final amount: Rs. {previewAmount.toLocaleString("en-IN")}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <DocumentUploadField
              id="admission-aadhaar-upload"
              label="Aadhaar upload"
              status={uploadingDoc === "aadhaar" ? "Uploading..." : form.aadhaarDocumentUrl ? "Uploaded" : "Optional"}
              href={form.aadhaarDocumentUrl || undefined}
              onChange={(file) => void handleDocumentUpload("aadhaar", file)}
            />
            <DocumentUploadField
              id="admission-school-upload"
              label="School ID upload"
              status={uploadingDoc === "school" ? "Uploading..." : form.schoolIdDocumentUrl ? "Uploaded" : "Optional"}
              href={form.schoolIdDocumentUrl || undefined}
              onChange={(file) => void handleDocumentUpload("school", file)}
            />
          </div>

          <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-24 rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Operator notes" />

          {selectedPlan ? (
            <div className="rounded-lg border border-[var(--lp-border)] bg-[#f8fbff] p-4 text-sm text-[var(--lp-text-soft)]">
              <p className="font-semibold text-[var(--lp-text)]">{selectedPlan.name}</p>
              <p className="mt-1">{selectedPlan.description ?? "Reusable admission plan."}</p>
              <p className="mt-2">Duration: {form.durationMonthsOverride || selectedPlan.duration_months} month(s) • Base fee: Rs. {Number(form.planAmountOverride || selectedPlan.base_amount).toLocaleString("en-IN")}</p>
            </div>
          ) : null}

          {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
          {result ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-semibold">Assignment {result.assignmentId} created. Payment {result.paymentId} added.</p>
              <p className="mt-1">Plan: {result.planName} • Final amount Rs. {result.finalAmount.toLocaleString("en-IN")}</p>
              {result.temporaryPassword ? (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-white/75 p-3">
                  <p className="font-semibold text-emerald-950">Student portal credentials</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg bg-emerald-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Login ID</p>
                      <p className="mt-1 font-mono text-sm font-bold text-emerald-950">{result.loginId ?? "student code"}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Temporary password</p>
                      <p className="mt-1 font-mono text-sm font-bold text-emerald-950">{result.temporaryPassword}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-emerald-800">
                    Student opens Student Login, selects this library, then enters these credentials.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button disabled={saving} className="rounded-lg border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:opacity-60">
              {saving ? "Saving..." : mode === "desk" ? "Create admission" : "Approve into roster"}
            </button>
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...createEmptyForm(), studentPlanId: current.studentPlanId }))}
              className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--lp-text-soft)]"
            >
              Reset form
            </button>
          </div>
        </form>
      </DashboardCard>
    </div>
  );
}
