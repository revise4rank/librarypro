import { z } from "zod";

export const createOwnerStudentBodySchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  fatherName: z.string().trim().max(150).optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  seatNumber: z.string().trim().min(1).max(40).optional().or(z.literal("")),
  planName: z.string().trim().min(2).max(120),
  planPrice: z.coerce.number().nonnegative(),
  durationMonths: z.coerce.number().int().min(1).max(60).default(1),
  nextDueDate: z.string().trim().optional().or(z.literal("")),
  startsAt: z.string().trim().min(4),
  endsAt: z.string().trim().min(4),
  paymentStatus: z.enum(["PENDING", "PAID", "DUE", "FAILED", "REFUNDED"]).default("PENDING"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const updateOwnerStudentBodySchema = createOwnerStudentBodySchema;

export const createOwnerPaymentBodySchema = z.object({
  studentName: z.string().trim().min(2).max(150),
  amount: z.coerce.number().positive(),
  method: z.string().trim().min(2).max(50),
  status: z.enum(["PENDING", "PAID", "DUE", "FAILED", "REFUNDED"]),
  dueDate: z.string().trim().optional().or(z.literal("")),
  paidAt: z.string().trim().optional().or(z.literal("")),
  referenceNo: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const updateOwnerPaymentBodySchema = createOwnerPaymentBodySchema.omit({
  studentName: true,
});

export const createOwnerNotificationBodySchema = z.object({
  title: z.string().trim().min(2).max(180),
  type: z.enum(["PAYMENT_REMINDER", "EXPIRY_ALERT", "GENERAL"]),
  audience: z.enum(["ALL_STUDENTS", "DUE_STUDENTS", "EXPIRING_STUDENTS"]),
  message: z.string().trim().min(2).max(2000),
});

export const assignSeatBodySchema = z.object({
  assignmentId: z.string().uuid(),
  seatId: z.string().uuid(),
});

export const createOwnerFloorBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  floorNumber: z.coerce.number().int().min(0).max(100),
  layoutColumns: z.coerce.number().int().min(1).max(100).default(10),
  layoutRows: z.coerce.number().int().min(1).max(100).default(10),
});

export const updateOwnerFloorBodySchema = z.object({
  name: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  layoutColumns: z.coerce.number().int().min(1).max(100).optional(),
  layoutRows: z.coerce.number().int().min(1).max(100).optional(),
  aisleCells: z.array(z.string().trim().min(3).max(20)).optional(),
  sectionColors: z.record(z.string().trim().min(1).max(80), z.string().regex(/^#[0-9a-fA-F]{6}$/)).optional(),
});

export const createOwnerSeatsBodySchema = z.object({
  floorId: z.string().uuid().optional().or(z.literal("")),
  sectionName: z.string().trim().min(1).max(80),
  seatPrefix: z.string().trim().min(1).max(20),
  customSeatCode: z.string().trim().min(1).max(40).optional().or(z.literal("")),
  startNumber: z.coerce.number().int().min(1).max(100000),
  seatCount: z.coerce.number().int().min(1).max(200),
  rowStart: z.coerce.number().int().min(1).max(1000).default(1),
  colStart: z.coerce.number().int().min(1).max(1000).default(1),
  columnsPerRow: z.coerce.number().int().min(1).max(50).default(5),
});

export const updateOwnerSeatBodySchema = z.object({
  seatCode: z.string().trim().min(1).max(40).optional().or(z.literal("")),
  sectionName: z.string().trim().min(1).max(80).optional().or(z.literal("")),
  status: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "DISABLED"]).optional(),
  reservedUntil: z.string().trim().optional().or(z.literal("")),
  posX: z.coerce.number().int().min(0).max(1000).optional(),
  posY: z.coerce.number().int().min(0).max(1000).optional(),
  markFree: z.boolean().optional().default(false),
});

export const payStudentPaymentBodySchema = z.object({
  method: z.string().trim().min(2).max(50).default("ONLINE"),
  referenceNo: z.string().trim().max(120).optional().or(z.literal("")),
});

export const ownerCheckinsQuerySchema = z.object({
  status: z.enum(["ALL", "INSIDE", "COMPLETED", "OVERSTAY"]).default("ALL"),
  search: z.string().trim().max(150).optional().default(""),
  fromDate: z.string().trim().optional().default(""),
  toDate: z.string().trim().optional().default(""),
});

export const studentQrActionBodySchema = z.object({
  qrPayload: z.string().trim().min(20),
  clientEventId: z.string().uuid().optional().or(z.literal("")),
  scannedAtDevice: z.string().trim().optional().or(z.literal("")),
});

export const createOwnerExpenseBodySchema = z.object({
  category: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(150),
  amount: z.coerce.number().positive(),
  spentOn: z.string().trim().min(4),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const ownerExpensesQuerySchema = z.object({
  month: z.string().trim().optional().default(""),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(200).optional().default(50),
});

export const ownerReportsQuerySchema = z.object({
  fromDate: z.string().trim().optional().default(""),
  toDate: z.string().trim().optional().default(""),
});

export const ownerStudentsQuerySchema = paginationQuerySchema;
export const ownerPaymentsQuerySchema = paginationQuerySchema;
export const ownerNotificationsQuerySchema = paginationQuerySchema;
export const studentPaymentsQuerySchema = paginationQuerySchema;
export const studentNotificationsQuerySchema = paginationQuerySchema;

export const ownerReportExportQuerySchema = ownerReportsQuerySchema.extend({
  reportType: z.enum(["students", "payments", "dues", "paid", "expenses", "attendance"]).default("students"),
  format: z.enum(["xlsx", "pdf"]).default("xlsx"),
});

export const updateOwnerSettingsBodySchema = z.object({
  libraryName: z.string().trim().min(2).max(180),
  address: z.string().trim().min(5).max(500),
  city: z.string().trim().min(2).max(120),
  area: z.string().trim().max(120).optional().or(z.literal("")),
  wifiName: z.string().trim().max(120).optional().or(z.literal("")),
  wifiPassword: z.string().trim().max(120).optional().or(z.literal("")),
  noticeMessage: z.string().trim().max(2000).optional().or(z.literal("")),
  allowOfflineCheckin: z.boolean().optional().default(true),
});

export const sendDueRecoveryBodySchema = z.object({
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const updateStudentFocusGoalsBodySchema = z.object({
  dailyTargetMinutes: z.coerce.number().int().min(30).max(720),
  weeklyTargetHours: z.coerce.number().int().min(1).max(80),
});

export const createStudentFocusSubjectBodySchema = z.object({
  subjectName: z.string().trim().min(2).max(120),
  topicName: z.string().trim().max(180).optional().or(z.literal("")),
  targetMinutes: z.coerce.number().int().min(15).max(1440),
});

export const createStudentFocusSessionBodySchema = z.object({
  subjectId: z.string().uuid().optional().or(z.literal("")),
  topicTitle: z.string().trim().max(180).optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(5).max(600),
  sessionType: z.enum(["POMODORO", "MANUAL", "FOCUS_MODE"]).default("POMODORO"),
});

export const createOwnerAdminBodySchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

export const ownerAuditLogsQuerySchema = paginationQuerySchema;

export const createJoinRequestBodySchema = z.object({
  qrPayload: z.string().trim().min(20),
  seatPreference: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const resolveJoinQrBodySchema = z.object({
  qrPayload: z.string().trim().min(20),
});

export const createLibraryJoinRequestBodySchema = z.object({
  libraryId: z.string().uuid(),
  seatPreference: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const studentLibrarySearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(120),
});

export const createRejoinRequestBodySchema = z.object({
  seatPreference: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const approveJoinRequestBodySchema = z.object({
  seatNumber: z.string().trim().max(40).optional().or(z.literal("")),
  planName: z.string().trim().min(2).max(120),
  planPrice: z.coerce.number().nonnegative(),
  durationMonths: z.coerce.number().int().min(1).max(60).default(1),
  nextDueDate: z.string().trim().optional().or(z.literal("")),
  startsAt: z.string().trim().min(4),
  endsAt: z.string().trim().min(4),
  paymentStatus: z.enum(["PENDING", "PAID", "DUE", "FAILED", "REFUNDED"]).default("PENDING"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const rejectJoinRequestBodySchema = z.object({
  reason: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const updateOwnerAdminPermissionsBodySchema = z.object({
  permissions: z.array(z.string().trim().min(2).max(60)).min(1).max(30),
});
