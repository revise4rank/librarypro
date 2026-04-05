import { hashPassword } from "../lib/auth";
import { buildPdfBuffer, buildXlsxBuffer } from "../lib/report-exports";
import { requireDb } from "../lib/db";
import { AppError } from "../lib/errors";
import { createOwnerNotificationCampaign } from "./owner-notifications.service";
import { getLibraryEntryQr } from "./checkin.service";
import { OwnerOperationsRepository } from "../repositories/owner-operations.repository";
import crypto from "node:crypto";

function repository() {
  return new OwnerOperationsRepository(requireDb());
}

function buildStudentCode(fullName: string) {
  const prefix = fullName
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, "S");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}${suffix}`;
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

export async function createOwnerStudent(input: {
  libraryId: string;
  actorUserId: string;
  fullName: string;
  fatherName?: string;
  email?: string;
  phone?: string;
  seatNumber?: string;
  planName: string;
  planPrice: number;
  durationMonths: number;
  nextDueDate?: string;
  startsAt: string;
  endsAt: string;
  paymentStatus: "PENDING" | "PAID" | "DUE" | "FAILED" | "REFUNDED";
  notes?: string;
}) {
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
      const created = await repo.createStudent(client, {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        studentCode,
        passwordHash,
      });
      student = {
        id: created.id,
        full_name: input.fullName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        student_code: studentCode,
      };
      isNewStudent = true;
    }

    await repo.ensureStudentRole(client, student.id, input.libraryId);

    let seatId: string | null = null;
    if (input.seatNumber) {
      const seat = await repo.findSeatByNumber(client, input.libraryId, input.seatNumber);
      if (!seat) {
        throw new AppError(404, "Seat not found for this library", "SEAT_NOT_FOUND");
      }
      seatId = seat.id;
      await repo.updateSeatStatus(client, seat.id, "OCCUPIED");
    }

    const assignment = await repo.createAssignment(client, {
      libraryId: input.libraryId,
      studentUserId: student.id,
      seatId,
      fatherName: input.fatherName,
      planName: input.planName,
      planPrice: input.planPrice,
      durationMonths: input.durationMonths,
      nextDueDate: input.nextDueDate,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      paymentStatus: input.paymentStatus,
      assignedBy: input.actorUserId,
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
  fatherName?: string;
  email?: string;
  phone?: string;
  seatNumber?: string;
  planName: string;
  planPrice: number;
  durationMonths: number;
  nextDueDate?: string;
  startsAt: string;
  endsAt: string;
  paymentStatus: "PENDING" | "PAID" | "DUE" | "FAILED" | "REFUNDED";
  notes?: string;
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
    });

    let nextSeatId: string | null = null;
    if (input.seatNumber) {
      const seat = await repo.findSeatByNumber(client, input.libraryId, input.seatNumber);
      if (!seat) {
        throw new AppError(404, "Seat not found for this library", "SEAT_NOT_FOUND");
      }

      const occupant = await repo.findActiveAssignmentBySeatId(client, input.libraryId, seat.id);
      if (occupant && occupant.id !== input.assignmentId) {
        throw new AppError(409, "Seat is already assigned to another student", "SEAT_ALREADY_OCCUPIED");
      }

      nextSeatId = seat.id;
      await repo.updateSeatStatus(client, seat.id, "OCCUPIED");
    }

    if (assignment.seat_id && assignment.seat_id !== nextSeatId) {
      await repo.updateSeatStatus(client, assignment.seat_id, "AVAILABLE");
    }

    await repo.updateAssignment(client, {
      assignmentId: input.assignmentId,
      seatId: nextSeatId,
      planName: input.planName,
      planPrice: input.planPrice,
      fatherName: input.fatherName,
      durationMonths: input.durationMonths,
      nextDueDate: input.nextDueDate,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      paymentStatus: input.paymentStatus,
      notes: input.notes,
    });
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
  studentName: string;
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
    const student = await repo.findStudentByName(client, input.libraryId, input.studentName);
    if (!student) {
      throw new AppError(404, "Student not found in this library", "STUDENT_NOT_FOUND");
    }

    const payment = await repo.createPayment(client, {
      libraryId: input.libraryId,
      studentUserId: student.student_user_id,
      assignmentId: student.assignment_id,
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

export async function listOwnerSeats(libraryId: string) {
  return repository().listSeats(libraryId);
}

export async function listOwnerFloors(libraryId: string) {
  return repository().listFloors(libraryId);
}

export async function createOwnerFloor(input: {
  libraryId: string;
  name: string;
  floorNumber: number;
  layoutColumns: number;
  layoutRows: number;
  layoutMeta?: { aisleCells?: string[]; sectionColors?: Record<string, string> } | null;
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
  layoutMeta?: { aisleCells?: string[]; sectionColors?: Record<string, string> } | null;
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
        seatNumber,
        sectionName: input.sectionName,
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
    title: "Nextlib Payment Receipt",
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

export async function listAdminPlanSummaries() {
  return repository().listAdminPlanSummaries();
}

export async function listAdminPayments() {
  return repository().listAdminPayments();
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
    const buffer = buildXlsxBuffer({
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
    title: `${title} | Nextlib`,
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
  seatNumber?: string;
  planName: string;
  planPrice: number;
  durationMonths: number;
  nextDueDate?: string;
  startsAt: string;
  endsAt: string;
  paymentStatus: "PENDING" | "PAID" | "DUE" | "FAILED" | "REFUNDED";
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

    let seatId: string | null = null;
    if (input.seatNumber) {
      const seat = await repo.findSeatByNumber(client, input.libraryId, input.seatNumber);
      if (!seat) {
        throw new AppError(404, "Seat not found for this library", "SEAT_NOT_FOUND");
      }
      seatId = seat.id;
      await repo.updateSeatStatus(client, seat.id, "OCCUPIED");
    }

    await repo.ensureStudentRole(client, request.student_user_id, input.libraryId);
    const assignment = await repo.createAssignment(client, {
      libraryId: input.libraryId,
      studentUserId: request.student_user_id,
      seatId,
      planName: input.planName,
      planPrice: input.planPrice,
      durationMonths: input.durationMonths,
      nextDueDate: input.nextDueDate,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      paymentStatus: input.paymentStatus,
      assignedBy: input.actorUserId,
      notes: input.notes,
    });
    const payment = await repo.createPayment(client, {
      libraryId: input.libraryId,
      studentUserId: request.student_user_id,
      assignmentId: assignment.id,
      amount: input.planPrice,
      status: input.paymentStatus,
      method: input.paymentStatus === "PAID" ? "CASH" : "PENDING_DESK_COLLECTION",
      dueDate: input.nextDueDate ?? null,
      paidAt: input.paymentStatus === "PAID" ? new Date().toISOString() : null,
      referenceNo: null,
      notes: input.notes ?? "Admission created from QR join request",
      createdBy: input.actorUserId,
    });
    await repo.updateJoinRequestStatus(client, {
      libraryId: input.libraryId,
      requestId: input.requestId,
      status: "APPROVED",
      reviewedBy: input.actorUserId,
      linkedAssignmentId: assignment.id,
    });
    await repo.refreshLibrarySeatCounts(client, input.libraryId);
    await client.query("COMMIT");
    return { assignmentId: assignment.id, paymentId: payment.id };
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
