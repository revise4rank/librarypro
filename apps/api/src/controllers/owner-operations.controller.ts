import type { Request, Response } from "express";
import { createAuditLog } from "../lib/audit";
import { AppError } from "../lib/errors";
import { emitLibraryEvent, emitUserEvent } from "../lib/realtime";
import {
  assignSeatToStudent,
  createOwnerAdmission,
  createOwnerFloor,
  createOwnerNotification,
  createOwnerAdmin,
  createOwnerCoupon,
  createOwnerExpense,
  createOwnerPayment,
  createOwnerSeats,
  createOwnerStudent,
  createOwnerStudentPlan,
  createStudentJoinRequestByLibrary,
  createStudentJoinRequest,
  resolveStudentJoinQrPayload,
  createStudentRejoinRequest,
  deleteOwnerStudent,
  deleteOwnerAdmin,
  exitStudentLibrary,
  exportOwnerPaymentReceipt,
  getAdminDashboard,
  getOwnerDashboard,
  getOwnerCheckinRegisterPage,
  getOwnerReportsSummary,
  getOwnerSettings,
  getStudentDashboard,
  getStudentFocusTracker,
  getOwnerPaymentReceipt,
  getStudentPaymentReceipt,
  getStudentRejoinOptions,
  reserveStudentRejoinSeat,
  listAdminLibraries,
  listAdminPayments,
  listAdminPlanSummaries,
  listOwnerExpenses,
  listOwnerAdmins,
  listOwnerAuditLogs,
  listOwnerCoupons,
  listOwnerJoinRequests,
  listStudentJoinRequests,
  listOwnerNotificationsPage,
  listOwnerPaymentsPage,
  listOwnerFloors,
  listOwnerSeats,
  listOwnerStudentPlans,
  listOwnerStudentsPage,
  listStudentNotificationsPage,
  listStudentPaymentsPage,
  payStudentPayment,
  regenerateOwnerQr,
  rejectOwnerJoinRequest,
  searchActiveLibrariesForJoin,
  sendDueRecoveryCampaign,
  approveOwnerJoinRequest,
  exportOwnerReport,
  updateOwnerAdminPermissions,
  updateOwnerCoupon,
  updateOwnerFloor,
  updateOwnerStudentPlan,
  updateStudentFocusGoals,
  updateOwnerSettings,
  updateOwnerPayment,
  updateOwnerSeat,
  updateOwnerStudent,
  createStudentFocusSession,
  createStudentFocusSubject,
  unassignSeatFromStudent,
} from "../services/owner-operations.service";
import {
  createOwnerAdmissionBodySchema,
  assignSeatBodySchema,
  createStudentFocusSessionBodySchema,
  createStudentFocusSubjectBodySchema,
  createOwnerFloorBodySchema,
  updateOwnerFloorBodySchema,
  createOwnerAdminBodySchema,
  createOwnerNotificationBodySchema,
  ownerCouponBodySchema,
  createOwnerExpenseBodySchema,
  createOwnerPaymentBodySchema,
  createOwnerSeatsBodySchema,
  createOwnerStudentBodySchema,
  ownerStudentPlanBodySchema,
  ownerExpensesQuerySchema,
  ownerAuditLogsQuerySchema,
  ownerNotificationsQuerySchema,
  ownerPaymentsQuerySchema,
  ownerStudentsQuerySchema,
  ownerReportExportQuerySchema,
  ownerReportsQuerySchema,
  createLibraryJoinRequestBodySchema,
  createJoinRequestBodySchema,
  resolveJoinQrBodySchema,
  createRejoinRequestBodySchema,
  approveJoinRequestBodySchema,
  rejectJoinRequestBodySchema,
  updateOwnerAdminPermissionsBodySchema,
  payStudentPaymentBodySchema,
  ownerCheckinsQuerySchema,
  sendDueRecoveryBodySchema,
  studentNotificationsQuerySchema,
  studentLibrarySearchQuerySchema,
  studentPaymentsQuerySchema,
  updateStudentFocusGoalsBodySchema,
  updateOwnerSettingsBodySchema,
  updateOwnerSeatBodySchema,
  updateOwnerPaymentBodySchema,
  updateOwnerStudentBodySchema,
} from "../validators/owner-operations.validators";

function requireOwnerContext(req: Request) {
  if (!req.auth || req.auth.role !== "LIBRARY_OWNER" || !req.auth.libraryIds[0]) {
    throw new AppError(401, "Library owner authentication required", "OWNER_AUTH_REQUIRED");
  }

  return {
    libraryId: req.auth.libraryIds[0],
    actorUserId: req.auth.userId,
  };
}

function paramValue(value: string | string[] | undefined) {
  if (!value) {
    throw new AppError(400, "Required route parameter missing", "PARAM_REQUIRED");
  }

  return Array.isArray(value) ? value[0] : value;
}

function buildPaginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function listOwnerStudentsController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const parsed = ownerStudentsQuerySchema.parse(req.query);
  const paged = await listOwnerStudentsPage({
    libraryId,
    page: parsed.page,
    limit: parsed.limit,
  });
  res.json({
    success: true,
    data: paged.rows,
    meta: buildPaginationMeta(paged.page, paged.limit, paged.total),
  });
}

export async function listOwnerStudentPlansController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const data = await listOwnerStudentPlans(libraryId);
  res.json({ success: true, data });
}

export async function createOwnerStudentPlanController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const parsed = ownerStudentPlanBodySchema.parse(req.body);
  const data = await createOwnerStudentPlan({
    libraryId,
    name: parsed.name,
    targetAudience: parsed.targetAudience || undefined,
    description: parsed.description || undefined,
    durationMonths: parsed.durationMonths,
    baseAmount: parsed.baseAmount,
    defaultDiscountType: parsed.defaultDiscountType,
    defaultDiscountValue: parsed.defaultDiscountValue,
    isActive: parsed.isActive,
  });
  res.status(201).json({ success: true, data });
}

export async function updateOwnerStudentPlanController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const parsed = ownerStudentPlanBodySchema.parse(req.body);
  const data = await updateOwnerStudentPlan({
    libraryId,
    planId: paramValue(req.params.planId),
    name: parsed.name,
    targetAudience: parsed.targetAudience || undefined,
    description: parsed.description || undefined,
    durationMonths: parsed.durationMonths,
    baseAmount: parsed.baseAmount,
    defaultDiscountType: parsed.defaultDiscountType,
    defaultDiscountValue: parsed.defaultDiscountValue,
    isActive: parsed.isActive,
  });
  res.json({ success: true, data });
}

export async function listOwnerCouponsController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const data = await listOwnerCoupons(libraryId);
  res.json({ success: true, data });
}

export async function createOwnerCouponController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const parsed = ownerCouponBodySchema.parse(req.body);
  const data = await createOwnerCoupon({
    libraryId,
    studentPlanId: parsed.studentPlanId || undefined,
    code: parsed.code,
    discountType: parsed.discountType,
    discountValue: parsed.discountValue,
    validFrom: parsed.validFrom || undefined,
    validUntil: parsed.validUntil || undefined,
    usageLimit: parsed.usageLimit,
    isActive: parsed.isActive,
  });
  res.status(201).json({ success: true, data });
}

export async function updateOwnerCouponController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const parsed = ownerCouponBodySchema.parse(req.body);
  const data = await updateOwnerCoupon({
    libraryId,
    couponId: paramValue(req.params.couponId),
    studentPlanId: parsed.studentPlanId || undefined,
    code: parsed.code,
    discountType: parsed.discountType,
    discountValue: parsed.discountValue,
    validFrom: parsed.validFrom || undefined,
    validUntil: parsed.validUntil || undefined,
    usageLimit: parsed.usageLimit,
    isActive: parsed.isActive,
  });
  res.json({ success: true, data });
}

export async function getOwnerDashboardController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const data = await getOwnerDashboard({ libraryId });
  res.json({ success: true, data });
}

export async function listOwnerAdminsController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const data = await listOwnerAdmins(libraryId, actorUserId);
  res.json({ success: true, data });
}

export async function createOwnerAdminController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const parsed = createOwnerAdminBodySchema.parse(req.body);
  const data = await createOwnerAdmin({
    libraryId,
    actorUserId,
    fullName: parsed.fullName,
    email: parsed.email || undefined,
    phone: parsed.phone || undefined,
  });
  await createAuditLog({
    actorUserId,
    libraryId,
    action: "owner.admin.create",
    entityType: "user",
    entityId: data.userId,
    metadata: { fullName: parsed.fullName },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });
  res.status(201).json({ success: true, data });
}

export async function deleteOwnerAdminController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const adminUserId = paramValue(req.params.adminUserId);
  const data = await deleteOwnerAdmin({ libraryId, actorUserId, adminUserId });
  await createAuditLog({
    actorUserId,
    libraryId,
    action: "owner.admin.delete",
    entityType: "user",
    entityId: adminUserId,
    metadata: {},
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });
  res.json({ success: true, data });
}

export async function updateOwnerAdminPermissionsController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const adminUserId = paramValue(req.params.adminUserId);
  const parsed = updateOwnerAdminPermissionsBodySchema.parse(req.body);
  const data = await updateOwnerAdminPermissions({
    libraryId,
    actorUserId,
    adminUserId,
    permissions: parsed.permissions,
  });
  await createAuditLog({
    actorUserId,
    libraryId,
    action: "owner.admin.permissions.update",
    entityType: "user",
    entityId: adminUserId,
    metadata: { permissions: parsed.permissions },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });
  res.json({ success: true, data });
}

export async function listOwnerAuditLogsController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const parsed = ownerAuditLogsQuerySchema.parse(req.query);
  const paged = await listOwnerAuditLogs({ libraryId, page: parsed.page, limit: parsed.limit });
  res.json({ success: true, data: paged.rows, meta: buildPaginationMeta(paged.page, paged.limit, paged.total) });
}

export async function listOwnerJoinRequestsController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const data = await listOwnerJoinRequests(libraryId);
  res.json({ success: true, data });
}

export async function approveOwnerJoinRequestController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const requestId = paramValue(req.params.requestId);
  const parsed = approveJoinRequestBodySchema.parse(req.body);
  const data = await approveOwnerJoinRequest({
    libraryId,
    actorUserId,
    requestId,
    fullName: parsed.fullName || undefined,
    fatherName: parsed.fatherName || undefined,
    address: parsed.address || undefined,
    className: parsed.className || undefined,
    preparingFor: parsed.preparingFor || undefined,
    email: parsed.email || undefined,
    phone: parsed.phone || undefined,
    emergencyContact: parsed.emergencyContact || undefined,
    studentPlanId: parsed.studentPlanId,
    planAmountOverride: parsed.planAmountOverride,
    durationMonthsOverride: parsed.durationMonthsOverride,
    couponCode: parsed.couponCode || undefined,
    paymentStatus: parsed.paymentStatus,
    aadhaarDocumentUrl: parsed.aadhaarDocumentUrl || undefined,
    schoolIdDocumentUrl: parsed.schoolIdDocumentUrl || undefined,
    notes: parsed.notes || undefined,
  });
  await createAuditLog({
    actorUserId,
    libraryId,
    action: "owner.join-request.approve",
    entityType: "join_request",
    entityId: requestId,
    metadata: { studentPlanId: parsed.studentPlanId, couponCode: parsed.couponCode || null },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });
  res.status(201).json({ success: true, data });
}

export async function rejectOwnerJoinRequestController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const requestId = paramValue(req.params.requestId);
  const parsed = rejectJoinRequestBodySchema.parse(req.body);
  const data = await rejectOwnerJoinRequest({
    libraryId,
    actorUserId,
    requestId,
    reason: parsed.reason || undefined,
  });
  await createAuditLog({
    actorUserId,
    libraryId,
    action: "owner.join-request.reject",
    entityType: "join_request",
    entityId: requestId,
    metadata: { reason: parsed.reason || null },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });
  res.json({ success: true, data });
}

export async function sendDueRecoveryCampaignController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const parsed = sendDueRecoveryBodySchema.parse(req.body);
  const result = await sendDueRecoveryCampaign({
    libraryId,
    actorUserId,
    message: parsed.message || undefined,
  });

  emitLibraryEvent(libraryId, "notification.created", {
    title: "Fee due reminder",
    type: "PAYMENT_REMINDER",
    audience: "DUE_STUDENTS",
    recipientCount: result.recipientCount,
    channels: result.channels,
  });

  res.status(201).json({ success: true, data: result });
}

export async function createOwnerAdmissionController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const parsed = createOwnerAdmissionBodySchema.parse(req.body);
  const result = await createOwnerAdmission({
    libraryId,
    actorUserId,
    fullName: parsed.fullName,
    fatherName: parsed.fatherName || undefined,
    address: parsed.address || undefined,
    className: parsed.className || undefined,
    preparingFor: parsed.preparingFor || undefined,
    email: parsed.email || undefined,
    phone: parsed.phone || undefined,
    emergencyContact: parsed.emergencyContact || undefined,
    studentPlanId: parsed.studentPlanId,
    planAmountOverride: parsed.planAmountOverride,
    durationMonthsOverride: parsed.durationMonthsOverride,
    couponCode: parsed.couponCode || undefined,
    paymentStatus: parsed.paymentStatus,
    aadhaarDocumentUrl: parsed.aadhaarDocumentUrl || undefined,
    schoolIdDocumentUrl: parsed.schoolIdDocumentUrl || undefined,
    notes: parsed.notes || undefined,
  });

  await createAuditLog({
    actorUserId,
    libraryId,
    action: "owner.admission.create",
    entityType: "student_assignment",
    entityId: result.assignmentId,
    metadata: { fullName: parsed.fullName, studentPlanId: parsed.studentPlanId, couponCode: parsed.couponCode || null },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });

  emitLibraryEvent(libraryId, "student.updated", {
    action: "admitted",
    assignmentId: result.assignmentId,
    fullName: parsed.fullName,
  });

  res.status(201).json({ success: true, data: result });
}

export async function createOwnerStudentController(req: Request, res: Response) {
  requireOwnerContext(req);
  throw new AppError(
    410,
    "New student onboarding now happens from Admissions only. Use the admissions desk to create the student, then allot the seat later from Students.",
    "ADMISSIONS_FLOW_REQUIRED",
  );
}

export async function updateOwnerStudentController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const parsed = updateOwnerStudentBodySchema.parse(req.body);
  const result = await updateOwnerStudent({
    libraryId,
    assignmentId: paramValue(req.params.assignmentId),
    fullName: parsed.fullName,
    fatherName: parsed.fatherName || undefined,
    address: parsed.address || undefined,
    className: parsed.className || undefined,
    preparingFor: parsed.preparingFor || undefined,
    email: parsed.email || undefined,
    phone: parsed.phone || undefined,
    emergencyContact: parsed.emergencyContact || undefined,
    planName: parsed.planName,
    planPrice: parsed.planPrice,
    durationMonths: parsed.durationMonths,
    nextDueDate: parsed.nextDueDate || undefined,
    startsAt: parsed.startsAt,
    endsAt: parsed.endsAt,
    paymentStatus: parsed.paymentStatus,
    aadhaarDocumentUrl: parsed.aadhaarDocumentUrl || undefined,
    schoolIdDocumentUrl: parsed.schoolIdDocumentUrl || undefined,
    notes: parsed.notes || undefined,
    studentPlanId: undefined,
  });

  await createAuditLog({
    actorUserId,
    libraryId,
    action: "owner.student.update",
    entityType: "student_assignment",
    entityId: result.id,
    metadata: { fullName: parsed.fullName },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });

  emitLibraryEvent(libraryId, "student.updated", {
    action: "updated",
    assignmentId: result.id,
    fullName: parsed.fullName,
  });

  res.json({ success: true, data: result });
}

export async function deleteOwnerStudentController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const result = await deleteOwnerStudent({
    libraryId,
    assignmentId: paramValue(req.params.assignmentId),
  });

  await createAuditLog({
    actorUserId,
    libraryId,
    action: "owner.student.delete",
    entityType: "student_assignment",
    entityId: result.id,
    metadata: {},
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });

  emitLibraryEvent(libraryId, "student.updated", {
    action: "deleted",
    assignmentId: result.id,
  });

  res.json({ success: true, data: result });
}

export async function listOwnerPaymentsController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const parsed = ownerPaymentsQuerySchema.parse(req.query);
  const paged = await listOwnerPaymentsPage({
    libraryId,
    page: parsed.page,
    limit: parsed.limit,
  });
  res.json({
    success: true,
    data: paged.rows,
    meta: buildPaginationMeta(paged.page, paged.limit, paged.total),
  });
}

export async function getOwnerPaymentReceiptController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const paymentId = paramValue(req.params.paymentId);
  const data = await getOwnerPaymentReceipt({ libraryId, paymentId });
  res.json({ success: true, data });
}

export async function exportOwnerPaymentReceiptController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const paymentId = paramValue(req.params.paymentId);
  const buffer = await exportOwnerPaymentReceipt({ libraryId, paymentId });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="receipt-${paymentId}.pdf"`);
  res.send(buffer);
}

export async function listOwnerExpensesController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const parsed = ownerExpensesQuerySchema.parse(req.query);
  const data = await listOwnerExpenses({
    libraryId,
    month: parsed.month || undefined,
  });
  res.json({ success: true, data });
}

export async function getOwnerReportsSummaryController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const parsed = ownerReportsQuerySchema.parse(req.query);
  const data = await getOwnerReportsSummary({
    libraryId,
    fromDate: parsed.fromDate || undefined,
    toDate: parsed.toDate || undefined,
  });
  res.json({ success: true, data });
}

export async function exportOwnerReportController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const parsed = ownerReportExportQuerySchema.parse(req.query);
  const exported = await exportOwnerReport({
    libraryId,
    reportType: parsed.reportType === "dues" ? "due" : parsed.reportType,
    format: parsed.format,
    fromDate: parsed.fromDate || undefined,
    toDate: parsed.toDate || undefined,
  });

  res.setHeader("Content-Type", exported.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${exported.filename}"`);
  res.send(exported.buffer);
}

export async function createOwnerExpenseController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const parsed = createOwnerExpenseBodySchema.parse(req.body);
  const result = await createOwnerExpense({
    libraryId,
    actorUserId,
    category: parsed.category,
    title: parsed.title,
    amount: parsed.amount,
    spentOn: parsed.spentOn,
    notes: parsed.notes || undefined,
  });

  await createAuditLog({
    actorUserId,
    libraryId,
    action: "owner.expense.create",
    entityType: "expense",
    entityId: result.id,
    metadata: { category: parsed.category, amount: parsed.amount, title: parsed.title },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });

  res.status(201).json({ success: true, data: result });
}

export async function createOwnerPaymentController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const parsed = createOwnerPaymentBodySchema.parse(req.body);
  const result = await createOwnerPayment({
    libraryId,
    actorUserId,
    assignmentId: parsed.assignmentId,
    amount: parsed.amount,
    method: parsed.method,
    status: parsed.status,
    dueDate: parsed.dueDate || undefined,
    paidAt: parsed.paidAt || undefined,
    referenceNo: parsed.referenceNo || undefined,
    notes: parsed.notes || undefined,
  });

  await createAuditLog({
    actorUserId,
    libraryId,
    action: "owner.payment.create",
    entityType: "payment",
    entityId: result.id,
    metadata: { assignmentId: parsed.assignmentId, amount: parsed.amount, status: parsed.status },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });

  emitLibraryEvent(libraryId, "payment.updated", {
    action: "created",
    paymentId: result.id,
    assignmentId: parsed.assignmentId,
    status: parsed.status,
  });

  res.status(201).json({ success: true, data: result });
}

export async function updateOwnerPaymentController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const parsed = updateOwnerPaymentBodySchema.parse(req.body);
  const result = await updateOwnerPayment({
    libraryId,
    paymentId: paramValue(req.params.paymentId),
    amount: parsed.amount,
    method: parsed.method,
    status: parsed.status,
    dueDate: parsed.dueDate || undefined,
    paidAt: parsed.paidAt || undefined,
    referenceNo: parsed.referenceNo || undefined,
    notes: parsed.notes || undefined,
  });

  await createAuditLog({
    actorUserId,
    libraryId,
    action: "owner.payment.update",
    entityType: "payment",
    entityId: result.id,
    metadata: { amount: parsed.amount, status: parsed.status },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });

  emitLibraryEvent(libraryId, "payment.updated", {
    action: "updated",
    paymentId: result.id,
    status: parsed.status,
  });

  res.json({ success: true, data: result });
}

export async function listOwnerNotificationsController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const parsed = ownerNotificationsQuerySchema.parse(req.query);
  const paged = await listOwnerNotificationsPage({
    libraryId,
    page: parsed.page,
    limit: parsed.limit,
  });
  res.json({
    success: true,
    data: paged.rows,
    meta: buildPaginationMeta(paged.page, paged.limit, paged.total),
  });
}

export async function createOwnerNotificationController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const parsed = createOwnerNotificationBodySchema.parse(req.body);
  const result = await createOwnerNotification({
    libraryId,
    actorUserId,
    title: parsed.title,
    type: parsed.type,
    audience: parsed.audience,
    message: parsed.message,
  });

  await createAuditLog({
    actorUserId,
    libraryId,
    action: "owner.notification.create",
    entityType: "notification_campaign",
    entityId: null,
    metadata: { title: parsed.title, audience: parsed.audience, recipientCount: result.recipientCount },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });

  emitLibraryEvent(libraryId, "notification.created", {
    title: parsed.title,
    type: parsed.type,
    audience: parsed.audience,
    recipientCount: result.recipientCount,
    channels: result.channels,
  });

  res.status(201).json({ success: true, data: result });
}

export async function getOwnerSettingsController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const data = await getOwnerSettings({ libraryId });
  res.json({ success: true, data });
}

export async function updateOwnerSettingsController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const parsed = updateOwnerSettingsBodySchema.parse(req.body);
  const data = await updateOwnerSettings({
    libraryId,
    libraryName: parsed.libraryName,
    address: parsed.address,
    city: parsed.city,
    area: parsed.area || undefined,
    wifiName: parsed.wifiName || undefined,
    wifiPassword: parsed.wifiPassword || undefined,
    noticeMessage: parsed.noticeMessage || undefined,
    allowOfflineCheckin: parsed.allowOfflineCheckin,
  });

  await createAuditLog({
    actorUserId,
    libraryId,
    action: "owner.settings.update",
    entityType: "library_settings",
    entityId: null,
    metadata: {
      libraryName: parsed.libraryName,
      city: parsed.city,
      allowOfflineCheckin: parsed.allowOfflineCheckin,
    },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });

  res.json({ success: true, data });
}

export async function regenerateOwnerQrController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const data = await regenerateOwnerQr({ libraryId });

  await createAuditLog({
    actorUserId,
    libraryId,
    action: "owner.qr.regenerate",
    entityType: "library_qr",
    entityId: null,
    metadata: { qrKeyId: data.active_qr_key_id },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });

  res.json({ success: true, data });
}

export async function listOwnerSeatsController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const rows = await listOwnerSeats(libraryId);
  res.json({ success: true, data: rows });
}

export async function listOwnerFloorsController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const rows = await listOwnerFloors(libraryId);
  res.json({ success: true, data: rows });
}

export async function getOwnerCheckinsController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const parsed = ownerCheckinsQuerySchema.extend({
    page: ownerStudentsQuerySchema.shape.page,
    limit: ownerStudentsQuerySchema.shape.limit,
  }).parse(req.query);
  const data = await getOwnerCheckinRegisterPage({
    libraryId,
    status: parsed.status,
    search: parsed.search || undefined,
    fromDate: parsed.fromDate || undefined,
    toDate: parsed.toDate || undefined,
    page: parsed.page,
    limit: parsed.limit,
  });
  res.json({
    success: true,
    data: {
      summary: data.summary,
      rows: data.rows,
    },
    meta: buildPaginationMeta(data.page, data.limit, data.total),
  });
}

export async function createOwnerFloorController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const parsed = createOwnerFloorBodySchema.parse(req.body);
  const result = await createOwnerFloor({
    libraryId,
    name: parsed.name,
    floorNumber: parsed.floorNumber,
    layoutColumns: parsed.layoutColumns,
    layoutRows: parsed.layoutRows,
    layoutMeta: null,
  });

  await createAuditLog({
    actorUserId,
    libraryId,
    action: "owner.floor.create",
    entityType: "library_floor",
    entityId: result.id,
    metadata: { floorNumber: parsed.floorNumber, name: parsed.name },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });

  emitLibraryEvent(libraryId, "seat.updated", {
    action: "floor_created",
    floorId: result.id,
  });

  res.status(201).json({ success: true, data: result });
}

export async function updateOwnerFloorController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const parsed = updateOwnerFloorBodySchema.parse(req.body);
  const result = await updateOwnerFloor({
    libraryId,
    floorId: paramValue(req.params.floorId),
    name: parsed.name || undefined,
    layoutColumns: parsed.layoutColumns,
    layoutRows: parsed.layoutRows,
    layoutMeta:
      parsed.aisleCells || parsed.sectionColors
        ? {
            aisleCells: parsed.aisleCells,
            sectionColors: parsed.sectionColors,
          }
        : null,
  });

  await createAuditLog({
    actorUserId,
    libraryId,
    action: "owner.floor.update",
    entityType: "library_floor",
    entityId: result.id,
    metadata: parsed,
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });

  emitLibraryEvent(libraryId, "seat.updated", {
    action: "floor_updated",
    floorId: result.id,
  });

  res.json({ success: true, data: result });
}

export async function createOwnerSeatsController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const parsed = createOwnerSeatsBodySchema.parse(req.body);
  const result = await createOwnerSeats({
    libraryId,
    floorId: parsed.floorId || null,
    sectionName: parsed.sectionName,
    seatPrefix: parsed.seatPrefix,
    customSeatCode: parsed.customSeatCode || null,
    startNumber: parsed.startNumber,
    seatCount: parsed.seatCount,
    rowStart: parsed.rowStart,
    colStart: parsed.colStart,
    columnsPerRow: parsed.columnsPerRow,
  });

  await createAuditLog({
    actorUserId,
    libraryId,
    action: "owner.seat.create",
    entityType: "seat",
    entityId: null,
    metadata: { createdCount: result.createdCount, seatPrefix: parsed.seatPrefix, sectionName: parsed.sectionName },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });

  emitLibraryEvent(libraryId, "seat.updated", {
    action: "batch_created",
    createdCount: result.createdCount,
  });

  res.status(201).json({ success: true, data: result });
}

export async function assignOwnerSeatController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const parsed = assignSeatBodySchema.parse(req.body);
  const result = await assignSeatToStudent({
    libraryId,
    assignmentId: parsed.assignmentId,
    seatId: parsed.seatId,
  });

  await createAuditLog({
    actorUserId,
    libraryId,
    action: "owner.seat.assign",
    entityType: "seat",
    entityId: result.seatId,
    metadata: { assignmentId: parsed.assignmentId },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });

  emitLibraryEvent(libraryId, "seat.updated", {
    seatId: result.seatId,
    assignmentId: parsed.assignmentId,
  });

  res.json({ success: true, data: result });
}

export async function assignOwnerStudentSeatController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const parsed = assignSeatBodySchema.parse({
    assignmentId: paramValue(req.params.assignmentId),
    seatId: req.body?.seatId,
  });
  const result = await assignSeatToStudent({
    libraryId,
    assignmentId: parsed.assignmentId,
    seatId: parsed.seatId,
  });

  await createAuditLog({
    actorUserId,
    libraryId,
    action: "owner.student.seat.assign",
    entityType: "seat",
    entityId: result.seatId,
    metadata: { assignmentId: parsed.assignmentId },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });

  emitLibraryEvent(libraryId, "seat.updated", {
    seatId: result.seatId,
    assignmentId: parsed.assignmentId,
  });

  res.status(201).json({ success: true, data: result });
}

export async function unassignOwnerStudentSeatController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const assignmentId = paramValue(req.params.assignmentId);
  const result = await unassignSeatFromStudent({
    libraryId,
    assignmentId,
  });

  await createAuditLog({
    actorUserId,
    libraryId,
    action: "owner.student.seat.unassign",
    entityType: "student_assignment",
    entityId: assignmentId,
    metadata: {},
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });

  emitLibraryEvent(libraryId, "seat.updated", {
    assignmentId,
    action: "unassigned",
  });

  res.json({ success: true, data: result });
}

export async function updateOwnerSeatController(req: Request, res: Response) {
  const { libraryId, actorUserId } = requireOwnerContext(req);
  const parsed = updateOwnerSeatBodySchema.parse(req.body);
  const result = await updateOwnerSeat({
    libraryId,
    seatId: paramValue(req.params.seatId),
    seatCode: parsed.seatCode || undefined,
    sectionName: parsed.sectionName || undefined,
    status: parsed.status,
    reservedUntil: parsed.reservedUntil || undefined,
    posX: parsed.posX,
    posY: parsed.posY,
    markFree: parsed.markFree,
  });

  await createAuditLog({
    actorUserId,
    libraryId,
    action: "owner.seat.update",
    entityType: "seat",
    entityId: result.id,
    metadata: parsed,
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });

  emitLibraryEvent(libraryId, "seat.updated", {
    seatId: result.id,
    action: "updated",
  });

  res.json({ success: true, data: result });
}

function requireStudentContext(req: Request) {
  if (!req.auth || req.auth.role !== "STUDENT") {
    throw new AppError(401, "Student authentication required", "STUDENT_AUTH_REQUIRED");
  }

  const libraryId = req.tenant?.libraryId ?? req.auth.libraryIds[0];
  if (!libraryId) {
    throw new AppError(400, "Student tenant context missing", "STUDENT_LIBRARY_REQUIRED");
  }

  return {
    libraryId,
    studentUserId: req.auth.userId,
  };
}

function requireStudentUser(req: Request) {
  if (!req.auth || req.auth.role !== "STUDENT") {
    throw new AppError(401, "Student authentication required", "STUDENT_AUTH_REQUIRED");
  }

  return {
    studentUserId: req.auth.userId,
  };
}

export async function listStudentPaymentsController(req: Request, res: Response) {
  const { libraryId, studentUserId } = requireStudentContext(req);
  const parsed = studentPaymentsQuerySchema.parse(req.query);
  const data = await listStudentPaymentsPage({
    libraryId,
    studentUserId,
    page: parsed.page,
    limit: parsed.limit,
  });
  res.json({
    success: true,
    data: {
      summary: data.summary,
      payments: data.payments,
    },
    meta: buildPaginationMeta(data.page, data.limit, data.total),
  });
}

export async function getStudentDashboardController(req: Request, res: Response) {
  const { libraryId, studentUserId } = requireStudentContext(req);
  const data = await getStudentDashboard({ libraryId, studentUserId });
  res.json({ success: true, data });
}

export async function getStudentFocusTrackerController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const data = await getStudentFocusTracker({ studentUserId });
  res.json({ success: true, data });
}

export async function updateStudentFocusGoalsController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const parsed = updateStudentFocusGoalsBodySchema.parse(req.body);
  const data = await updateStudentFocusGoals({
    studentUserId,
    dailyTargetMinutes: parsed.dailyTargetMinutes,
    weeklyTargetHours: parsed.weeklyTargetHours,
  });
  res.json({ success: true, data });
}

export async function createStudentFocusSubjectController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const parsed = createStudentFocusSubjectBodySchema.parse(req.body);
  const data = await createStudentFocusSubject({
    studentUserId,
    subjectName: parsed.subjectName,
    topicName: parsed.topicName || undefined,
    targetMinutes: parsed.targetMinutes,
  });
  res.status(201).json({ success: true, data });
}

export async function createStudentFocusSessionController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const parsed = createStudentFocusSessionBodySchema.parse(req.body);
  const data = await createStudentFocusSession({
    studentUserId,
    subjectId: parsed.subjectId || undefined,
    topicTitle: parsed.topicTitle || undefined,
    durationMinutes: parsed.durationMinutes,
    sessionType: parsed.sessionType,
  });
  res.status(201).json({ success: true, data });
}

export async function payStudentPaymentController(req: Request, res: Response) {
  const { libraryId, studentUserId } = requireStudentContext(req);
  const parsed = payStudentPaymentBodySchema.parse(req.body);
  const result = await payStudentPayment({
    libraryId,
    studentUserId,
    paymentId: paramValue(req.params.paymentId),
    method: parsed.method,
    referenceNo: parsed.referenceNo || undefined,
  });

  await createAuditLog({
    actorUserId: studentUserId,
    libraryId,
    action: "student.payment.pay",
    entityType: "payment",
    entityId: result.id,
    metadata: { method: parsed.method },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });

  emitUserEvent(studentUserId, "payment.updated", {
    action: "paid",
    paymentId: result.id,
    method: parsed.method,
  });
  emitLibraryEvent(libraryId, "payment.updated", {
    action: "student_paid",
    paymentId: result.id,
    studentUserId,
  });

  res.json({ success: true, data: result });
}

export async function createStudentJoinRequestController(req: Request, res: Response) {
  const { studentUserId } = requireStudentUser(req);
  const parsed = createJoinRequestBodySchema.parse(req.body);
  const data = await createStudentJoinRequest({
    studentUserId,
    qrPayload: parsed.qrPayload,
    seatPreference: parsed.seatPreference || undefined,
    message: parsed.message || undefined,
  });
  await createAuditLog({
    actorUserId: studentUserId,
    libraryId: data.libraryId,
    action: "student.join-request.create",
    entityType: "join_request",
    metadata: { via: "QR" },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });
  res.status(201).json({ success: true, data });
}

export async function createStudentJoinRequestByLibraryController(req: Request, res: Response) {
  const { studentUserId } = requireStudentUser(req);
  const parsed = createLibraryJoinRequestBodySchema.parse(req.body);
  const data = await createStudentJoinRequestByLibrary({
    studentUserId,
    libraryId: parsed.libraryId,
    seatPreference: parsed.seatPreference || undefined,
    message: parsed.message || undefined,
  });
  await createAuditLog({
    actorUserId: studentUserId,
    libraryId: data.libraryId,
    action: "student.join-request.create",
    entityType: "join_request",
    metadata: { via: "SEARCH" },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });
  res.status(201).json({ success: true, data });
}

export async function resolveStudentJoinQrController(req: Request, res: Response) {
  requireStudentUser(req);
  const parsed = resolveJoinQrBodySchema.parse(req.body);
  const data = await resolveStudentJoinQrPayload({
    qrPayload: parsed.qrPayload,
  });
  res.json({ success: true, data });
}

export async function searchStudentLibrariesController(req: Request, res: Response) {
  const parsed = studentLibrarySearchQuerySchema.parse(req.query);
  const data = await searchActiveLibrariesForJoin(parsed.q);
  res.json({ success: true, data });
}

export async function createStudentRejoinRequestController(req: Request, res: Response) {
  if (!req.auth || req.auth.role !== "STUDENT") {
    throw new AppError(401, "Student authentication required", "STUDENT_AUTH_REQUIRED");
  }

  const libraryId = paramValue(req.params.libraryId);
  const parsed = createRejoinRequestBodySchema.parse(req.body);
  const data = await createStudentRejoinRequest({
    studentUserId: req.auth.userId,
    libraryId,
    seatPreference: parsed.seatPreference || undefined,
    message: parsed.message || undefined,
  });
  res.status(201).json({ success: true, data });
}

export async function getStudentRejoinOptionsController(req: Request, res: Response) {
  if (!req.auth || req.auth.role !== "STUDENT") {
    throw new AppError(401, "Student authentication required", "STUDENT_AUTH_REQUIRED");
  }

  const libraryId = paramValue(req.params.libraryId);
  const data = await getStudentRejoinOptions({
    studentUserId: req.auth.userId,
    libraryId,
  });
  res.json({ success: true, data });
}

export async function reserveStudentRejoinSeatController(req: Request, res: Response) {
  if (!req.auth || req.auth.role !== "STUDENT") {
    throw new AppError(401, "Student authentication required", "STUDENT_AUTH_REQUIRED");
  }

  const libraryId = paramValue(req.params.libraryId);
  const seatNumber = paramValue(req.params.seatNumber);
  const data = await reserveStudentRejoinSeat({
    studentUserId: req.auth.userId,
    libraryId,
    seatNumber,
  });
  res.status(201).json({ success: true, data });
}

export async function listStudentJoinRequestsController(req: Request, res: Response) {
  const { studentUserId } = requireStudentUser(req);
  const data = await listStudentJoinRequests(studentUserId);
  res.json({ success: true, data });
}

export async function exitStudentLibraryController(req: Request, res: Response) {
  const { studentUserId } = requireStudentUser(req);
  const libraryId = paramValue(req.params.libraryId);
  const data = await exitStudentLibrary({ studentUserId, libraryId });
  await createAuditLog({
    actorUserId: studentUserId,
    libraryId,
    action: "student.library.exit",
    entityType: "student_assignment",
    metadata: {},
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });
  res.json({ success: true, data });
}

export async function getStudentPaymentReceiptController(req: Request, res: Response) {
  const { libraryId, studentUserId } = requireStudentContext(req);
  const data = await getStudentPaymentReceipt({
    libraryId,
    studentUserId,
    paymentId: paramValue(req.params.paymentId),
  });
  res.json({ success: true, data });
}

export async function listStudentNotificationsController(req: Request, res: Response) {
  const { libraryId, studentUserId } = requireStudentContext(req);
  const parsed = studentNotificationsQuerySchema.parse(req.query);
  const paged = await listStudentNotificationsPage({
    libraryId,
    studentUserId,
    page: parsed.page,
    limit: parsed.limit,
  });
  res.json({
    success: true,
    data: paged.rows,
    meta: buildPaginationMeta(paged.page, paged.limit, paged.total),
  });
}

export async function getAdminDashboardController(_req: Request, res: Response) {
  const data = await getAdminDashboard();
  res.json({ success: true, data });
}

export async function listAdminLibrariesController(_req: Request, res: Response) {
  const data = await listAdminLibraries();
  res.json({ success: true, data });
}

export async function listAdminPlanSummariesController(_req: Request, res: Response) {
  const data = await listAdminPlanSummaries();
  res.json({ success: true, data });
}

export async function listAdminPaymentsController(_req: Request, res: Response) {
  const data = await listAdminPayments();
  res.json({ success: true, data });
}
