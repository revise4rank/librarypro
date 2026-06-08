import { hashPassword } from "../lib/auth";
import { buildPdfBuffer, buildXlsxBuffer } from "../lib/report-exports";
import { requireDb } from "../lib/db";
import { AppError } from "../lib/errors";
import { createOwnerNotificationCampaign } from "./owner-notifications.service";
import { getLibraryEntryQr } from "./checkin.service";
import { OwnerOperationsRepository } from "../repositories/owner-operations.repository";
import { ensureLibraryReferralCode, ensureUserReferralCode, generateUniqueReferralCode } from "../lib/referral-code";
import crypto from "node:crypto";
import type { PoolClient } from "pg";

function repository() {
  return new OwnerOperationsRepository(requireDb());
}

type FloorRoomConfig = {
  id: string;
  name: string;
  type?: "READING_HALL" | "CABIN" | "SILENT_ZONE" | "GROUP_ZONE" | "CUSTOM";
  color: string;
  capacityTarget?: number;
  notes?: string;
  sortOrder?: number;
};

function buildStudentCode(fullName: string) {
  const prefix = fullName
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, "S");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}${suffix}`;
}

function buildTemporaryStudentPassword() {
  return `BL${crypto.randomBytes(3).toString("hex").toUpperCase()}${crypto.randomInt(10, 99)}`;
}

function isWithinDateRange(value: string | null | undefined, fromDate?: string, toDate?: string) {
  if (!value) return false;
  const current = value.slice(0, 10);
  if (fromDate && current < fromDate) return false;
  if (toDate && current > toDate) return false;
  return true;
}

function toMonthKey(value: string | null | undefined) {
  return value ? value.slice(0, 7) : null;
}

function formatCurrency(value: number) {
  return `Rs. ${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function buildMonthSeries(count: number) {
  const months: string[] = [];
  const cursor = new Date();
  cursor.setDate(1);

  for (let index = count - 1; index >= 0; index -= 1) {
    const item = new Date(cursor.getFullYear(), cursor.getMonth() - index, 1);
    months.push(item.toISOString().slice(0, 7));
  }

  return months;
}

export async function listOwnerStudents(libraryId: string) {
  return repository().listStudents(libraryId);
}

export async function listOwnerStudentsPage(input: {
  libraryId: string;
  page: number;
  limit: number;
}) {
  return repository().listStudentsPage(input.libraryId, input.page, input.limit);
}

function mapAdmissionPaymentStatus(status: "PAID" | "UNPAID" | "DUE") {
  if (status === "PAID") return "PAID" as const;
  if (status === "DUE") return "DUE" as const;
  return "PENDING" as const;
}

function computeDiscountedAmount(baseAmount: number, discountType?: string | null, discountValue?: number | null) {
  if (!discountType || !discountValue || discountValue <= 0) {
    return {
      discountType: null,
      discountValue: null,
      finalAmount: baseAmount,
    };
  }

  const computedDiscount =
    discountType === "PERCENTAGE"
      ? Math.min(baseAmount, Math.round((baseAmount * discountValue) / 100))
      : Math.min(baseAmount, discountValue);

  return {
    discountType,
    discountValue: computedDiscount,
    finalAmount: Math.max(0, baseAmount - computedDiscount),
  };
}

async function resolveAdmissionPricing(input: {
  repo: OwnerOperationsRepository;
  client: PoolClient;
  libraryId: string;
  studentPlanId: string;
  couponCode?: string;
  planAmountOverride?: number;
  durationMonthsOverride?: number;
}) {
  const plan = await input.repo.findStudentPlanById(input.client, input.libraryId, input.studentPlanId);
  if (!plan || !plan.is_active) {
    throw new AppError(404, "Student plan not found or inactive", "STUDENT_PLAN_NOT_FOUND");
  }

  const baseAmount = input.planAmountOverride ?? Number(plan.base_amount);
  const durationMonths = input.durationMonthsOverride ?? plan.duration_months;
  let pricing = computeDiscountedAmount(
    baseAmount,
    plan.default_discount_type,
    plan.default_discount_value ? Number(plan.default_discount_value) : null,
  );
  let couponCode: string | null = null;
  let couponId: string | null = null;

  if (input.couponCode) {
    const coupon = await input.repo.findCouponByCode(input.client, input.libraryId, input.couponCode.toUpperCase());
    if (!coupon || !coupon.is_active) {
      throw new AppError(404, "Coupon code not found or inactive", "COUPON_NOT_FOUND");
    }
    if (coupon.student_plan_id && coupon.student_plan_id !== plan.id) {
      throw new AppError(409, "Coupon is not valid for the selected plan", "COUPON_PLAN_MISMATCH");
    }
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      throw new AppError(409, "Coupon is not active yet", "COUPON_NOT_ACTIVE_YET");
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      throw new AppError(409, "Coupon has expired", "COUPON_EXPIRED");
    }
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      throw new AppError(409, "Coupon usage limit reached", "COUPON_LIMIT_REACHED");
    }

    pricing = computeDiscountedAmount(baseAmount, coupon.discount_type, Number(coupon.discount_value));
    couponCode = coupon.code;
    couponId = coupon.id;
  }

  return {
    plan,
    baseAmount,
    durationMonths,
    pricing,
    couponCode,
    couponId,
  };
}

async function createAdmissionRecord(input: {
  libraryId: string;
  actorUserId: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
  fatherName?: string;
  address?: string;
  className?: string;
  preparingFor?: string;
  email?: string;
  phone?: string;
  emergencyContact?: string;
  temporaryPassword?: string;
  studentPlanId: string;
  planAmountOverride?: number;
  durationMonthsOverride?: number;
  couponCode?: string;
  paymentStatus: "PAID" | "UNPAID" | "DUE";
  seatId?: string;
  aadhaarDocumentUrl?: string;
  schoolIdDocumentUrl?: string;
  notes?: string;
  joinRequestId?: string;
  studentUserId?: string;
  admissionSource?: "DESK" | "JOIN_REQUEST";
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const pricing = await resolveAdmissionPricing({
      repo,
      client,
      libraryId: input.libraryId,
      studentPlanId: input.studentPlanId,
      couponCode: input.couponCode,
      planAmountOverride: input.planAmountOverride,
      durationMonthsOverride: input.durationMonthsOverride,
    });
    await ensureLibraryReferralCode(client, input.libraryId);
    if (input.seatId && input.paymentStatus !== "PAID") {
      throw new AppError(409, "Seat allotment is allowed only after payment is marked paid.", "SEAT_ASSIGNMENT_REQUIRES_PAID");
    }
    const selectedSeat = await validateAdmissionSeat({
      repo,
      client,
      libraryId: input.libraryId,
      seatId: input.seatId,
    });

    let student =
      input.studentUserId
        ? {
            id: input.studentUserId,
            full_name: input.fullName,
            email: input.email ?? null,
            phone: input.phone ?? null,
            student_code: null,
            date_of_birth: input.dateOfBirth ?? null,
            gender: input.gender ?? null,
          }
        : await repo.findStudentByEmailOrPhone(client, input.email, input.phone);
    let isNewStudent = false;
    const temporaryPassword = input.temporaryPassword?.trim() || buildTemporaryStudentPassword();

    if (!student) {
      const passwordHash = await hashPassword(temporaryPassword);
      const studentCode = buildStudentCode(input.fullName);
      const referralCode = await generateUniqueReferralCode(client);
      const created = await repo.createStudent(client, {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        studentCode,
        referralCode,
        passwordHash,
      });
      student = {
        id: created.id,
        full_name: input.fullName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        student_code: studentCode,
        date_of_birth: input.dateOfBirth ?? null,
        gender: input.gender ?? null,
      };
      isNewStudent = true;
    } else {
      await repo.updateStudentUser(client, {
        userId: student.id,
        fullName: input.fullName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        dateOfBirth: input.dateOfBirth ?? null,
        gender: input.gender ?? null,
      });
    }

    await repo.ensureStudentRole(client, student.id, input.libraryId);
    await ensureUserReferralCode(client, student.id);

    const startsAtDate = new Date();
    const startsAt = startsAtDate.toISOString();
    const endsAtDate = computePlanEndDate({
      startsAt: startsAtDate,
      planType: pricing.plan.plan_type,
      durationMonths: pricing.durationMonths,
      durationDays: pricing.plan.duration_days,
    });
    const endsAt = endsAtDate.toISOString();

    const assignment = await repo.createAssignment(client, {
      libraryId: input.libraryId,
      studentUserId: student.id,
      seatId: selectedSeat?.id ?? null,
      fatherName: input.fatherName,
      address: input.address,
      className: input.className,
      preparingFor: input.preparingFor,
      emergencyContact: input.emergencyContact,
      studentPlanId: pricing.plan.id,
      planName: pricing.plan.name,
      planPrice: pricing.pricing.finalAmount,
      baseAmount: pricing.baseAmount,
      discountType: pricing.pricing.discountType as "PERCENTAGE" | "FLAT" | null,
      discountValue: pricing.pricing.discountValue,
      couponCode: pricing.couponCode,
      finalAmount: pricing.pricing.finalAmount,
      durationMonths: pricing.durationMonths,
      nextDueDate: endsAt.slice(0, 10),
      startsAt,
      endsAt,
      paymentStatus: mapAdmissionPaymentStatus(input.paymentStatus),
      assignedBy: input.actorUserId,
      aadhaarDocumentUrl: input.aadhaarDocumentUrl,
      schoolIdDocumentUrl: input.schoolIdDocumentUrl,
      admissionSource: input.admissionSource ?? "DESK",
      notes: input.notes,
    });

    if (selectedSeat) {
      await repo.updateSeatStatus(client, selectedSeat.id, "OCCUPIED");
      await repo.refreshLibrarySeatCounts(client, input.libraryId);
    }

    const payment = await repo.createPayment(client, {
      libraryId: input.libraryId,
      studentUserId: student.id,
      assignmentId: assignment.id,
      amount: pricing.pricing.finalAmount,
      status: mapAdmissionPaymentStatus(input.paymentStatus),
      method: input.paymentStatus === "PAID" ? "CASH" : "PENDING_DESK_COLLECTION",
      dueDate: endsAt.slice(0, 10),
      paidAt: input.paymentStatus === "PAID" ? new Date().toISOString() : null,
      referenceNo: null,
      notes: input.notes ?? `Admission created from ${input.admissionSource === "JOIN_REQUEST" ? "join request" : "desk admission"}`,
      createdBy: input.actorUserId,
    });

    if (pricing.couponId) {
      await repo.incrementCouponUsage(client, pricing.couponId);
    }

    if (input.joinRequestId) {
      await repo.updateJoinRequestStatus(client, {
        libraryId: input.libraryId,
        requestId: input.joinRequestId,
        status: "APPROVED",
        reviewedBy: input.actorUserId,
        linkedAssignmentId: assignment.id,
      });
    }

    await client.query("COMMIT");

    return {
      id: assignment.id,
      assignmentId: assignment.id,
      paymentId: payment.id,
      studentUserId: student.id,
      studentCode: (student as { student_code?: string | null }).student_code ?? null,
      loginId: (student as { student_code?: string | null }).student_code ?? student.email ?? student.phone ?? null,
      temporaryPassword: isNewStudent ? temporaryPassword : null,
      isNewStudent,
      planName: pricing.plan.name,
      finalAmount: pricing.pricing.finalAmount,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listOwnerStudentPlans(libraryId: string) {
  return repository().listStudentPlans(libraryId);
}

export async function createOwnerStudentPlan(input: {
  libraryId: string;
  name: string;
  targetAudience?: string;
  description?: string;
  planType?: "MONTHLY" | "DAY_WISE" | "SHIFT_HOURS";
  durationMonths: number;
  durationDays?: number;
  shiftStartTime?: string;
  shiftEndTime?: string;
  allowedHours?: number;
  allowedDays?: string[];
  baseAmount: number;
  defaultDiscountType?: "PERCENTAGE" | "FLAT";
  defaultDiscountValue?: number;
  isActive: boolean;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const plan = await repo.createStudentPlan(client, input);
    await client.query("COMMIT");
    return plan;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateOwnerStudentPlan(input: {
  libraryId: string;
  planId: string;
  name: string;
  targetAudience?: string;
  description?: string;
  planType?: "MONTHLY" | "DAY_WISE" | "SHIFT_HOURS";
  durationMonths: number;
  durationDays?: number;
  shiftStartTime?: string;
  shiftEndTime?: string;
  allowedHours?: number;
  allowedDays?: string[];
  baseAmount: number;
  defaultDiscountType?: "PERCENTAGE" | "FLAT";
  defaultDiscountValue?: number;
  isActive: boolean;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const plan = await repo.updateStudentPlan(client, input);
    if (!plan) {
      throw new AppError(404, "Student plan not found", "STUDENT_PLAN_NOT_FOUND");
    }
    await client.query("COMMIT");
    return plan;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listOwnerCoupons(libraryId: string) {
  return repository().listCoupons(libraryId);
}

export async function createOwnerCoupon(input: {
  libraryId: string;
  studentPlanId?: string;
  code: string;
  discountType: "PERCENTAGE" | "FLAT";
  discountValue: number;
  validFrom?: string;
  validUntil?: string;
  usageLimit?: number;
  isActive: boolean;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const coupon = await repo.createCoupon(client, input);
    await client.query("COMMIT");
    return coupon;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateOwnerCoupon(input: {
  libraryId: string;
  couponId: string;
  studentPlanId?: string;
  code: string;
  discountType: "PERCENTAGE" | "FLAT";
  discountValue: number;
  validFrom?: string;
  validUntil?: string;
  usageLimit?: number;
  isActive: boolean;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const coupon = await repo.updateCoupon(client, input);
    if (!coupon) {
      throw new AppError(404, "Coupon not found", "COUPON_NOT_FOUND");
    }
    await client.query("COMMIT");
    return coupon;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createOwnerAdmission(input: {
  libraryId: string;
  actorUserId: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
  fatherName?: string;
  address?: string;
  className?: string;
  preparingFor?: string;
  email?: string;
  phone?: string;
  emergencyContact?: string;
  temporaryPassword?: string;
  studentPlanId: string;
  planAmountOverride?: number;
  durationMonthsOverride?: number;
  couponCode?: string;
  paymentStatus: "PAID" | "UNPAID" | "DUE";
  seatId?: string;
  aadhaarDocumentUrl?: string;
  schoolIdDocumentUrl?: string;
  notes?: string;
}) {
  return createAdmissionRecord({
    ...input,
    admissionSource: "DESK",
  });
}

export async function createOwnerStudent(input: {
  libraryId: string;
  actorUserId: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
  fatherName?: string;
  address?: string;
  className?: string;
  preparingFor?: string;
  email?: string;
  phone?: string;
  emergencyContact?: string;
  planName: string;
  planPrice: number;
  durationMonths: number;
  nextDueDate?: string;
  startsAt: string;
  endsAt: string;
  paymentStatus: "PENDING" | "PAID" | "DUE" | "FAILED" | "REFUNDED";
  aadhaarDocumentUrl?: string;
  schoolIdDocumentUrl?: string;
  notes?: string;
  seatId?: string;
}) {
  const status = input.paymentStatus === "PAID" ? "PAID" : input.paymentStatus === "DUE" ? "DUE" : "UNPAID";
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    let student = await repo.findStudentByEmailOrPhone(client, input.email, input.phone);
    let isNewStudent = false;
    const temporaryPassword = "changeme123";
    if (!student) {
      const passwordHash = await hashPassword(temporaryPassword);
      const studentCode = buildStudentCode(input.fullName);
      const referralCode = await generateUniqueReferralCode(client);
      const created = await repo.createStudent(client, {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        studentCode,
        referralCode,
        passwordHash,
      });
      student = {
        id: created.id,
        full_name: input.fullName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        student_code: studentCode,
        date_of_birth: input.dateOfBirth ?? null,
        gender: input.gender ?? null,
      };
      isNewStudent = true;
    } else {
      await repo.updateStudentUser(client, {
        userId: student.id,
        fullName: input.fullName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        dateOfBirth: input.dateOfBirth ?? null,
        gender: input.gender ?? null,
      });
    }

    await repo.ensureStudentRole(client, student.id, input.libraryId);
    await ensureUserReferralCode(client, student.id);

    const assignment = await repo.createAssignment(client, {
      libraryId: input.libraryId,
      studentUserId: student.id,
      seatId: null,
      fatherName: input.fatherName,
      address: input.address,
      className: input.className,
      preparingFor: input.preparingFor,
      emergencyContact: input.emergencyContact,
      planName: input.planName,
      planPrice: input.planPrice,
      baseAmount: input.planPrice,
      finalAmount: input.planPrice,
      durationMonths: input.durationMonths,
      nextDueDate: input.nextDueDate,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      paymentStatus: mapAdmissionPaymentStatus(status),
      assignedBy: input.actorUserId,
      aadhaarDocumentUrl: input.aadhaarDocumentUrl,
      schoolIdDocumentUrl: input.schoolIdDocumentUrl,
      admissionSource: "DESK",
      notes: input.notes,
    });

    await client.query("COMMIT");
    return {
      id: assignment.id,
      studentUserId: student.id,
      loginId: (student as { student_code?: string | null }).student_code ?? student.email ?? student.phone ?? null,
      temporaryPassword: isNewStudent ? temporaryPassword : null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateOwnerStudent(input: {
  libraryId: string;
  assignmentId: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
  fatherName?: string;
  address?: string;
  className?: string;
  preparingFor?: string;
  email?: string;
  phone?: string;
  emergencyContact?: string;
  studentPlanId?: string;
  planName: string;
  planPrice: number;
  durationMonths: number;
  nextDueDate?: string;
  startsAt: string;
  endsAt: string;
  paymentStatus: "PENDING" | "PAID" | "DUE" | "FAILED" | "REFUNDED";
  aadhaarDocumentUrl?: string;
  schoolIdDocumentUrl?: string;
  notes?: string;
  seatId?: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const assignment = await repo.findAssignmentById(client, input.libraryId, input.assignmentId);
    if (!assignment) {
      throw new AppError(404, "Student assignment not found", "ASSIGNMENT_NOT_FOUND");
    }

    await repo.updateStudentUser(client, {
      userId: assignment.student_user_id,
      fullName: input.fullName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      gender: input.gender ?? null,
    });

    await repo.updateAssignment(client, {
      assignmentId: input.assignmentId,
      seatId: assignment.seat_id,
      planName: input.planName,
      planPrice: input.planPrice,
      fatherName: input.fatherName,
      address: input.address,
      className: input.className,
      preparingFor: input.preparingFor,
      emergencyContact: input.emergencyContact,
      studentPlanId: input.studentPlanId,
      baseAmount: input.planPrice,
      finalAmount: input.planPrice,
      durationMonths: input.durationMonths,
      nextDueDate: input.nextDueDate,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      paymentStatus: input.paymentStatus,
      aadhaarDocumentUrl: input.aadhaarDocumentUrl,
      schoolIdDocumentUrl: input.schoolIdDocumentUrl,
      notes: input.notes,
    });

    await client.query("COMMIT");
    return { id: input.assignmentId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteOwnerStudent(input: {
  libraryId: string;
  assignmentId: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const assignment = await repo.findAssignmentById(client, input.libraryId, input.assignmentId);
    if (!assignment) {
      throw new AppError(404, "Student assignment not found", "ASSIGNMENT_NOT_FOUND");
    }

    await repo.cancelAssignment(client, input.assignmentId);
    if (assignment.seat_id) {
      await repo.updateSeatStatus(client, assignment.seat_id, "AVAILABLE");
    }
    await repo.refreshLibrarySeatCounts(client, input.libraryId);

    await client.query("COMMIT");
    return { id: input.assignmentId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listOwnerPayments(libraryId: string) {
  return repository().listPayments(libraryId);
}

export async function listOwnerPaymentsPage(input: {
  libraryId: string;
  page: number;
  limit: number;
}) {
  return repository().listPaymentsPage(input.libraryId, input.page, input.limit);
}

export async function createOwnerPayment(input: {
  libraryId: string;
  actorUserId: string;
  assignmentId: string;
  amount: number;
  method: string;
  status: "PENDING" | "PAID" | "DUE" | "FAILED" | "REFUNDED";
  dueDate?: string;
  paidAt?: string;
  referenceNo?: string;
  notes?: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const assignment = await repo.findAssignmentById(client, input.libraryId, input.assignmentId);
    if (!assignment) {
      throw new AppError(404, "Student assignment not found in this library", "ASSIGNMENT_NOT_FOUND");
    }

    const payment = await repo.createPayment(client, {
      libraryId: input.libraryId,
      studentUserId: assignment.student_user_id,
      assignmentId: assignment.id,
      amount: input.amount,
      status: input.status,
      method: input.method,
      dueDate: input.dueDate || undefined,
      paidAt: input.paidAt || (input.status === "PAID" ? new Date().toISOString() : undefined),
      referenceNo: input.referenceNo,
      notes: input.notes,
      createdBy: input.actorUserId,
    });

    await client.query("COMMIT");
    return payment;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateOwnerPayment(input: {
  libraryId: string;
  paymentId: string;
  amount: number;
  method: string;
  status: "PENDING" | "PAID" | "DUE" | "FAILED" | "REFUNDED";
  dueDate?: string;
  paidAt?: string;
  referenceNo?: string;
  notes?: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const payment = await repo.findPaymentById(client, input.libraryId, input.paymentId);
    if (!payment) {
      throw new AppError(404, "Payment not found", "PAYMENT_NOT_FOUND");
    }

    await repo.updatePayment(client, {
      paymentId: input.paymentId,
      amount: input.amount,
      status: input.status,
      method: input.method,
      dueDate: input.dueDate || undefined,
      paidAt: input.paidAt || (input.status === "PAID" ? new Date().toISOString() : undefined),
      referenceNo: input.referenceNo,
      notes: input.notes,
    });
    await client.query("COMMIT");
    return { id: input.paymentId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listOwnerSeats(input: {
  libraryId: string;
  floorId?: string | null;
  roomId?: string | null;
  status?: string | null;
  availableOnly?: boolean;
}) {
  return repository().listSeats(input.libraryId, input);
}

export async function listOwnerFloors(libraryId: string) {
  return repository().listFloors(libraryId);
}

export async function listOwnerRooms(input: { libraryId: string; floorId?: string | null }) {
  return repository().listRooms(input.libraryId, input.floorId);
}

export async function createOwnerRoom(input: {
  libraryId: string;
  floorId: string;
  name: string;
  sortOrder?: number;
  seatCount?: number;
  seatPrefix?: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const room = await repo.createRoom(client, {
      libraryId: input.libraryId,
      floorId: input.floorId,
      name: input.name,
      sortOrder: input.sortOrder ?? 0,
      status: "ACTIVE",
    });

    const createdSeatNumbers: string[] = [];
    const seatCount = Math.max(0, input.seatCount ?? 0);
    if (seatCount > 0) {
      const prefix = input.seatPrefix?.trim() || input.name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase() || "R";
      for (let index = 0; index < seatCount; index += 1) {
        const seat = await repo.createSeat(client, {
          libraryId: input.libraryId,
          floorId: input.floorId,
          roomId: room.id,
          seatNumber: `${prefix}${index + 1}`,
          sectionName: input.name,
          rowNo: Math.floor(index / 6) + 1,
          colNo: (index % 6) + 1,
        });
        createdSeatNumbers.push(seat.seat_number);
      }
      await repo.refreshLibrarySeatCounts(client, input.libraryId);
    }

    await client.query("COMMIT");
    return { ...room, createdSeatNumbers, createdCount: createdSeatNumbers.length };
  } catch (error) {
    await client.query("ROLLBACK");
    if ((error as { code?: string })?.code === "23505") {
      throw new AppError(409, "Room or seat number already exists", "ROOM_OR_SEAT_ALREADY_EXISTS");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function updateOwnerRoom(input: {
  libraryId: string;
  roomId: string;
  name?: string;
  sortOrder?: number;
  status?: "ACTIVE" | "INACTIVE";
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const room = await repo.updateRoom(client, input);
    if (!room) throw new AppError(404, "Room not found", "ROOM_NOT_FOUND");
    await client.query("COMMIT");
    return room;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createOwnerFloor(input: {
  libraryId: string;
  name: string;
  floorNumber: number;
  layoutColumns: number;
  layoutRows: number;
  layoutMeta?: { aisleCells?: string[]; sectionColors?: Record<string, string>; rooms?: FloorRoomConfig[] } | null;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const existing = await repo.findFloorByNumber(client, input.libraryId, input.floorNumber);
    if (existing) {
      throw new AppError(409, "Floor number already exists", "FLOOR_ALREADY_EXISTS");
    }

    const floor = await repo.createFloor(client, input);
    await client.query("COMMIT");
    return floor;
  } catch (error) {
    await client.query("ROLLBACK");
    if ((error as { code?: string })?.code === "23505") {
      throw new AppError(409, "Floor number already exists", "FLOOR_ALREADY_EXISTS");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function updateOwnerFloor(input: {
  libraryId: string;
  floorId: string;
  name?: string;
  layoutColumns?: number;
  layoutRows?: number;
  layoutMeta?: { aisleCells?: string[]; sectionColors?: Record<string, string>; rooms?: FloorRoomConfig[] } | null;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const floor = await repo.updateFloor(client, {
      libraryId: input.libraryId,
      floorId: input.floorId,
      name: input.name || undefined,
      layoutColumns: input.layoutColumns,
      layoutRows: input.layoutRows,
      layoutMeta: input.layoutMeta ?? null,
    });
    if (!floor) {
      throw new AppError(404, "Floor not found", "FLOOR_NOT_FOUND");
    }
    await client.query("COMMIT");
    return floor;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createOwnerSeats(input: {
  libraryId: string;
  floorId?: string | null;
  roomId?: string | null;
  sectionName: string;
  seatPrefix: string;
  customSeatCode?: string | null;
  startNumber: number;
  seatCount: number;
  rowStart: number;
  colStart: number;
  columnsPerRow: number;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const createdSeatNumbers: string[] = [];
    let sectionName = input.sectionName;
    if (input.roomId) {
      const room = await repo.findRoomById(client, input.libraryId, input.roomId);
      if (!room) throw new AppError(404, "Room not found", "ROOM_NOT_FOUND");
      if (input.floorId && room.floor_id !== input.floorId) {
        throw new AppError(409, "Room does not belong to selected floor", "ROOM_FLOOR_MISMATCH");
      }
      sectionName = room.name;
    }

    for (let index = 0; index < input.seatCount; index += 1) {
      const seatNumber =
        input.customSeatCode && input.seatCount === 1
          ? input.customSeatCode
          : `${input.seatPrefix}${input.startNumber + index}`;
      const rowNo = input.rowStart + Math.floor(index / input.columnsPerRow);
      const colNo = input.colStart + (index % input.columnsPerRow);
      const seat = await repo.createSeat(client, {
        libraryId: input.libraryId,
        floorId: input.floorId ?? null,
        roomId: input.roomId ?? null,
        seatNumber,
        sectionName,
        rowNo,
        colNo,
      });
      createdSeatNumbers.push(seat.seat_number);
    }

    await repo.refreshLibrarySeatCounts(client, input.libraryId);
    await client.query("COMMIT");
    return { createdCount: createdSeatNumbers.length, seatNumbers: createdSeatNumbers };
  } catch (error) {
    await client.query("ROLLBACK");
    if ((error as { code?: string })?.code === "23505") {
      throw new AppError(409, "Seat number already exists. Change prefix or start number.", "SEAT_ALREADY_EXISTS");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function assignSeatToStudent(input: {
  libraryId: string;
  assignmentId: string;
  seatId: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const assignment = await repo.findAssignmentById(client, input.libraryId, input.assignmentId);
    if (!assignment) {
      throw new AppError(404, "Student assignment not found", "ASSIGNMENT_NOT_FOUND");
    }
    if (assignment.payment_status !== "PAID") {
      throw new AppError(409, "Seat allotment is allowed only after payment is marked paid.", "SEAT_ASSIGNMENT_REQUIRES_PAID");
    }

    const seat = await repo.findSeatById(client, input.libraryId, input.seatId);
    if (!seat) {
      throw new AppError(404, "Seat not found", "SEAT_NOT_FOUND");
    }
    if (seat.status === "DISABLED") {
      throw new AppError(409, "Disabled seat cannot be assigned", "SEAT_DISABLED");
    }

    const occupant = await repo.findActiveAssignmentBySeatId(client, input.libraryId, input.seatId);
    if (occupant && occupant.id !== input.assignmentId) {
      throw new AppError(409, "Seat is already assigned", "SEAT_ALREADY_OCCUPIED");
    }

    if (assignment.seat_id && assignment.seat_id !== input.seatId) {
      await repo.updateSeatStatus(client, assignment.seat_id, "AVAILABLE");
    }

    await repo.updateSeatStatus(client, input.seatId, "OCCUPIED");
    await repo.updateAssignmentSeat(client, input.assignmentId, input.seatId);
    await repo.refreshLibrarySeatCounts(client, input.libraryId);

    await client.query("COMMIT");
    return { seatId: input.seatId, assignmentId: input.assignmentId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function unassignSeatFromStudent(input: {
  libraryId: string;
  assignmentId: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const assignment = await repo.findAssignmentById(client, input.libraryId, input.assignmentId);
    if (!assignment) {
      throw new AppError(404, "Student assignment not found", "ASSIGNMENT_NOT_FOUND");
    }
    if (assignment.seat_id) {
      await repo.updateSeatStatus(client, assignment.seat_id, "AVAILABLE");
      await repo.clearAssignmentSeat(client, input.assignmentId);
      await repo.refreshLibrarySeatCounts(client, input.libraryId);
    }
    await client.query("COMMIT");
    return { assignmentId: input.assignmentId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateOwnerSeat(input: {
  libraryId: string;
  seatId: string;
  seatCode?: string;
  sectionName?: string;
  status?: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "DISABLED";
  reservedUntil?: string;
  posX?: number;
  posY?: number;
  markFree?: boolean;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const seat = await repo.findSeatById(client, input.libraryId, input.seatId);
    if (!seat) {
      throw new AppError(404, "Seat not found", "SEAT_NOT_FOUND");
    }

    if (input.markFree) {
      const assignment = await repo.findActiveAssignmentBySeatId(client, input.libraryId, input.seatId);
      if (assignment) {
        await repo.clearAssignmentSeat(client, assignment.id);
      }
      await repo.updateSeat(client, {
        seatId: input.seatId,
        status: "AVAILABLE",
        reservedUntil: null,
        seatCode: input.seatCode || undefined,
        sectionName: input.sectionName || undefined,
        posX: input.posX,
        posY: input.posY,
      });
    } else {
      await repo.updateSeat(client, {
        seatId: input.seatId,
        seatCode: input.seatCode || undefined,
        sectionName: input.sectionName || undefined,
        status: input.status,
        reservedUntil: input.status === "RESERVED" ? input.reservedUntil || null : null,
        posX: input.posX,
        posY: input.posY,
      });
    }

    await repo.refreshLibrarySeatCounts(client, input.libraryId);
    await client.query("COMMIT");
    return { id: input.seatId };
  } catch (error) {
    await client.query("ROLLBACK");
    if ((error as { code?: string })?.code === "23505") {
      throw new AppError(409, "Seat code already exists", "SEAT_CODE_EXISTS");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function listOwnerNotifications(libraryId: string) {
  return repository().listNotifications(libraryId);
}

export async function listOwnerNotificationsPage(input: {
  libraryId: string;
  page: number;
  limit: number;
}) {
  return repository().listNotificationsPage(input.libraryId, input.page, input.limit);
}

export async function getOwnerCheckinRegister(input: {
  libraryId: string;
  status?: "ALL" | "INSIDE" | "COMPLETED" | "OVERSTAY";
  search?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const repo = repository();
  const [rows, summary] = await Promise.all([
    repo.listOwnerCheckins(input.libraryId, {
      status: input.status,
      search: input.search,
      fromDate: input.fromDate,
      toDate: input.toDate,
    }),
    repo.getOwnerCheckinSummary(input.libraryId),
  ]);

  return {
    summary: {
      currentlyInside: Number(summary.currently_inside),
      todayCheckins: Number(summary.today_checkins),
      overstay: Number(summary.overstay),
      latestDay: summary.latest_day ?? new Date().toISOString().slice(0, 10),
    },
    rows,
  };
}

export async function getOwnerCheckinRegisterPage(input: {
  libraryId: string;
  status?: "ALL" | "INSIDE" | "COMPLETED" | "OVERSTAY";
  search?: string;
  fromDate?: string;
  toDate?: string;
  page: number;
  limit: number;
}) {
  const repo = repository();
  const [paged, summary] = await Promise.all([
    repo.listOwnerCheckinsPage(
      input.libraryId,
      {
        status: input.status,
        search: input.search,
        fromDate: input.fromDate,
        toDate: input.toDate,
      },
      input.page,
      input.limit,
    ),
    repo.getOwnerCheckinSummary(input.libraryId),
  ]);

  return {
    summary: {
      currentlyInside: Number(summary.currently_inside),
      todayCheckins: Number(summary.today_checkins),
      overstay: Number(summary.overstay),
      latestDay: summary.latest_day ?? new Date().toISOString().slice(0, 10),
    },
    rows: paged.rows,
    total: paged.total,
    page: paged.page,
    limit: paged.limit,
  };
}

function computePlanEndDate(input: {
  startsAt: Date;
  planType?: string | null;
  durationMonths: number;
  durationDays?: number | null;
}) {
  const endsAtDate = new Date(input.startsAt);
  if (input.planType === "DAY_WISE" && input.durationDays && input.durationDays > 0) {
    endsAtDate.setDate(endsAtDate.getDate() + input.durationDays);
    return endsAtDate;
  }
  endsAtDate.setMonth(endsAtDate.getMonth() + input.durationMonths);
  return endsAtDate;
}

async function validateAdmissionSeat(input: {
  repo: OwnerOperationsRepository;
  client: PoolClient;
  libraryId: string;
  seatId?: string | null;
}) {
  if (!input.seatId) return null;
  const seat = await input.repo.findSeatById(input.client, input.libraryId, input.seatId);
  if (!seat) {
    throw new AppError(404, "Seat not found", "SEAT_NOT_FOUND");
  }
  if (seat.status === "DISABLED") {
    throw new AppError(409, "Disabled seat cannot be assigned", "SEAT_DISABLED");
  }
  const occupant = await input.repo.findActiveAssignmentBySeatId(input.client, input.libraryId, input.seatId);
  if (occupant) {
    throw new AppError(409, "Seat is already assigned", "SEAT_ALREADY_OCCUPIED");
  }
  return seat;
}

export async function listOwnerManualAttendanceStudents(libraryId: string) {
  const db = requireDb();
  const result = await db.query<{
    student_user_id: string;
    assignment_id: string;
    student_name: string;
    seat_number: string | null;
    currently_inside: boolean;
  }>(
    `
      SELECT
        sa.student_user_id::text,
        sa.id::text AS assignment_id,
        u.full_name AS student_name,
        s.seat_number,
        EXISTS (
          SELECT 1
          FROM checkins c
          WHERE c.library_id = sa.library_id
            AND c.student_user_id = sa.student_user_id
            AND c.checked_out_at IS NULL
        ) AS currently_inside
      FROM student_assignments sa
      INNER JOIN users u ON u.id = sa.student_user_id
      LEFT JOIN seats s ON s.id = sa.seat_id
      WHERE sa.library_id = $1
        AND sa.status = 'ACTIVE'
      ORDER BY u.full_name ASC
      LIMIT 500
    `,
    [libraryId],
  );

  return result.rows;
}

export async function createOwnerManualAttendance(input: {
  libraryId: string;
  actorUserId: string;
  studentUserId: string;
  action: "AUTO" | "CHECKIN" | "CHECKOUT";
}) {
  const db = requireDb();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const assignmentResult = await client.query<{
      assignment_id: string;
      student_name: string;
      seat_id: string | null;
      seat_number: string | null;
    }>(
      `
        SELECT
          sa.id::text AS assignment_id,
          u.full_name AS student_name,
          sa.seat_id::text,
          s.seat_number
        FROM student_assignments sa
        INNER JOIN users u ON u.id = sa.student_user_id
        LEFT JOIN seats s ON s.id = sa.seat_id
        WHERE sa.library_id = $1
          AND sa.student_user_id = $2
          AND sa.status = 'ACTIVE'
        ORDER BY sa.created_at DESC
        LIMIT 1
      `,
      [input.libraryId, input.studentUserId],
    );
    const assignment = assignmentResult.rows[0];
    if (!assignment) {
      throw new AppError(404, "Active student not found for this library.", "STUDENT_NOT_ACTIVE");
    }

    const openResult = await client.query<{ id: string }>(
      `
        SELECT id::text
        FROM checkins
        WHERE library_id = $1
          AND student_user_id = $2
          AND checked_out_at IS NULL
        ORDER BY checked_in_at DESC
        LIMIT 1
      `,
      [input.libraryId, input.studentUserId],
    );
    const openCheckin = openResult.rows[0];

    if ((input.action === "AUTO" && openCheckin) || input.action === "CHECKOUT") {
      if (!openCheckin) {
        throw new AppError(409, "Student is not currently checked in.", "MANUAL_CHECKOUT_NOT_ALLOWED");
      }
      const result = await client.query<{ id: string; checked_out_at: string }>(
        `
          UPDATE checkins
          SET checked_out_at = NOW(), updated_at = NOW()
          WHERE id = $1
          RETURNING id::text, checked_out_at::text
        `,
        [openCheckin.id],
      );
      await client.query("COMMIT");
      return {
        id: result.rows[0].id,
        action: "CHECKOUT" as const,
        studentName: assignment.student_name,
        seatNumber: assignment.seat_number,
        checkedOutAt: result.rows[0].checked_out_at,
      };
    }

    if (openCheckin) {
      throw new AppError(409, "Student is already checked in.", "MANUAL_CHECKIN_NOT_ALLOWED");
    }

    const result = await client.query<{ id: string; checked_in_at: string }>(
      `
        INSERT INTO checkins (
          library_id,
          student_user_id,
          assignment_id,
          seat_id,
          mode,
          client_event_id,
          checked_in_at,
          device_time,
          qr_key_id
        )
        VALUES ($1, $2, $3, $4, 'MANUAL', gen_random_uuid(), NOW(), NOW(), gen_random_uuid())
        RETURNING id::text, checked_in_at::text
      `,
      [input.libraryId, input.studentUserId, assignment.assignment_id, assignment.seat_id],
    );
    await client.query("COMMIT");
    return {
      id: result.rows[0].id,
      action: "CHECKIN" as const,
      studentName: assignment.student_name,
      seatNumber: assignment.seat_number,
      checkedInAt: result.rows[0].checked_in_at,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createOwnerNotification(input: {
  libraryId: string;
  actorUserId: string;
  title: string;
  type: "PAYMENT_REMINDER" | "EXPIRY_ALERT" | "GENERAL";
  audience: "ALL_STUDENTS" | "DUE_STUDENTS" | "EXPIRING_STUDENTS";
  message: string;
}) {
  return createOwnerNotificationCampaign(input);
}

export async function listStudentPayments(input: {
  libraryId: string;
  studentUserId: string;
}) {
  const repo = repository();
  const [payments, assignment] = await Promise.all([
    repo.listStudentPayments(input.libraryId, input.studentUserId),
    requireDb().connect().then(async (client) => {
      try {
        return await repo.findStudentAssignmentForUser(client, input.libraryId, input.studentUserId);
      } finally {
        client.release();
      }
    }),
  ]);

  return {
    summary: {
      seatNumber: assignment?.seat_number ?? null,
      planName: assignment?.plan_name ?? null,
      validityEnd: assignment?.ends_at ?? null,
      paymentStatus: assignment?.payment_status ?? null,
      totalDue: payments
        .filter((payment) => payment.status === "DUE" || payment.status === "PENDING")
        .reduce((acc, payment) => acc + Number(payment.amount), 0),
    },
    payments,
  };
}

export async function listStudentPaymentsPage(input: {
  libraryId: string;
  studentUserId: string;
  page: number;
  limit: number;
}) {
  const repo = repository();
  const [paymentsPage, assignment] = await Promise.all([
    repo.listStudentPaymentsPage(input.libraryId, input.studentUserId, input.page, input.limit),
    requireDb().connect().then(async (client) => {
      try {
        return await repo.findStudentAssignmentForUser(client, input.libraryId, input.studentUserId);
      } finally {
        client.release();
      }
    }),
  ]);

  return {
    summary: {
      seatNumber: assignment?.seat_number ?? null,
      planName: assignment?.plan_name ?? null,
      validityEnd: assignment?.ends_at ?? null,
      paymentStatus: assignment?.payment_status ?? null,
      totalDue: paymentsPage.rows
        .filter((payment) => payment.status === "DUE" || payment.status === "PENDING")
        .reduce((acc, payment) => acc + Number(payment.amount), 0),
    },
    payments: paymentsPage.rows,
    total: paymentsPage.total,
    page: paymentsPage.page,
    limit: paymentsPage.limit,
  };
}

export async function payStudentPayment(input: {
  libraryId: string;
  studentUserId: string;
  paymentId: string;
  method: string;
  referenceNo?: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const payment = await repo.findPaymentById(client, input.libraryId, input.paymentId);
    if (!payment || payment.student_user_id !== input.studentUserId) {
      throw new AppError(404, "Payment not found", "PAYMENT_NOT_FOUND");
    }

    await repo.updatePayment(client, {
      paymentId: input.paymentId,
      amount: Number(payment.amount),
      status: "PAID",
      method: input.method,
      paidAt: new Date().toISOString(),
      referenceNo: input.referenceNo,
    });

    await client.query("COMMIT");
    return { id: input.paymentId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getStudentPaymentReceipt(input: {
  libraryId: string;
  studentUserId: string;
  paymentId: string;
}) {
  const rows = await repository().listStudentPayments(input.libraryId, input.studentUserId);
  const payment = rows.find((row) => row.id === input.paymentId);
  if (!payment) {
    throw new AppError(404, "Receipt not found", "RECEIPT_NOT_FOUND");
  }

  return {
    receiptNo: `NL-${payment.id.slice(0, 8).toUpperCase()}`,
    verificationId: `VERIFY-${payment.id.slice(0, 12).toUpperCase()}`,
    issuedAt: payment.paid_at ?? payment.created_at,
    studentName: payment.student_name,
    amount: payment.amount,
    method: payment.method,
    status: payment.status,
    referenceNo: payment.reference_no,
    notes: payment.notes,
  };
}

export async function getOwnerPaymentReceipt(input: {
  libraryId: string;
  paymentId: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    const payment = await repo.getPaymentReceiptById(client, input.libraryId, input.paymentId);
    if (!payment) {
      throw new AppError(404, "Receipt not found", "RECEIPT_NOT_FOUND");
    }

    return {
      receiptNo: `NL-${payment.id.slice(0, 8).toUpperCase()}`,
      verificationId: `VERIFY-${payment.id.slice(0, 12).toUpperCase()}`,
      issuedAt: payment.paid_at ?? payment.created_at,
      studentName: payment.student_name,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      referenceNo: payment.reference_no,
      dueDate: payment.due_date,
      notes: payment.notes,
    };
  } finally {
    client.release();
  }
}

export async function exportOwnerPaymentReceipt(input: {
  libraryId: string;
  paymentId: string;
}) {
  const receipt = await getOwnerPaymentReceipt(input);
  return buildPdfBuffer({
    title: "BookLib Payment Receipt",
    subtitle: receipt.receiptNo,
    summary: [
      { label: "Student", value: receipt.studentName },
      { label: "Amount", value: `Rs. ${receipt.amount}` },
      { label: "Status", value: receipt.status },
      { label: "Method", value: receipt.method },
      { label: "Issued", value: receipt.issuedAt },
      { label: "Verification ID", value: receipt.verificationId },
      { label: "Reference", value: receipt.referenceNo ?? "Desk entry" },
    ],
    tables: [
      {
        title: "Receipt details",
        rows: [
          {
            receiptNo: receipt.receiptNo,
            dueDate: receipt.dueDate ?? "N/A",
            notes: receipt.notes ?? "",
          },
        ],
      },
    ],
  });
}

export async function listStudentNotifications(input: {
  libraryId: string;
  studentUserId: string;
}) {
  return repository().listStudentNotifications(input.libraryId, input.studentUserId);
}

export async function listStudentNotificationsPage(input: {
  libraryId: string;
  studentUserId: string;
  page: number;
  limit: number;
}) {
  return repository().listStudentNotificationsPage(
    input.libraryId,
    input.studentUserId,
    input.page,
    input.limit,
  );
}

export async function getStudentFocusTracker(input: {
  studentUserId: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    const [goals, subjects, sessions] = await Promise.all([
      repo.getStudentFocusGoals(client, input.studentUserId),
      repo.listStudentFocusSubjects(client, input.studentUserId),
      repo.listStudentFocusSessions(client, input.studentUserId),
    ]);

    return {
      goals: goals ?? {
        daily_target_minutes: 180,
        weekly_target_hours: 28,
      },
      subjects,
      sessions,
      totals: {
        todayMinutes: sessions
          .filter((session) => session.completed_at.slice(0, 10) === new Date().toISOString().slice(0, 10))
          .reduce((acc, session) => acc + Number(session.duration_minutes), 0),
        weeklyMinutes: sessions
          .filter((session) => {
            const diff = Date.now() - new Date(session.completed_at).getTime();
            return diff <= 7 * 24 * 60 * 60 * 1000;
          })
          .reduce((acc, session) => acc + Number(session.duration_minutes), 0),
      },
    };
  } finally {
    client.release();
  }
}

export async function updateStudentFocusGoals(input: {
  studentUserId: string;
  dailyTargetMinutes: number;
  weeklyTargetHours: number;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    return await repo.upsertStudentFocusGoals(client, input);
  } finally {
    client.release();
  }
}

export async function createStudentFocusSubject(input: {
  studentUserId: string;
  subjectName: string;
  topicName?: string;
  targetMinutes: number;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    return await repo.createStudentFocusSubject(client, {
      studentUserId: input.studentUserId,
      subjectName: input.subjectName,
      topicName: input.topicName,
      targetMinutes: input.targetMinutes,
    });
  } finally {
    client.release();
  }
}

export async function createStudentFocusSession(input: {
  studentUserId: string;
  subjectId?: string;
  topicTitle?: string;
  durationMinutes: number;
  sessionType: "POMODORO" | "MANUAL" | "FOCUS_MODE";
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    return await repo.createStudentFocusSession(client, {
      studentUserId: input.studentUserId,
      subjectId: input.subjectId,
      topicTitle: input.topicTitle,
      durationMinutes: input.durationMinutes,
      sessionType: input.sessionType,
    });
  } finally {
    client.release();
  }
}

export async function getStudentDashboard(input: {
  libraryId: string;
  studentUserId: string;
}) {
  return repository().getStudentLibrarySummary(input.libraryId, input.studentUserId);
}

export async function getAdminDashboard() {
  return repository().getAdminDashboard();
}

export async function listAdminLibraries() {
  return repository().listAdminLibraries();
}

export async function updateAdminLibrary(input: {
  libraryId: string;
  name: string;
  city: string;
  area?: string | null;
  address: string;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  ownerFullName: string;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  ownerActive: boolean;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const updated = await repo.updateAdminLibrary(client, input);
    if (!updated) {
      throw new AppError(404, "Library not found", "LIBRARY_NOT_FOUND");
    }
    await client.query("COMMIT");
    return updated;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getAdminLibraryOverview(libraryId: string) {
  const db = requireDb();
  const [overview, users, students, payments, seats, website, activity] = await Promise.all([
    db.query(
      `
      SELECT
        l.id::text,
        l.name,
        l.slug,
        l.city,
        l.area,
        l.address,
        l.status::text,
        l.total_seats,
        l.available_seats,
        l.starting_price::text,
        l.offer_text,
        l.created_at::text,
        l.updated_at::text,
        u.id::text AS owner_user_id,
        u.full_name AS owner_name,
        u.email AS owner_email,
        u.phone AS owner_phone,
        u.is_active AS owner_active,
        s.plan_name,
        s.plan_code,
        s.status::text AS subscription_status,
        s.current_period_end::date::text,
        COALESCE(stats.active_students, '0') AS active_students,
        COALESCE(stats.admins, '0') AS admins,
        COALESCE(stats.pending_join_requests, '0') AS pending_join_requests,
        COALESCE(stats.unpaid_amount, '0') AS unpaid_amount,
        COALESCE(stats.today_checkins, '0') AS today_checkins
      FROM libraries l
      INNER JOIN users u ON u.id = l.owner_user_id
      LEFT JOIN subscriptions s ON s.library_id = l.id
      LEFT JOIN LATERAL (
        SELECT
          (SELECT COUNT(*)::text FROM student_assignments sa WHERE sa.library_id = l.id AND sa.status = 'ACTIVE') AS active_students,
          (SELECT COUNT(*)::text FROM user_library_roles ulr WHERE ulr.library_id = l.id AND ulr.role = 'LIBRARY_OWNER') AS admins,
          (SELECT COUNT(*)::text FROM library_join_requests ljr WHERE ljr.library_id = l.id AND ljr.status = 'PENDING') AS pending_join_requests,
          (SELECT COALESCE(SUM(amount), 0)::text FROM payments p WHERE p.library_id = l.id AND p.status IN ('DUE', 'PENDING')) AS unpaid_amount,
          (SELECT COUNT(*)::text FROM checkins c WHERE c.library_id = l.id AND c.checked_in_at::date = CURRENT_DATE) AS today_checkins
      ) stats ON TRUE
      WHERE l.id = $1
      LIMIT 1
      `,
      [libraryId],
    ),
    listAdminLibraryUsers(libraryId),
    listAdminLibraryStudents(libraryId),
    listAdminLibraryPayments(libraryId),
    db.query(
      `
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE status = 'AVAILABLE')::text AS available,
        COUNT(*) FILTER (WHERE status = 'OCCUPIED')::text AS occupied,
        COUNT(*) FILTER (WHERE status = 'RESERVED')::text AS reserved,
        COUNT(*) FILTER (WHERE status = 'DISABLED')::text AS disabled
      FROM seats
      WHERE library_id = $1
      `,
      [libraryId],
    ),
    db.query(
      `
      SELECT
        p.subdomain,
        CASE WHEN p.is_published THEN 'Published' ELSE 'Draft' END AS status,
        p.published_at::text,
        p.brand_logo_url,
        p.hero_banner_url,
        p.show_in_marketplace,
        p.listing_published,
        p.site_pages,
        l.slug
      FROM libraries l
      LEFT JOIN libraries_public_profiles p ON p.library_id = l.id
      WHERE l.id = $1
      LIMIT 1
      `,
      [libraryId],
    ),
    listAdminLibraryActivity(libraryId),
  ]);

  const row = overview.rows[0];
  if (!row) {
    throw new AppError(404, "Library not found", "LIBRARY_NOT_FOUND");
  }

  return {
    overview: row,
    users: users.slice(0, 8),
    students: students.slice(0, 8),
    payments: payments.slice(0, 8),
    seats: seats.rows[0] ?? { total: "0", available: "0", occupied: "0", reserved: "0", disabled: "0" },
    website: website.rows[0] ?? null,
    activity: activity.slice(0, 10),
  };
}

export async function listAdminLibraryUsers(libraryId: string) {
  const result = await requireDb().query(
    `
    SELECT
      u.id::text,
      u.full_name,
      u.email,
      u.phone,
      u.global_role::text,
      u.is_active,
      ulr.role::text AS library_role,
      COALESCE(lap.permissions, '[]'::jsonb) AS permissions,
      u.created_at::text,
      (
        SELECT MAX(al.created_at)::text
        FROM audit_logs al
        WHERE al.actor_user_id = u.id
          AND al.action = 'auth.login'
      ) AS last_login_at
    FROM user_library_roles ulr
    INNER JOIN users u ON u.id = ulr.user_id
    LEFT JOIN library_admin_permissions lap ON lap.library_id = ulr.library_id AND lap.user_id = u.id
    WHERE ulr.library_id = $1
    ORDER BY CASE WHEN u.id = (SELECT owner_user_id FROM libraries WHERE id = $1) THEN 0 ELSE 1 END, u.full_name ASC
    LIMIT 100
    `,
    [libraryId],
  );
  return result.rows;
}

export async function listAdminLibraryStudents(libraryId: string) {
  const result = await requireDb().query(
    `
    SELECT
      sa.id::text AS assignment_id,
      u.id::text AS student_user_id,
      u.full_name,
      u.email,
      u.phone,
      u.date_of_birth::date::text AS date_of_birth,
      u.gender,
      u.is_active,
      s.seat_number,
      sa.status::text,
      sa.payment_status::text,
      sa.plan_name,
      sa.plan_price::text,
      sa.starts_at::date::text,
      sa.ends_at::date::text,
      sa.created_at::text
    FROM student_assignments sa
    INNER JOIN users u ON u.id = sa.student_user_id
    LEFT JOIN seats s ON s.id = sa.seat_id
    WHERE sa.library_id = $1
    ORDER BY sa.created_at DESC
    LIMIT 200
    `,
    [libraryId],
  );
  return result.rows;
}

export async function listAdminLibraryPayments(libraryId: string) {
  const result = await requireDb().query(
    `
    SELECT
      p.id::text,
      p.amount::text,
      p.currency,
      p.status::text,
      p.method,
      p.due_date::text,
      p.paid_at::text,
      p.reference_no,
      u.full_name AS student_name,
      p.created_at::text
    FROM payments p
    LEFT JOIN users u ON u.id = p.student_user_id
    WHERE p.library_id = $1
    ORDER BY p.created_at DESC
    LIMIT 200
    `,
    [libraryId],
  );
  return result.rows;
}

export async function listAdminLibraryActivity(libraryId: string) {
  const result = await requireDb().query(
    `
    SELECT
      al.id::text,
      al.action,
      al.entity_type,
      al.entity_id,
      al.metadata,
      al.created_at::text,
      u.full_name AS actor_name
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.actor_user_id
    WHERE al.library_id = $1
    ORDER BY al.created_at DESC
    LIMIT 200
    `,
    [libraryId],
  );
  return result.rows;
}

export async function updateAdminLibraryStatus(input: {
  libraryId: string;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  ownerActive?: boolean;
}) {
  const db = requireDb();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ id: string; owner_user_id: string; status: string }>(
      `
      UPDATE libraries
      SET status = $2::library_status, updated_at = NOW()
      WHERE id = $1
      RETURNING id::text, owner_user_id::text, status::text
      `,
      [input.libraryId, input.status],
    );
    const row = result.rows[0];
    if (!row) {
      throw new AppError(404, "Library not found", "LIBRARY_NOT_FOUND");
    }
    if (typeof input.ownerActive === "boolean") {
      await client.query(
        `
        UPDATE users
        SET is_active = $2, session_version = session_version + 1, updated_at = NOW()
        WHERE id = $1
        `,
        [row.owner_user_id, input.ownerActive],
      );
    }
    await client.query("COMMIT");
    return row;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function archiveAdminLibrary(input: { libraryId: string }) {
  return updateAdminLibraryStatus({ libraryId: input.libraryId, status: "INACTIVE", ownerActive: false });
}

const defaultPlatformPermissionsByRole: Record<string, string[]> = {
  SUPER_ADMIN_FULL: ["TENANTS", "USERS", "PAYMENTS", "PLANS", "CONTENT", "OPS", "SETTINGS", "ACCESS"],
  SUPPORT: ["TENANTS", "USERS", "OPS"],
  FINANCE: ["TENANTS", "PAYMENTS", "PLANS"],
  CONTENT: ["CONTENT", "TENANTS"],
  OPS: ["TENANTS", "USERS", "OPS"],
};

export async function listPlatformAdmins() {
  const result = await requireDb().query(
    `
    SELECT
      u.id::text,
      u.full_name,
      u.email,
      u.phone,
      u.is_active,
      COALESCE(pap.role_code, 'SUPER_ADMIN_FULL') AS role_code,
      COALESCE(pap.permissions, '["TENANTS","USERS","PAYMENTS","PLANS","CONTENT","OPS","SETTINGS","ACCESS"]'::jsonb) AS permissions,
      u.created_at::text,
      (
        SELECT MAX(al.created_at)::text
        FROM audit_logs al
        WHERE al.actor_user_id = u.id
          AND al.action = 'auth.login'
      ) AS last_login_at
    FROM users u
    LEFT JOIN platform_admin_permissions pap ON pap.user_id = u.id
    WHERE u.global_role = 'SUPER_ADMIN'
    ORDER BY u.created_at DESC
    `,
  );
  return result.rows;
}

export async function createPlatformAdmin(input: {
  actorUserId: string;
  fullName: string;
  email?: string;
  phone?: string;
  roleCode: string;
  permissions: string[];
}) {
  if (!input.email && !input.phone) {
    throw new AppError(400, "Email or phone is required", "CONTACT_REQUIRED");
  }
  const db = requireDb();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query("SELECT id FROM users WHERE email = NULLIF($1, '') OR phone = NULLIF($2, '') LIMIT 1", [input.email ?? "", input.phone ?? ""]);
    if (existing.rows[0]) {
      throw new AppError(409, "User already exists with this email or phone", "USER_ALREADY_EXISTS");
    }
    const temporaryPassword = "admin123456";
    const passwordHash = await hashPassword(temporaryPassword);
    const created = await client.query<{ id: string }>(
      `
      INSERT INTO users (full_name, email, phone, password_hash, global_role)
      VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), $4, 'SUPER_ADMIN')
      RETURNING id::text
      `,
      [input.fullName, input.email ?? "", input.phone ?? "", passwordHash],
    );
    const userId = created.rows[0].id;
    await client.query(
      `
      INSERT INTO platform_admin_permissions (user_id, role_code, permissions, created_by, updated_by)
      VALUES ($1, $2, $3::jsonb, $4, $4)
      `,
      [userId, input.roleCode, JSON.stringify(input.permissions.length ? input.permissions : defaultPlatformPermissionsByRole[input.roleCode] ?? []), input.actorUserId],
    );
    await client.query("COMMIT");
    return { userId, temporaryPassword };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePlatformAdmin(input: {
  actorUserId: string;
  userId: string;
  fullName?: string;
  email?: string;
  phone?: string;
  roleCode?: string;
  permissions?: string[];
  isActive?: boolean;
}) {
  if (input.userId === input.actorUserId && input.isActive === false) {
    throw new AppError(409, "You cannot disable your own superadmin access", "SELF_DISABLE_BLOCKED");
  }
  const db = requireDb();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ id: string; full_name: string; email: string | null; phone: string | null; is_active: boolean }>(
      "SELECT id::text, full_name, email, phone, is_active FROM users WHERE id = $1 AND global_role = 'SUPER_ADMIN' LIMIT 1",
      [input.userId],
    );
    const user = existing.rows[0];
    if (!user) {
      throw new AppError(404, "Platform admin not found", "PLATFORM_ADMIN_NOT_FOUND");
    }
    await client.query(
      `
      UPDATE users
      SET
        full_name = COALESCE($2, full_name),
        email = COALESCE(NULLIF($3, ''), email),
        phone = COALESCE(NULLIF($4, ''), phone),
        is_active = COALESCE($5, is_active),
        session_version = CASE WHEN $5 IS NOT NULL AND is_active <> $5 THEN session_version + 1 ELSE session_version END,
        updated_at = NOW()
      WHERE id = $1
      `,
      [input.userId, input.fullName ?? null, input.email ?? null, input.phone ?? null, typeof input.isActive === "boolean" ? input.isActive : null],
    );
    if (input.roleCode || input.permissions) {
      const roleCode = input.roleCode ?? "SUPPORT";
      const permissions = input.permissions ?? defaultPlatformPermissionsByRole[roleCode] ?? [];
      await client.query(
        `
        INSERT INTO platform_admin_permissions (user_id, role_code, permissions, updated_by)
        VALUES ($1, $2, $3::jsonb, $4)
        ON CONFLICT (user_id) DO UPDATE
        SET role_code = EXCLUDED.role_code,
            permissions = EXCLUDED.permissions,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
        `,
        [input.userId, roleCode, JSON.stringify(permissions), input.actorUserId],
      );
    }
    await client.query("COMMIT");
    return { updated: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listAdminPlanSummaries() {
  return repository().listAdminPlanSummaries();
}

export async function updatePlatformPlanConfig(input: {
  planCode: string;
  planName: string;
  amount: number;
  currency: string;
  durationMonths: number;
  seatLimit?: number | null;
  referralBonus: number;
  features: Record<string, boolean>;
  isActive: boolean;
  sortOrder: number;
}) {
  const updated = await repository().updatePlatformPlanConfig(input);
  if (!updated) {
    throw new AppError(404, "Platform plan not found", "PLATFORM_PLAN_NOT_FOUND");
  }
  return updated;
}

export async function listAdminPayments() {
  return repository().listAdminPayments();
}

export async function getPlatformMarketplaceSettings() {
  return repository().getPlatformMarketplaceSettings();
}

export async function updatePlatformMarketplaceSettings(input: {
  headline: string;
  subheadline: string;
  bannerSlides: Array<{
    eyebrow: string;
    title: string;
    cta: string;
    href: string;
    tone: "slate" | "emerald" | "amber" | "blue";
    imageUrl?: string;
  }>;
  updatedByUserId: string;
}) {
  return repository().updatePlatformMarketplaceSettings({
    ...input,
    bannerSlides: input.bannerSlides.map((slide) => ({
      ...slide,
      imageUrl: slide.imageUrl ?? "",
    })),
  });
}

export async function getAdminDataOverview() {
  return repository().getAdminDataOverview();
}

export async function getOwnerDashboard(input: { libraryId: string }) {
  return repository().getOwnerDashboardSummary(input.libraryId);
}

export async function getOwnerReportsSummary(input: {
  libraryId: string;
  fromDate?: string;
  toDate?: string;
}) {
  const repo = repository();
  const [dashboard, students, payments, expenses, checkins] = await Promise.all([
    repo.getOwnerDashboardSummary(input.libraryId),
    repo.listStudents(input.libraryId),
    repo.listPayments(input.libraryId),
    repo.listExpenses(input.libraryId, null),
    repo.listOwnerCheckins(input.libraryId, {
      status: "ALL",
      fromDate: input.fromDate,
      toDate: input.toDate,
    }),
  ]);

  const filteredPayments = payments.filter((payment) =>
    isWithinDateRange(payment.paid_at ?? payment.due_date ?? payment.created_at, input.fromDate, input.toDate),
  );
  const filteredExpenses = expenses.filter((expense) =>
    isWithinDateRange(expense.spent_on, input.fromDate, input.toDate),
  );
  const filteredStudents = students.filter((student) => {
    const basis = student.next_due_date ?? student.ends_at ?? student.starts_at;
    if (!input.fromDate && !input.toDate) return true;
    return isWithinDateRange(basis, input.fromDate, input.toDate);
  });

  const monthlyKeys = buildMonthSeries(6);
  const monthlyComparison = monthlyKeys.map((month) => {
    const revenue = payments
      .filter((payment) => payment.status === "PAID" && toMonthKey(payment.paid_at ?? payment.created_at) === month)
      .reduce((acc, payment) => acc + Number(payment.amount), 0);
    const expenseTotal = expenses
      .filter((expense) => toMonthKey(expense.spent_on) === month)
      .reduce((acc, expense) => acc + Number(expense.amount), 0);

    return {
      month,
      revenue,
      expenses: expenseTotal,
      profit: revenue - expenseTotal,
    };
  });

  const expenseCategoryMap = new Map<string, number>();
  for (const expense of filteredExpenses) {
    expenseCategoryMap.set(expense.category, (expenseCategoryMap.get(expense.category) ?? 0) + Number(expense.amount));
  }

  const paymentCategorySplit = {
    paid: filteredPayments.filter((payment) => payment.status === "PAID").reduce((acc, payment) => acc + Number(payment.amount), 0),
    due: filteredPayments
      .filter((payment) => payment.status === "DUE" || payment.status === "PENDING")
      .reduce((acc, payment) => acc + Number(payment.amount), 0),
    failed: filteredPayments.filter((payment) => payment.status === "FAILED").reduce((acc, payment) => acc + Number(payment.amount), 0),
  };

  return {
    filters: {
      fromDate: input.fromDate ?? null,
      toDate: input.toDate ?? null,
    },
    metrics: {
      totalStudents: students.length,
      filteredStudents: filteredStudents.length,
      paidRevenue: filteredPayments.filter((payment) => payment.status === "PAID").reduce((acc, payment) => acc + Number(payment.amount), 0),
      dueRevenue: filteredPayments
        .filter((payment) => payment.status === "DUE" || payment.status === "PENDING")
        .reduce((acc, payment) => acc + Number(payment.amount), 0),
      expenses: filteredExpenses.reduce((acc, expense) => acc + Number(expense.amount), 0),
      checkins: checkins.length,
      monthlyProfit: Number(dashboard.metrics.monthly_profit),
      occupancyPercent: Number(dashboard.metrics.occupancy_percent),
    },
    monthlyComparison,
    expenseCategorySplit: Array.from(expenseCategoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((left, right) => right.amount - left.amount),
    paymentCategorySplit,
    students,
    payments: filteredPayments,
    expenses: filteredExpenses,
    checkins,
  };
}

export async function exportOwnerReport(input: {
  libraryId: string;
  reportType: "students" | "payments" | "due" | "paid" | "expenses" | "attendance" | "summary";
  format: "xlsx" | "pdf";
  fromDate?: string;
  toDate?: string;
}) {
  const report = await getOwnerReportsSummary({
    libraryId: input.libraryId,
    fromDate: input.fromDate,
    toDate: input.toDate,
  });

  const labelSuffix = [input.fromDate ?? "start", input.toDate ?? "today"].join("_");
  const filenameBase = `${input.reportType}-report-${labelSuffix}`;

  let rows: Array<Record<string, unknown>>;
  let title: string;

  if (input.reportType === "students") {
    title = "Student List";
    rows = report.students.map((row) => ({
      student_name: row.student_name,
      student_code: row.student_code ?? "",
      phone: row.student_phone ?? "",
      date_of_birth: row.date_of_birth ?? "",
      gender: row.gender ?? "",
      seat_number: row.seat_number ?? "",
      plan_name: row.plan_name,
      valid_till: row.ends_at,
      payment_status: row.payment_status,
      due_amount: row.due_amount,
    }));
  } else if (input.reportType === "payments") {
    title = "All Payments";
    rows = report.payments.map((row) => ({
      student_name: row.student_name,
      amount: row.amount,
      method: row.method,
      status: row.status,
      due_date: row.due_date ?? "",
      paid_at: row.paid_at ?? "",
      created_at: row.created_at,
    }));
  } else if (input.reportType === "due") {
    title = "Due Payments";
    rows = report.payments
      .filter((row) => row.status === "DUE" || row.status === "PENDING")
      .map((row) => ({
        student_name: row.student_name,
        amount: row.amount,
        status: row.status,
        due_date: row.due_date ?? "",
      }));
  } else if (input.reportType === "paid") {
    title = "Paid Payments";
    rows = report.payments
      .filter((row) => row.status === "PAID")
      .map((row) => ({
        student_name: row.student_name,
        amount: row.amount,
        method: row.method,
        paid_at: row.paid_at ?? "",
      }));
  } else if (input.reportType === "expenses") {
    title = "Expenses";
    rows = report.expenses.map((row) => ({
      category: row.category,
      title: row.title,
      amount: row.amount,
      spent_on: row.spent_on,
    }));
  } else if (input.reportType === "attendance") {
    title = "Attendance Register";
    rows = report.checkins.map((row) => ({
      student_name: row.student_name,
      seat_number: row.seat_number ?? "",
      checked_in_at: row.checked_in_at,
      checked_out_at: row.checked_out_at ?? "",
      duration_minutes: row.duration_minutes ?? "",
      status: row.status,
    }));
  } else {
    title = "Business Summary";
    rows = [
      {
        total_students: report.metrics.totalStudents,
        revenue_paid: formatCurrency(report.metrics.paidRevenue),
        revenue_due: formatCurrency(report.metrics.dueRevenue),
        expenses: formatCurrency(report.metrics.expenses),
        occupancy_percent: `${report.metrics.occupancyPercent}%`,
        checkins: report.metrics.checkins,
      },
      ...report.monthlyComparison.map((point) => ({
        total_students: `Month ${point.month}`,
        revenue_paid: formatCurrency(point.revenue),
        revenue_due: "",
        expenses: formatCurrency(point.expenses),
        occupancy_percent: "",
        checkins: `Profit ${formatCurrency(point.profit)}`,
      })),
    ];
  }

  if (input.format === "xlsx") {
    const buffer = await buildXlsxBuffer({
      workbookTitle: title,
      sheets: [
        {
          name: title,
          rows,
        },
      ],
    });
    return {
      filename: `${filenameBase}.xlsx`,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer,
    };
  }

  const buffer = await buildPdfBuffer({
    title: `${title} | BookLib`,
    subtitle: `Range ${input.fromDate ?? "start"} to ${input.toDate ?? "today"}`,
    summary: [
      { label: "Paid revenue", value: formatCurrency(report.metrics.paidRevenue) },
      { label: "Due revenue", value: formatCurrency(report.metrics.dueRevenue) },
      { label: "Expenses", value: formatCurrency(report.metrics.expenses) },
      { label: "Occupancy", value: `${report.metrics.occupancyPercent}%` },
    ],
    tables: [
      {
        title,
        rows,
      },
    ],
  });
  return {
    filename: `${filenameBase}.pdf`,
    contentType: "application/pdf",
    buffer,
  };
}

export async function listOwnerReportRecipients() {
  const result = await requireDb().query<{
    library_id: string;
    library_name: string;
    owner_user_id: string;
    owner_name: string;
    owner_email: string | null;
  }>(
    `
    SELECT
      l.id AS library_id,
      l.name AS library_name,
      l.owner_user_id,
      u.full_name AS owner_name,
      u.email AS owner_email
    FROM libraries l
    INNER JOIN users u ON u.id = l.owner_user_id
    WHERE l.status = 'ACTIVE'
      AND u.email IS NOT NULL
    ORDER BY l.created_at ASC
    `,
  );

  return result.rows;
}

export async function sendDueRecoveryCampaign(input: {
  libraryId: string;
  actorUserId: string;
  message?: string;
}) {
  const targets = await repository().listDueRecoveryTargets(input.libraryId);
  if (targets.length === 0) {
    throw new AppError(404, "No due students available for reminder", "DUE_RECOVERY_EMPTY");
  }

  return createOwnerNotificationCampaign({
    libraryId: input.libraryId,
    actorUserId: input.actorUserId,
    title: "Fee due reminder",
    type: "PAYMENT_REMINDER",
    audience: "DUE_STUDENTS",
    message:
      input.message?.trim() ||
      "Your fee is due. Please clear the payment soon to avoid interruption in seat access and daily QR entry.",
  });
}

export async function listOwnerExpenses(input: {
  libraryId: string;
  month?: string;
}) {
  const repo = repository();
  const [summary, rows] = await Promise.all([
    repo.getExpenseSummary(input.libraryId, input.month || null),
    repo.listExpenses(input.libraryId, input.month || null),
  ]);

  return {
    summary: {
      monthlyExpenses: Number(summary.monthly_expenses),
      monthlyRevenue: Number(summary.monthly_revenue),
      monthlyProfit: Number(summary.monthly_profit),
    },
    rows,
  };
}

export async function createOwnerExpense(input: {
  libraryId: string;
  actorUserId: string;
  category: string;
  title: string;
  amount: number;
  spentOn: string;
  notes?: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const expense = await repo.createExpense(client, {
      libraryId: input.libraryId,
      category: input.category,
      title: input.title,
      amount: input.amount,
      spentOn: input.spentOn,
      notes: input.notes,
      createdBy: input.actorUserId,
    });
    await client.query("COMMIT");
    return expense;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getOwnerSettings(input: { libraryId: string }) {
  const settings = await repository().getOwnerSettings(input.libraryId);
  if (!settings) {
    throw new AppError(404, "Library settings not found", "LIBRARY_SETTINGS_NOT_FOUND");
  }

  const qr = await getLibraryEntryQr(input.libraryId);

  return {
    ...settings,
    qr_payload: qr.qrPayload,
  };
}

export async function updateOwnerSettings(input: {
  libraryId: string;
  libraryName: string;
  address: string;
  city: string;
  area?: string;
  wifiName?: string;
  wifiPassword?: string;
  noticeMessage?: string;
  allowOfflineCheckin: boolean;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  let committed = false;

  try {
    await client.query("BEGIN");
    await repo.upsertOwnerSettings(client, input);
    await client.query("COMMIT");
    committed = true;
    return await repo.getOwnerSettings(input.libraryId);
  } catch (error) {
    if (!committed) {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function regenerateOwnerQr(input: {
  libraryId: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const qrSecret = crypto.randomBytes(32).toString("hex");
    const result = await repo.regenerateLibraryQr(client, input.libraryId, qrSecret);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listOwnerAdmins(libraryId: string, actorUserId: string) {
  const repo = repository();
  const context = await repo.getLibraryOwnershipContext(libraryId, actorUserId);
  return {
    isHeadAdmin: context?.is_head_admin ?? false,
    admins: await repo.listLibraryAdmins(libraryId),
  };
}

export async function createOwnerAdmin(input: {
  libraryId: string;
  actorUserId: string;
  fullName: string;
  email?: string;
  phone?: string;
}) {
  const db = requireDb();
  const repo = repository();
  const context = await repo.getLibraryOwnershipContext(input.libraryId, input.actorUserId);
  if (!context?.is_head_admin) {
    throw new AppError(403, "Only head admin can create library admins", "HEAD_ADMIN_REQUIRED");
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const existing = await repo.findStudentByEmailOrPhone(client, input.email, input.phone);
    if (existing) {
      throw new AppError(409, "User already exists with this email or phone", "USER_ALREADY_EXISTS");
    }
    const temporaryPassword = "admin123456";
    const passwordHash = await hashPassword(temporaryPassword);
    const created = await repo.createOwnerUser(client, {
      fullName: input.fullName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      passwordHash,
    });
    await repo.ensureOwnerRole(client, created.id, input.libraryId);
    await client.query("COMMIT");
    return { userId: created.id, temporaryPassword };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteOwnerAdmin(input: {
  libraryId: string;
  actorUserId: string;
  adminUserId: string;
}) {
  const db = requireDb();
  const repo = repository();
  const context = await repo.getLibraryOwnershipContext(input.libraryId, input.actorUserId);
  if (!context?.is_head_admin) {
    throw new AppError(403, "Only head admin can remove library admins", "HEAD_ADMIN_REQUIRED");
  }
  if (input.adminUserId === context.owner_user_id) {
    throw new AppError(409, "Head admin cannot be removed", "HEAD_ADMIN_REMOVE_BLOCKED");
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await repo.deleteOwnerRole(client, input.adminUserId, input.libraryId);
    await client.query("COMMIT");
    return { removed: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateOwnerAdminPermissions(input: {
  libraryId: string;
  actorUserId: string;
  adminUserId: string;
  permissions: string[];
}) {
  const db = requireDb();
  const repo = repository();
  const context = await repo.getLibraryOwnershipContext(input.libraryId, input.actorUserId);
  if (!context?.is_head_admin) {
    throw new AppError(403, "Only head admin can change admin permissions", "HEAD_ADMIN_REQUIRED");
  }
  if (input.adminUserId === context.owner_user_id) {
    throw new AppError(409, "Head admin permissions are implicit and cannot be reduced", "HEAD_ADMIN_PERMISSION_LOCKED");
  }
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await repo.upsertOwnerAdminPermissions(client, {
      libraryId: input.libraryId,
      userId: input.adminUserId,
      permissions: input.permissions,
    });
    await client.query("COMMIT");
    return { updated: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listOwnerAuditLogs(input: {
  libraryId: string;
  page: number;
  limit: number;
}) {
  return repository().listAuditLogs(input.libraryId, input.page, input.limit);
}

function parseQrPayload(rawPayload: string) {
  try {
    return JSON.parse(Buffer.from(rawPayload, "base64url").toString("utf8")) as { libraryId: string; qrKeyId: string };
  } catch {
    throw new AppError(400, "Invalid QR payload", "INVALID_QR_PAYLOAD");
  }
}

export async function resolveStudentJoinQrPayload(input: { qrPayload: string }) {
  const db = requireDb();
  const repo = repository();
  const parsed = parseQrPayload(input.qrPayload);
  const client = await db.connect();
  try {
    const library = await repo.findLibraryByQrKey(client, parsed.qrKeyId);
    if (!library || library.id !== parsed.libraryId) {
      throw new AppError(404, "Library QR not recognized", "LIBRARY_QR_NOT_FOUND");
    }

    return {
      libraryId: library.id,
      libraryName: library.name,
      city: library.city,
      area: library.area,
      subdomain: library.subdomain,
      qrKeyId: library.active_qr_key_id,
    };
  } finally {
    client.release();
  }
}

export async function createStudentJoinRequest(input: {
  studentUserId: string;
  qrPayload: string;
  seatPreference?: string;
  message?: string;
}) {
  const db = requireDb();
  const repo = repository();
  const parsed = parseQrPayload(input.qrPayload);
  const client = await db.connect();
  try {
    const library = await repo.findLibraryByQrKey(client, parsed.qrKeyId);
    if (!library || library.id !== parsed.libraryId) {
      throw new AppError(404, "Library QR not recognized", "LIBRARY_QR_NOT_FOUND");
    }
    const created = await repo.createJoinRequest(client, {
      libraryId: library.id,
      studentUserId: input.studentUserId,
      requestedVia: "QR",
      requestQrKeyId: parsed.qrKeyId,
      seatPreference: input.seatPreference ?? null,
      message: input.message ?? null,
    });
    return { id: created.id, libraryId: library.id, libraryName: library.name };
  } finally {
    client.release();
  }
}

export async function createStudentJoinRequestByLibrary(input: {
  studentUserId: string;
  libraryId: string;
  seatPreference?: string;
  message?: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    const library = await repo.findLibraryById(client, input.libraryId);
    if (!library) {
      throw new AppError(404, "Library not found", "LIBRARY_NOT_FOUND");
    }

    const created = await repo.createJoinRequest(client, {
      libraryId: library.id,
      studentUserId: input.studentUserId,
      requestedVia: "SEARCH",
      seatPreference: input.seatPreference ?? null,
      message: input.message ?? null,
    });

    return {
      id: created.id,
      libraryId: library.id,
      libraryName: library.name,
      city: library.city,
      area: library.area,
    };
  } finally {
    client.release();
  }
}

export async function searchActiveLibrariesForJoin(query: string) {
  const rows = await repository().searchActiveLibrariesForJoin(query);
  return rows.map((row) => ({
    id: row.library_id,
    name: row.library_name,
    slug: row.subdomain || row.library_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    subdomain: row.subdomain ?? "",
    city: row.city,
    area: row.area,
    status: "ACTIVE",
  }));
}

export async function createStudentRejoinRequest(input: {
  studentUserId: string;
  libraryId: string;
  seatPreference?: string;
  message?: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    const created = await repo.createJoinRequest(client, {
      libraryId: input.libraryId,
      studentUserId: input.studentUserId,
      requestedVia: "REJOIN",
      seatPreference: input.seatPreference ?? null,
      message: input.message ?? null,
    });
    return { id: created.id, libraryId: input.libraryId };
  } finally {
    client.release();
  }
}

export async function getStudentRejoinOptions(input: {
  studentUserId: string;
  libraryId: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    const allowed = await repo.hasStudentLibraryHistory(client, input.studentUserId, input.libraryId);
    if (!allowed) {
      throw new AppError(403, "Library rejoin suggestions are available only for your previous libraries", "REJOIN_NOT_ALLOWED");
    }
    return await repo.getStudentRejoinOptions(client, input.libraryId);
  } finally {
    client.release();
  }
}

export async function reserveStudentRejoinSeat(input: {
  studentUserId: string;
  libraryId: string;
  seatNumber: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    const allowed = await repo.hasStudentLibraryHistory(client, input.studentUserId, input.libraryId);
    if (!allowed) {
      throw new AppError(403, "Seat reserve is available only for your previous libraries", "REJOIN_RESERVE_NOT_ALLOWED");
    }

    const reserved = await repo.reserveSeatForRejoin(client, {
      libraryId: input.libraryId,
      seatNumber: input.seatNumber,
    });
    if (!reserved) {
      throw new AppError(409, "Seat is no longer available for reserve", "SEAT_RESERVE_FAILED");
    }

    return reserved;
  } finally {
    client.release();
  }
}

export async function listOwnerJoinRequests(libraryId: string) {
  return repository().listJoinRequests(libraryId);
}

export async function listStudentJoinRequests(studentUserId: string) {
  return repository().listStudentJoinRequests(studentUserId);
}

export async function approveOwnerJoinRequest(input: {
  libraryId: string;
  actorUserId: string;
  requestId: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  fatherName?: string;
  address?: string;
  className?: string;
  preparingFor?: string;
  email?: string;
  phone?: string;
  emergencyContact?: string;
  temporaryPassword?: string;
  studentPlanId: string;
  planAmountOverride?: number;
  durationMonthsOverride?: number;
  couponCode?: string;
  paymentStatus: "PAID" | "UNPAID" | "DUE";
  seatId?: string;
  aadhaarDocumentUrl?: string;
  schoolIdDocumentUrl?: string;
  notes?: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const request = await repo.findJoinRequest(client, input.libraryId, input.requestId);
    if (!request) {
      throw new AppError(404, "Join request not found", "JOIN_REQUEST_NOT_FOUND");
    }
    if (request.status !== "PENDING") {
      throw new AppError(409, "Join request already reviewed", "JOIN_REQUEST_ALREADY_REVIEWED");
    }
    await client.query("COMMIT");
    return createAdmissionRecord({
      libraryId: input.libraryId,
      actorUserId: input.actorUserId,
      studentUserId: request.student_user_id,
      joinRequestId: input.requestId,
      fullName: input.fullName || request.student_name,
      dateOfBirth: input.dateOfBirth || request.date_of_birth || undefined,
      gender: input.gender || request.gender || undefined,
      fatherName: input.fatherName,
      address: input.address,
      className: input.className,
      preparingFor: input.preparingFor,
      email: input.email || request.student_email || undefined,
      phone: input.phone || request.student_phone || undefined,
      emergencyContact: input.emergencyContact,
      temporaryPassword: input.temporaryPassword,
      studentPlanId: input.studentPlanId,
      planAmountOverride: input.planAmountOverride,
      durationMonthsOverride: input.durationMonthsOverride,
      couponCode: input.couponCode,
      paymentStatus: input.paymentStatus,
      aadhaarDocumentUrl: input.aadhaarDocumentUrl,
      schoolIdDocumentUrl: input.schoolIdDocumentUrl,
      notes: input.notes,
      seatId: input.seatId,
      admissionSource: "JOIN_REQUEST",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function rejectOwnerJoinRequest(input: {
  libraryId: string;
  actorUserId: string;
  requestId: string;
  reason?: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await repo.updateJoinRequestStatus(client, {
      libraryId: input.libraryId,
      requestId: input.requestId,
      status: "REJECTED",
      reviewedBy: input.actorUserId,
      reason: input.reason ?? null,
    });
    await client.query("COMMIT");
    return { rejected: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function exitStudentLibrary(input: {
  studentUserId: string;
  libraryId: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await repo.exitStudentLibrary(client, input.studentUserId, input.libraryId);
    await repo.refreshLibrarySeatCounts(client, input.libraryId);
    await client.query("COMMIT");
    return { exited: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
