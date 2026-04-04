import crypto from "node:crypto";
import { requireDb } from "../lib/db";
import { AppError } from "../lib/errors";

export type ScanCheckInInput = {
  libraryId: string;
  studentUserId: string;
  qrRawPayload: string;
  clientEventId?: string;
  scannedAtDevice?: string;
};

type AssignmentRecord = {
  id: string;
  libraryId: string;
  seatId: string | null;
  seatNumber: string | null;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "PENDING";
  paymentStatus: "PENDING" | "PAID" | "DUE" | "FAILED" | "REFUNDED";
  startsAt: string;
  endsAt: string;
  qrKeyId: string;
  qrSecretHash: string;
};

type CheckinRow = {
  id: string;
  checked_in_at: string;
  checked_out_at: string | null;
  mode: "QR" | "MANUAL" | "SYNCED_OFFLINE";
};

async function getActiveAssignment(
  libraryId: string,
  studentUserId: string,
): Promise<AssignmentRecord | null> {
  const pool = requireDb();
  const result = await pool.query<{
    id: string;
    library_id: string;
    seat_id: string | null;
    seat_number: string | null;
    status: AssignmentRecord["status"];
    payment_status: AssignmentRecord["paymentStatus"];
    starts_at: string;
    ends_at: string;
    qr_key_id: string;
    qr_secret_hash: string;
  }>(
    `
      SELECT
        sa.id,
        sa.library_id,
        sa.seat_id,
        seats.seat_number,
        sa.status::text AS status,
        sa.payment_status::text AS payment_status,
        sa.starts_at::text AS starts_at,
        sa.ends_at::text AS ends_at,
        libraries.active_qr_key_id::text AS qr_key_id,
        libraries.qr_secret_hash
      FROM student_assignments sa
      INNER JOIN libraries ON libraries.id = sa.library_id
      LEFT JOIN seats ON seats.id = sa.seat_id
      WHERE sa.library_id = $1
        AND sa.student_user_id = $2
        AND sa.status = 'ACTIVE'
      ORDER BY sa.ends_at DESC
      LIMIT 1
    `,
    [libraryId, studentUserId],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    libraryId: row.library_id,
    seatId: row.seat_id,
    seatNumber: row.seat_number,
    status: row.status,
    paymentStatus: row.payment_status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    qrKeyId: row.qr_key_id,
    qrSecretHash: row.qr_secret_hash,
  };
}

async function getOpenCheckin(libraryId: string, studentUserId: string): Promise<CheckinRow | null> {
  const pool = requireDb();
  const result = await pool.query<CheckinRow>(
    `
      SELECT id, checked_in_at::text, checked_out_at::text, mode::text AS mode
      FROM checkins
      WHERE library_id = $1
        AND student_user_id = $2
        AND checked_out_at IS NULL
      ORDER BY checked_in_at DESC
      LIMIT 1
    `,
    [libraryId, studentUserId],
  );

  return result.rows[0] ?? null;
}

async function checkoutOpenCheckin(input: {
  libraryId: string;
  studentUserId: string;
  scannedAtDevice?: string;
}) {
  const pool = requireDb();
  const result = await pool.query<{
    id: string;
    checked_out_at: string;
  }>(
    `
      UPDATE checkins
      SET
        checked_out_at = NOW(),
        device_time = COALESCE($3::timestamptz, device_time),
        updated_at = NOW()
      WHERE id = (
        SELECT id
        FROM checkins
        WHERE library_id = $1
          AND student_user_id = $2
          AND checked_out_at IS NULL
        ORDER BY checked_in_at DESC
        LIMIT 1
      )
      RETURNING id, checked_out_at::text
    `,
    [input.libraryId, input.studentUserId, input.scannedAtDevice ?? null],
  );

  return result.rows[0] ?? null;
}

async function insertCheckin(input: {
  libraryId: string;
  studentUserId: string;
  assignmentId: string;
  seatId: string | null;
  clientEventId?: string;
  scannedAtDevice?: string;
  qrKeyId: string;
  mode: "QR" | "SYNCED_OFFLINE";
}) {
  const pool = requireDb();

  if (input.clientEventId) {
    const existing = await pool.query<{
      id: string;
      checked_in_at: string;
      assignment_id: string | null;
      seat_id: string | null;
      qr_key_id: string | null;
      mode: "QR" | "MANUAL" | "SYNCED_OFFLINE";
      client_event_id: string | null;
      device_time: string | null;
    }>(
      `
        SELECT
          id,
          checked_in_at::text,
          assignment_id::text,
          seat_id::text,
          qr_key_id::text,
          mode::text AS mode,
          client_event_id::text,
          device_time::text
        FROM checkins
        WHERE library_id = $1
          AND client_event_id = $2::uuid
        LIMIT 1
      `,
      [input.libraryId, input.clientEventId],
    );

    if (existing.rows[0]) {
      const row = existing.rows[0];
      return {
        id: row.id,
        checkedInAt: row.checked_in_at,
        assignmentId: row.assignment_id,
        seatId: row.seat_id,
        qrKeyId: row.qr_key_id,
        mode: row.mode,
        clientEventId: row.client_event_id,
        scannedAtDevice: row.device_time,
      };
    }
  }

  const result = await pool.query<{
    id: string;
    checked_in_at: string;
  }>(
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
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5::checkin_mode,
        $6::uuid,
        NOW(),
        $7::timestamptz,
        $8::uuid
      )
      RETURNING id, checked_in_at::text
    `,
    [
      input.libraryId,
      input.studentUserId,
      input.assignmentId,
      input.seatId,
      input.mode,
      input.clientEventId ?? null,
      input.scannedAtDevice ?? null,
      input.qrKeyId,
    ],
  );

  return {
    id: result.rows[0].id,
    checkedInAt: result.rows[0].checked_in_at,
    assignmentId: input.assignmentId,
    seatId: input.seatId,
    qrKeyId: input.qrKeyId,
    mode: input.mode,
    clientEventId: input.clientEventId ?? null,
    scannedAtDevice: input.scannedAtDevice ?? null,
  };
}

type ParsedQrPayload = {
  libraryId: string;
  qrKeyId: string;
  nonce: string;
  signature: string;
};

function parseQrPayload(rawPayload: string): ParsedQrPayload {
  try {
    return JSON.parse(Buffer.from(rawPayload, "base64url").toString("utf8")) as ParsedQrPayload;
  } catch {
    throw new AppError(400, "Invalid QR payload", "INVALID_QR_PAYLOAD");
  }
}

function verifyQrPayload(rawPayload: string, assignment: AssignmentRecord) {
  const parsed = parseQrPayload(rawPayload);

  if (parsed.libraryId !== assignment.libraryId) {
    throw new AppError(400, "QR library mismatch", "QR_LIBRARY_MISMATCH");
  }

  if (parsed.qrKeyId !== assignment.qrKeyId) {
    throw new AppError(400, "QR key mismatch", "QR_KEY_MISMATCH");
  }

  const expectedSignature = crypto
    .createHmac("sha256", assignment.qrSecretHash)
    .update(`${parsed.libraryId}:${parsed.qrKeyId}:${parsed.nonce}`)
    .digest("hex");

  const provided = Buffer.from(parsed.signature, "hex");
  const expected = Buffer.from(expectedSignature, "hex");

  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    throw new AppError(401, "QR signature verification failed", "QR_SIGNATURE_INVALID");
  }

  return parsed;
}

function buildQrPayload(libraryId: string, qrKeyId: string, qrSecretHash: string) {
  const nonce = crypto.randomBytes(16).toString("hex");
  const signature = crypto
    .createHmac("sha256", qrSecretHash)
    .update(`${libraryId}:${qrKeyId}:${nonce}`)
    .digest("hex");

  const payload = {
    libraryId,
    qrKeyId,
    nonce,
    signature,
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export async function getStudentEntryQr(libraryId: string, studentUserId: string) {
  const assignment = await getActiveAssignment(libraryId, studentUserId);
  if (!assignment) {
    throw new AppError(404, "No active assignment found", "ASSIGNMENT_NOT_FOUND");
  }

  return {
    assignmentId: assignment.id,
    seatId: assignment.seatId,
    seatNumber: assignment.seatNumber,
    validFrom: assignment.startsAt,
    validUntil: assignment.endsAt,
    qrKeyId: assignment.qrKeyId,
    qrPayload: buildQrPayload(assignment.libraryId, assignment.qrKeyId, assignment.qrSecretHash),
  };
}

export async function scanCheckIn(input: ScanCheckInInput) {
  const assignment = await getActiveAssignment(input.libraryId, input.studentUserId);
  if (!assignment) {
    throw new AppError(404, "No active assignment found", "ASSIGNMENT_NOT_FOUND");
  }

  if (assignment.status !== "ACTIVE") {
    throw new AppError(403, "Assignment is not active", "ASSIGNMENT_INACTIVE");
  }

  if (!["PAID", "PENDING", "DUE"].includes(assignment.paymentStatus)) {
    throw new AppError(403, "Payment status does not permit entry", "PAYMENT_BLOCKED");
  }

  const now = Date.now();
  if (now < new Date(assignment.startsAt).getTime() || now > new Date(assignment.endsAt).getTime()) {
    throw new AppError(403, "Plan validity expired", "PLAN_EXPIRED");
  }

  verifyQrPayload(input.qrRawPayload, assignment);

  const openVisit = await getOpenCheckin(input.libraryId, input.studentUserId);
  if (openVisit) {
    throw new AppError(409, "Student already checked in", "ALREADY_CHECKED_IN");
  }

  return insertCheckin({
    libraryId: input.libraryId,
    studentUserId: input.studentUserId,
    assignmentId: assignment.id,
    seatId: assignment.seatId,
    clientEventId: input.clientEventId,
    scannedAtDevice: input.scannedAtDevice,
    qrKeyId: assignment.qrKeyId,
    mode: input.clientEventId ? "SYNCED_OFFLINE" : "QR",
  });
}

export async function scanCheckOut(input: ScanCheckInInput) {
  const assignment = await getActiveAssignment(input.libraryId, input.studentUserId);
  if (!assignment) {
    throw new AppError(404, "No active assignment found", "ASSIGNMENT_NOT_FOUND");
  }

  verifyQrPayload(input.qrRawPayload, assignment);

  const openVisit = await getOpenCheckin(input.libraryId, input.studentUserId);
  if (!openVisit) {
    throw new AppError(409, "No active check-in to close", "CHECKOUT_NOT_ALLOWED");
  }

  const checkout = await checkoutOpenCheckin({
    libraryId: input.libraryId,
    studentUserId: input.studentUserId,
    scannedAtDevice: input.scannedAtDevice,
  });

  if (!checkout) {
    throw new AppError(409, "No active check-in to close", "CHECKOUT_NOT_ALLOWED");
  }

  return {
    id: checkout.id,
    checkedOutAt: checkout.checked_out_at,
    assignmentId: assignment.id,
    seatId: assignment.seatId,
    qrKeyId: assignment.qrKeyId,
    mode: input.clientEventId ? "SYNCED_OFFLINE" : "QR",
    clientEventId: input.clientEventId ?? null,
    scannedAtDevice: input.scannedAtDevice ?? null,
  };
}
