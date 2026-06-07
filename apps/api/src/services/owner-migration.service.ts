import crypto from "node:crypto";
import ExcelJS from "exceljs";
import { hashPassword } from "../lib/auth";
import { createAuditLog } from "../lib/audit";
import { requireDb } from "../lib/db";
import { AppError } from "../lib/errors";
import { buildPdfBuffer } from "../lib/report-exports";
import { ensureLibraryReferralCode, ensureUserReferralCode, generateUniqueReferralCode } from "../lib/referral-code";
import type { PoolClient } from "pg";

type MigrationRowData = Record<string, string>;

type NormalizedMigrationRow = {
  studentName: string;
  mobile: string;
  email: string;
  studentCode: string;
  fatherName: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  className: string;
  preparingFor: string;
  floorName: string;
  roomName: string;
  seatCode: string;
  planCode: string;
  planName: string;
  planType: "MONTHLY" | "DAY_WISE" | "SHIFT_HOURS";
  durationMonths: number;
  durationDays: number | null;
  shiftStartTime: string;
  shiftEndTime: string;
  allowedHours: number | null;
  planAmount: number;
  paymentStatus: "PAID" | "UNPAID" | "DUE";
  paidAmount: number | null;
  dueAmount: number | null;
  paymentMethod: string;
  paymentDate: string;
  startDate: string;
  endDate: string;
  notes: string;
};

type PreviewRow = {
  rowNumber: number;
  raw: MigrationRowData;
  normalized: NormalizedMigrationRow;
  fingerprint: string;
  action: "CREATE_STUDENT" | "UPDATE_STUDENT";
  errors: string[];
  warnings: string[];
};

const headers = [
  "studentName",
  "mobile",
  "email",
  "studentCode",
  "fatherName",
  "dateOfBirth",
  "gender",
  "address",
  "className",
  "preparingFor",
  "floorName",
  "roomName",
  "seatCode",
  "planCode",
  "planName",
  "planType",
  "durationMonths",
  "durationDays",
  "shiftStartTime",
  "shiftEndTime",
  "allowedHours",
  "planAmount",
  "paymentStatus",
  "paidAmount",
  "dueAmount",
  "paymentMethod",
  "paymentDate",
  "startDate",
  "endDate",
  "notes",
];

const headerAliases: Record<string, keyof NormalizedMigrationRow | "studentName"> = {
  studentname: "studentName",
  name: "studentName",
  fullname: "studentName",
  mobile: "mobile",
  phone: "mobile",
  email: "email",
  studentcode: "studentCode",
  loginid: "studentCode",
  fathername: "fatherName",
  father: "fatherName",
  dateofbirth: "dateOfBirth",
  dob: "dateOfBirth",
  gender: "gender",
  address: "address",
  classname: "className",
  class: "className",
  preparingfor: "preparingFor",
  exam: "preparingFor",
  floorname: "floorName",
  floor: "floorName",
  roomname: "roomName",
  room: "roomName",
  seatcode: "seatCode",
  seat: "seatCode",
  seatnumber: "seatCode",
  plancode: "planCode",
  planname: "planName",
  plan: "planName",
  plantype: "planType",
  durationmonths: "durationMonths",
  durationdays: "durationDays",
  shiftstarttime: "shiftStartTime",
  shiftendtime: "shiftEndTime",
  allowedhours: "allowedHours",
  planamount: "planAmount",
  amount: "planAmount",
  paymentstatus: "paymentStatus",
  paidamount: "paidAmount",
  dueamount: "dueAmount",
  paymentmethod: "paymentMethod",
  paymentdate: "paymentDate",
  startdate: "startDate",
  enddate: "endDate",
  notes: "notes",
};

function cleanHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function parseCsv(buffer: Buffer) {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }
  row.push(current);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

async function parseXlsx(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const rows: string[][] = [];
  sheet.eachRow((worksheetRow) => {
    const cells: string[] = [];
    worksheetRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cells[colNumber - 1] = cleanText(cell.value);
    });
    if (cells.some((cell) => cleanText(cell) !== "")) rows.push(cells.map(cleanText));
  });
  return rows;
}

function rowsToObjects(rows: string[][]) {
  const [headerRow, ...dataRows] = rows;
  if (!headerRow) return [];
  const mapped = headerRow.map((header) => headerAliases[cleanHeader(header)] ?? cleanHeader(header));
  return dataRows.map((cells, index) => {
    const item: MigrationRowData = {};
    mapped.forEach((key, cellIndex) => {
      if (typeof key === "string" && headers.includes(key)) item[key] = cleanText(cells[cellIndex]);
    });
    return { rowNumber: index + 2, raw: item };
  });
}

function parseNumber(value: string, fallback = 0) {
  const numeric = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function normalizeGender(value: string) {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "_");
  if (["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"].includes(normalized)) return normalized;
  if (normalized === "M") return "MALE";
  if (normalized === "F") return "FEMALE";
  return normalized;
}

function normalizePaymentStatus(value: string): "PAID" | "UNPAID" | "DUE" {
  const normalized = value.trim().toUpperCase();
  if (normalized === "PAID") return "PAID";
  if (normalized === "DUE") return "DUE";
  return "UNPAID";
}

function normalizePlanType(value: string): "MONTHLY" | "DAY_WISE" | "SHIFT_HOURS" {
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (normalized === "DAY_WISE" || normalized === "SHIFT_HOURS") return normalized;
  return "MONTHLY";
}

function normalizeRow(raw: MigrationRowData): NormalizedMigrationRow {
  const planType = normalizePlanType(raw.planType ?? "");
  return {
    studentName: cleanText(raw.studentName),
    mobile: cleanText(raw.mobile),
    email: cleanText(raw.email).toLowerCase(),
    studentCode: cleanText(raw.studentCode).toUpperCase(),
    fatherName: cleanText(raw.fatherName),
    dateOfBirth: normalizeDate(cleanText(raw.dateOfBirth)),
    gender: raw.gender ? normalizeGender(raw.gender) : "",
    address: cleanText(raw.address),
    className: cleanText(raw.className),
    preparingFor: cleanText(raw.preparingFor),
    floorName: cleanText(raw.floorName),
    roomName: cleanText(raw.roomName),
    seatCode: cleanText(raw.seatCode).toUpperCase(),
    planCode: cleanText(raw.planCode),
    planName: cleanText(raw.planName),
    planType,
    durationMonths: Math.max(1, Math.round(parseNumber(raw.durationMonths ?? "", 1))),
    durationDays: raw.durationDays ? Math.max(1, Math.round(parseNumber(raw.durationDays, 0))) : null,
    shiftStartTime: cleanText(raw.shiftStartTime),
    shiftEndTime: cleanText(raw.shiftEndTime),
    allowedHours: raw.allowedHours ? parseNumber(raw.allowedHours, 0) : null,
    planAmount: Math.max(0, parseNumber(raw.planAmount ?? raw.paidAmount ?? raw.dueAmount ?? "", 0)),
    paymentStatus: normalizePaymentStatus(raw.paymentStatus ?? ""),
    paidAmount: raw.paidAmount ? Math.max(0, parseNumber(raw.paidAmount, 0)) : null,
    dueAmount: raw.dueAmount ? Math.max(0, parseNumber(raw.dueAmount, 0)) : null,
    paymentMethod: cleanText(raw.paymentMethod) || "MIGRATION",
    paymentDate: normalizeDate(cleanText(raw.paymentDate)),
    startDate: normalizeDate(cleanText(raw.startDate)) || new Date().toISOString().slice(0, 10),
    endDate: normalizeDate(cleanText(raw.endDate)),
    notes: cleanText(raw.notes),
  };
}

function rowFingerprint(row: NormalizedMigrationRow) {
  return crypto.createHash("sha256").update(JSON.stringify({
    studentCode: row.studentCode,
    mobile: row.mobile,
    email: row.email,
    planName: row.planName,
    floorName: row.floorName,
    roomName: row.roomName,
    seatCode: row.seatCode,
    startDate: row.startDate,
    endDate: row.endDate,
    paymentStatus: row.paymentStatus,
    amount: row.planAmount,
  })).digest("hex");
}

function validateRow(row: NormalizedMigrationRow) {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!row.studentName) errors.push("studentName is required.");
  if (!row.mobile) errors.push("mobile is required.");
  if (!row.planName) errors.push("planName is required.");
  if (!["PAID", "UNPAID", "DUE"].includes(row.paymentStatus)) errors.push("paymentStatus must be PAID, UNPAID, or DUE.");
  if (row.gender && !["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"].includes(row.gender)) errors.push("gender must be MALE, FEMALE, OTHER, or PREFER_NOT_TO_SAY.");
  if (row.dateOfBirth && Number.isNaN(new Date(row.dateOfBirth).getTime())) errors.push("dateOfBirth is invalid.");
  if (row.seatCode && (!row.floorName || !row.roomName)) errors.push("floorName and roomName are required when seatCode is provided.");
  if (row.roomName && !row.floorName) errors.push("floorName is required when roomName is provided.");
  if (row.planAmount <= 0) warnings.push("planAmount is blank or zero; student will be imported with Rs. 0 plan amount.");
  if (row.paymentStatus === "PAID" && !row.paymentDate) warnings.push("paymentDate is blank; import date will be used as paid date.");
  return { errors, warnings };
}

async function parseUpload(file: Express.Multer.File) {
  const fileName = file.originalname.toLowerCase();
  if (fileName.endsWith(".xls") && !fileName.endsWith(".xlsx")) {
    throw new AppError(400, "Legacy .xls files are not supported. Save as CSV or XLSX.", "UNSUPPORTED_LEGACY_XLS");
  }
  const tableRows = fileName.endsWith(".csv") || file.mimetype.toLowerCase().includes("csv")
    ? parseCsv(file.buffer)
    : await parseXlsx(file.buffer);
  return rowsToObjects(tableRows);
}

function addToSummary(summary: Record<string, number>, key: string) {
  summary[key] = (summary[key] ?? 0) + 1;
}

async function inspectExistingState(client: PoolClient, libraryId: string, row: NormalizedMigrationRow) {
  const user = await client.query<{ id: string }>(
    `
    SELECT id::text
    FROM users
    WHERE ($1::text <> '' AND upper(COALESCE(student_code, '')) = upper($1))
       OR ($2::text <> '' AND phone = $2)
       OR ($3::text <> '' AND lower(COALESCE(email, '')) = lower($3))
    LIMIT 1
    `,
    [row.studentCode, row.mobile, row.email],
  );
  const plan = await client.query<{ id: string }>(
    `
    SELECT id::text
    FROM library_student_plans
    WHERE library_id = $1 AND lower(name) = lower($2)
    LIMIT 1
    `,
    [libraryId, row.planName],
  );
  const floor = row.floorName
    ? await client.query<{ id: string }>("SELECT id::text FROM library_floors WHERE library_id = $1 AND lower(name) = lower($2) LIMIT 1", [libraryId, row.floorName])
    : { rows: [] };
  const room = row.roomName && floor.rows[0]
    ? await client.query<{ id: string }>("SELECT id::text FROM library_rooms WHERE library_id = $1 AND floor_id = $2 AND lower(name) = lower($3) LIMIT 1", [libraryId, floor.rows[0].id, row.roomName])
    : { rows: [] };
  const canScopeSeat = Boolean(row.seatCode && (!row.floorName || floor.rows[0]) && (!row.roomName || room.rows[0]));
  const exactSeat = canScopeSeat
    ? await client.query<{ id: string; student_user_id: string | null }>(
      `
      SELECT s.id::text, sa.student_user_id::text
      FROM seats s
      LEFT JOIN student_assignments sa ON sa.seat_id = s.id AND sa.library_id = s.library_id AND sa.status = 'ACTIVE'
      WHERE s.library_id = $1
        AND upper(s.seat_number) = upper($2)
        AND ($3::uuid IS NULL OR s.floor_id = $3)
        AND ($4::uuid IS NULL OR s.room_id = $4)
      LIMIT 1
      `,
      [libraryId, row.seatCode, floor.rows[0]?.id ?? null, room.rows[0]?.id ?? null],
    )
    : { rows: [] };
  const seat = exactSeat.rows[0] || !row.seatCode
    ? exactSeat
    : await client.query<{ id: string; student_user_id: string | null }>(
      `
      SELECT s.id::text, sa.student_user_id::text
      FROM seats s
      LEFT JOIN student_assignments sa ON sa.seat_id = s.id AND sa.library_id = s.library_id AND sa.status = 'ACTIVE'
      WHERE s.library_id = $1
        AND upper(s.seat_number) = upper($2)
      LIMIT 1
      `,
      [libraryId, row.seatCode],
    );
  return {
    studentExists: Boolean(user.rows[0]),
    planExists: Boolean(plan.rows[0]),
    floorExists: !row.floorName || Boolean(floor.rows[0]),
    roomExists: !row.roomName || Boolean(room.rows[0]),
    seatExists: !row.seatCode || Boolean(seat.rows[0]),
    seatOccupiedBy: seat.rows[0]?.student_user_id ?? null,
    matchingUserId: user.rows[0]?.id ?? null,
  };
}

export async function downloadOwnerMigrationTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BookLib";
  workbook.title = "BookLib library migration template";
  const sheet = workbook.addWorksheet("Student Migration");
  sheet.columns = headers.map((header) => ({ header, key: header, width: Math.max(16, header.length + 2) }));
  sheet.addRow({
    studentName: "Aman Singh",
    mobile: "9876543210",
    email: "aman@example.com",
    fatherName: "Raj Singh",
    dateOfBirth: "2005-04-10",
    gender: "MALE",
    floorName: "Ground Floor",
    roomName: "Reading Hall",
    seatCode: "A1",
    planName: "Monthly Plan",
    planType: "MONTHLY",
    durationMonths: 1,
    planAmount: 999,
    paymentStatus: "PAID",
    paidAmount: 999,
    paymentMethod: "CASH",
    paymentDate: new Date().toISOString().slice(0, 10),
    startDate: new Date().toISOString().slice(0, 10),
    notes: "Sample row. Delete before upload.",
  });
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const instructions = workbook.addWorksheet("Instructions");
  instructions.columns = [{ header: "Field", key: "field", width: 26 }, { header: "Rule", key: "rule", width: 80 }];
  [
    ["Required", "studentName, mobile, planName, paymentStatus. studentCode/email can help matching, but mobile is required."],
    ["paymentStatus", "Allowed: PAID, UNPAID, DUE."],
    ["gender", "Allowed: MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY."],
    ["Seat import", "If seatCode is provided, floorName and roomName are required. Missing floor/room/seat will be auto-created."],
    ["Duplicate student", "Matched by studentCode, then mobile, then email. Existing student is updated, not duplicated."],
    ["Plans", "Plans are matched by planName. Missing plans are created."],
    ["Existing passwords", "Existing student passwords are not exposed. New students get generated temporary passwords."],
  ].forEach(([field, rule]) => instructions.addRow({ field, rule }));
  instructions.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

export async function previewOwnerMigration(input: { libraryId: string; actorUserId: string; file: Express.Multer.File }) {
  const parsed = await parseUpload(input.file);
  if (parsed.length === 0) throw new AppError(400, "No student rows found in uploaded file.", "EMPTY_MIGRATION_FILE");
  if (parsed.length > 1000) throw new AppError(400, "Upload max 1000 rows at a time.", "MIGRATION_TOO_LARGE");

  const db = requireDb();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const jobResult = await client.query<{ id: string }>(
      `
      INSERT INTO library_migration_jobs (library_id, actor_user_id, file_name, status)
      VALUES ($1, $2, $3, 'DRAFT')
      RETURNING id::text
      `,
      [input.libraryId, input.actorUserId, input.file.originalname],
    );
    const jobId = jobResult.rows[0].id;
    const summary: Record<string, number> = {
      totalRows: parsed.length,
      studentsToCreate: 0,
      studentsToUpdate: 0,
      floorsToCreate: 0,
      roomsToCreate: 0,
      seatsToCreate: 0,
      plansToCreate: 0,
      paymentsToCreate: 0,
      errorRows: 0,
      warningRows: 0,
    };
    const seenStudents = new Set<string>();
    const seenSeats = new Set<string>();
    const previewRows: PreviewRow[] = [];

    for (const item of parsed) {
      const normalized = normalizeRow(item.raw);
      const validation = validateRow(normalized);
      const studentKey = normalized.studentCode || normalized.mobile || normalized.email;
      const seatKey = normalized.seatCode;
      if (studentKey && seenStudents.has(studentKey.toLowerCase())) validation.errors.push("Duplicate student in uploaded file.");
      if (seatKey && seenSeats.has(seatKey.toLowerCase())) validation.errors.push("Duplicate seat in uploaded file.");
      seenStudents.add(studentKey.toLowerCase());
      if (seatKey) seenSeats.add(seatKey.toLowerCase());

      const existing = await inspectExistingState(client, input.libraryId, normalized);
      if (existing.seatOccupiedBy && existing.seatOccupiedBy !== existing.matchingUserId) {
        validation.errors.push(`Seat ${normalized.seatCode} is already assigned to another student.`);
      }
      const action = existing.studentExists ? "UPDATE_STUDENT" : "CREATE_STUDENT";
      if (action === "CREATE_STUDENT") addToSummary(summary, "studentsToCreate");
      else addToSummary(summary, "studentsToUpdate");
      if (!existing.planExists) addToSummary(summary, "plansToCreate");
      if (!existing.floorExists) addToSummary(summary, "floorsToCreate");
      if (!existing.roomExists) addToSummary(summary, "roomsToCreate");
      if (!existing.seatExists) addToSummary(summary, "seatsToCreate");
      addToSummary(summary, "paymentsToCreate");
      if (validation.errors.length) addToSummary(summary, "errorRows");
      if (validation.warnings.length) addToSummary(summary, "warningRows");

      const fingerprint = rowFingerprint(normalized);
      previewRows.push({ rowNumber: item.rowNumber, raw: item.raw, normalized, fingerprint, action, ...validation });
      await client.query(
        `
        INSERT INTO library_migration_rows (job_id, library_id, row_number, raw_data, normalized_data, row_fingerprint, status, action, errors, warnings)
        VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, 'PENDING', $7, $8, $9)
        `,
        [jobId, input.libraryId, item.rowNumber, JSON.stringify(item.raw), JSON.stringify(normalized), fingerprint, action, validation.errors, validation.warnings],
      );
    }

    await client.query(
      `
      UPDATE library_migration_jobs
      SET summary = $2::jsonb, error_count = $3, warning_count = $4, updated_at = NOW()
      WHERE id = $1
      `,
      [jobId, JSON.stringify(summary), summary.errorRows, summary.warningRows],
    );
    await client.query("COMMIT");
    await createAuditLog({
      actorUserId: input.actorUserId,
      libraryId: input.libraryId,
      action: "migration.preview.created",
      entityType: "library_migration_job",
      entityId: jobId,
      metadata: summary,
    });
    return { jobId, summary, rows: previewRows.slice(0, 200) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function findOrCreateFloor(client: PoolClient, libraryId: string, floorName: string) {
  if (!floorName) return null;
  const existing = await client.query<{ id: string }>("SELECT id::text FROM library_floors WHERE library_id = $1 AND lower(name) = lower($2) LIMIT 1", [libraryId, floorName]);
  if (existing.rows[0]) return existing.rows[0].id;
  const floorNumber = await client.query<{ next_number: number }>("SELECT COALESCE(MAX(floor_number), 0) + 1 AS next_number FROM library_floors WHERE library_id = $1", [libraryId]);
  const created = await client.query<{ id: string }>(
    `
    INSERT INTO library_floors (library_id, name, floor_number, layout_columns, layout_rows, layout_meta)
    VALUES ($1, $2, $3, 12, 8, '{}'::jsonb)
    RETURNING id::text
    `,
    [libraryId, floorName, floorNumber.rows[0]?.next_number ?? 1],
  );
  return created.rows[0].id;
}

async function findOrCreateRoom(client: PoolClient, libraryId: string, floorId: string | null, roomName: string) {
  if (!roomName || !floorId) return null;
  const existing = await client.query<{ id: string }>(
    "SELECT id::text FROM library_rooms WHERE library_id = $1 AND floor_id = $2 AND lower(name) = lower($3) LIMIT 1",
    [libraryId, floorId, roomName],
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const created = await client.query<{ id: string }>(
    `
    INSERT INTO library_rooms (library_id, floor_id, name, sort_order, status)
    VALUES ($1, $2, $3, 0, 'ACTIVE')
    RETURNING id::text
    `,
    [libraryId, floorId, roomName],
  );
  return created.rows[0].id;
}

async function findOrCreateSeat(client: PoolClient, libraryId: string, floorId: string | null, roomId: string | null, row: NormalizedMigrationRow) {
  if (!row.seatCode) return null;
  const existing = await client.query<{ id: string; student_user_id: string | null }>(
    `
    SELECT s.id::text, sa.student_user_id::text
    FROM seats s
    LEFT JOIN student_assignments sa ON sa.seat_id = s.id AND sa.library_id = s.library_id AND sa.status = 'ACTIVE'
    WHERE s.library_id = $1
      AND upper(s.seat_number) = upper($2)
      AND ($3::uuid IS NULL OR s.floor_id = $3)
      AND ($4::uuid IS NULL OR s.room_id = $4)
    LIMIT 1
    `,
    [libraryId, row.seatCode, floorId, roomId],
  );
  if (existing.rows[0]) {
    await client.query("UPDATE seats SET floor_id = COALESCE($2, floor_id), room_id = COALESCE($3, room_id), label = COALESCE($4, label), updated_at = NOW() WHERE id = $1", [existing.rows[0].id, floorId, roomId, row.roomName || null]);
    return existing.rows[0].id;
  }
  const existingByCode = await client.query<{ id: string; student_user_id: string | null }>(
    `
    SELECT s.id::text, sa.student_user_id::text
    FROM seats s
    LEFT JOIN student_assignments sa ON sa.seat_id = s.id AND sa.library_id = s.library_id AND sa.status = 'ACTIVE'
    WHERE s.library_id = $1
      AND upper(s.seat_number) = upper($2)
    LIMIT 1
    `,
    [libraryId, row.seatCode],
  );
  if (existingByCode.rows[0]) {
    await client.query("UPDATE seats SET floor_id = COALESCE($2, floor_id), room_id = COALESCE($3, room_id), label = COALESCE($4, label), updated_at = NOW() WHERE id = $1", [existingByCode.rows[0].id, floorId, roomId, row.roomName || null]);
    return existingByCode.rows[0].id;
  }
  const count = await client.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM seats WHERE library_id = $1 AND room_id = $2", [libraryId, roomId]);
  const index = Number(count.rows[0]?.count ?? "0");
  const created = await client.query<{ id: string }>(
    `
    INSERT INTO seats (library_id, floor_id, room_id, seat_number, label, row_no, col_no, pos_x, pos_y, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $6, 'AVAILABLE')
    RETURNING id::text
    `,
    [libraryId, floorId, roomId, row.seatCode, row.roomName || null, Math.floor(index / 6) + 1, (index % 6) + 1],
  );
  return created.rows[0].id;
}

async function findOrCreatePlan(client: PoolClient, libraryId: string, row: NormalizedMigrationRow) {
  const existing = await client.query<{ id: string; name: string; base_amount: string; duration_months: number; plan_type: string; duration_days: number | null }>(
    `
    SELECT id::text, name, base_amount::text, duration_months, plan_type, duration_days
    FROM library_student_plans
    WHERE library_id = $1 AND lower(name) = lower($2)
    LIMIT 1
    `,
    [libraryId, row.planName],
  );
  if (existing.rows[0]) return existing.rows[0];
  const created = await client.query<{ id: string; name: string; base_amount: string; duration_months: number; plan_type: string; duration_days: number | null }>(
    `
    INSERT INTO library_student_plans (
      library_id, name, target_audience, description, plan_type, duration_months, duration_days,
      shift_start_time, shift_end_time, allowed_hours, allowed_days, base_amount, is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::time, $9::time, $10, NULL, $11, TRUE)
    RETURNING id::text, name, base_amount::text, duration_months, plan_type, duration_days
    `,
    [
      libraryId,
      row.planName,
      row.planCode || null,
      row.planCode ? `Created by migration. Plan code: ${row.planCode}` : "Created by migration.",
      row.planType,
      row.durationMonths,
      row.durationDays,
      row.shiftStartTime || null,
      row.shiftEndTime || null,
      row.allowedHours,
      row.planAmount,
    ],
  );
  return created.rows[0];
}

async function generateStudentCode(client: PoolClient, fullName: string) {
  const prefix = fullName.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3).padEnd(3, "S");
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = `${prefix}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const exists = await client.query("SELECT 1 FROM users WHERE student_code = $1 LIMIT 1", [code]);
    if (exists.rowCount === 0) return code;
  }
  return `${prefix}${Date.now().toString().slice(-6)}`;
}

function computeEndDate(row: NormalizedMigrationRow, plan: { duration_months: number; plan_type: string; duration_days: number | null }) {
  if (row.endDate) return row.endDate;
  const start = new Date(row.startDate);
  if (plan.plan_type === "DAY_WISE" && (row.durationDays || plan.duration_days)) start.setDate(start.getDate() + (row.durationDays || plan.duration_days || 1));
  else start.setMonth(start.getMonth() + (row.durationMonths || plan.duration_months || 1));
  return start.toISOString().slice(0, 10);
}

async function commitOneRow(client: PoolClient, input: { libraryId: string; actorUserId: string; jobId: string; rowId: string; fingerprint: string; row: NormalizedMigrationRow }) {
  const floorId = await findOrCreateFloor(client, input.libraryId, input.row.floorName);
  const roomId = await findOrCreateRoom(client, input.libraryId, floorId, input.row.roomName);
  const seatId = await findOrCreateSeat(client, input.libraryId, floorId, roomId, input.row);
  const plan = await findOrCreatePlan(client, input.libraryId, input.row);

  const existingUser = await client.query<{ id: string; student_code: string | null; email: string | null; phone: string | null }>(
    `
    SELECT id::text, student_code, email, phone
    FROM users
    WHERE ($1::text <> '' AND upper(COALESCE(student_code, '')) = upper($1))
       OR ($2::text <> '' AND phone = $2)
       OR ($3::text <> '' AND lower(COALESCE(email, '')) = lower($3))
    LIMIT 1
    `,
    [input.row.studentCode, input.row.mobile, input.row.email],
  );
  let studentId = existingUser.rows[0]?.id ?? "";
  let temporaryPassword: string | null = null;
  let studentCode = existingUser.rows[0]?.student_code ?? input.row.studentCode;
  let isNewStudent = false;
  if (!studentId) {
    temporaryPassword = `BL${crypto.randomBytes(3).toString("hex").toUpperCase()}${crypto.randomInt(10, 99)}`;
    studentCode = input.row.studentCode || await generateStudentCode(client, input.row.studentName);
    const passwordHash = await hashPassword(temporaryPassword);
    const referralCode = await generateUniqueReferralCode(client);
    const created = await client.query<{ id: string }>(
      `
      INSERT INTO users (full_name, email, phone, date_of_birth, gender, student_code, referral_code, password_hash, global_role)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'STUDENT')
      RETURNING id::text
      `,
      [input.row.studentName, input.row.email || null, input.row.mobile || null, input.row.dateOfBirth || null, input.row.gender || null, studentCode, referralCode, passwordHash],
    );
    studentId = created.rows[0].id;
    isNewStudent = true;
  } else {
    await client.query(
      `
      UPDATE users
      SET full_name = $2,
          email = NULLIF($3, ''),
          phone = NULLIF($4, ''),
          date_of_birth = NULLIF($5, '')::date,
          gender = NULLIF($6, ''),
          updated_at = NOW()
      WHERE id = $1
      `,
      [studentId, input.row.studentName, input.row.email, input.row.mobile, input.row.dateOfBirth, input.row.gender],
    );
  }
  await ensureLibraryReferralCode(client, input.libraryId);
  await ensureUserReferralCode(client, studentId);
  await client.query("INSERT INTO user_library_roles (user_id, library_id, role) VALUES ($1, $2, 'STUDENT') ON CONFLICT DO NOTHING", [studentId, input.libraryId]);

  if (seatId) {
    const occupant = await client.query<{ student_user_id: string }>(
      "SELECT student_user_id::text FROM student_assignments WHERE library_id = $1 AND seat_id = $2 AND status = 'ACTIVE' LIMIT 1",
      [input.libraryId, seatId],
    );
    if (occupant.rows[0] && occupant.rows[0].student_user_id !== studentId) {
      throw new AppError(409, `Seat ${input.row.seatCode} is already assigned.`, "MIGRATION_SEAT_OCCUPIED");
    }
  }

  const endsAt = computeEndDate(input.row, plan);
  const assignment = await client.query<{ id: string; seat_id: string | null }>(
    "SELECT id::text, seat_id::text FROM student_assignments WHERE library_id = $1 AND student_user_id = $2 AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1",
    [input.libraryId, studentId],
  );
  let assignmentId = assignment.rows[0]?.id ?? "";
  if (assignmentId) {
    if (assignment.rows[0].seat_id && assignment.rows[0].seat_id !== seatId) {
      await client.query("UPDATE seats SET status = 'AVAILABLE', updated_at = NOW() WHERE id = $1", [assignment.rows[0].seat_id]);
    }
    await client.query(
      `
      UPDATE student_assignments
      SET seat_id = $2,
          father_name = $3,
          address = $4,
          class_name = $5,
          preparing_for = $6,
          student_plan_id = $7,
          plan_name = $8,
          plan_price = $9,
          base_amount = $9,
          final_amount = $9,
          duration_months = $10,
          next_due_date = $11,
          starts_at = $12,
          ends_at = $13,
          payment_status = $14,
          notes = $15,
          migration_job_id = $16,
          migration_row_id = $17,
          migration_source_fingerprint = $18,
          updated_at = NOW()
      WHERE id = $1
      `,
      [
        assignmentId,
        seatId,
        input.row.fatherName || null,
        input.row.address || null,
        input.row.className || null,
        input.row.preparingFor || null,
        plan.id,
        plan.name,
        input.row.planAmount || Number(plan.base_amount),
        input.row.durationMonths || plan.duration_months,
        endsAt,
        input.row.startDate,
        endsAt,
        input.row.paymentStatus === "PAID" ? "PAID" : input.row.paymentStatus === "DUE" ? "DUE" : "PENDING",
        input.row.notes || null,
        input.jobId,
        input.rowId,
        input.fingerprint,
      ],
    );
  } else {
    const createdAssignment = await client.query<{ id: string }>(
      `
      INSERT INTO student_assignments (
        library_id, student_user_id, seat_id, father_name, address, class_name, preparing_for,
        student_plan_id, plan_name, plan_price, base_amount, final_amount, duration_months, next_due_date,
        starts_at, ends_at, status, payment_status, assigned_by, admission_source, notes,
        migration_job_id, migration_row_id, migration_source_fingerprint
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, $10, $11, $12, $13, $14, 'ACTIVE', $15, $16, 'MIGRATION', $17, $18, $19, $20)
      RETURNING id::text
      `,
      [
        input.libraryId,
        studentId,
        seatId,
        input.row.fatherName || null,
        input.row.address || null,
        input.row.className || null,
        input.row.preparingFor || null,
        plan.id,
        plan.name,
        input.row.planAmount || Number(plan.base_amount),
        input.row.durationMonths || plan.duration_months,
        endsAt,
        input.row.startDate,
        endsAt,
        input.row.paymentStatus === "PAID" ? "PAID" : input.row.paymentStatus === "DUE" ? "DUE" : "PENDING",
        input.actorUserId,
        input.row.notes || null,
        input.jobId,
        input.rowId,
        input.fingerprint,
      ],
    );
    assignmentId = createdAssignment.rows[0].id;
  }

  if (seatId) await client.query("UPDATE seats SET status = 'OCCUPIED', updated_at = NOW() WHERE id = $1", [seatId]);

  const existingPayment = await client.query("SELECT 1 FROM payments WHERE library_id = $1 AND migration_source_fingerprint = $2 LIMIT 1", [input.libraryId, input.fingerprint]);
  if (existingPayment.rowCount === 0) {
    const amount = input.row.paymentStatus === "PAID" ? (input.row.paidAmount ?? input.row.planAmount) : (input.row.dueAmount ?? input.row.planAmount);
    await client.query(
      `
      INSERT INTO payments (
        library_id, student_user_id, assignment_id, amount, currency, status, method, due_date, paid_at,
        reference_no, notes, created_by, migration_job_id, migration_row_id, migration_source_fingerprint
      )
      VALUES ($1, $2, $3, $4, 'INR', $5, $6, $7, $8, NULL, $9, $10, $11, $12, $13)
      `,
      [
        input.libraryId,
        studentId,
        assignmentId,
        amount,
        input.row.paymentStatus === "PAID" ? "PAID" : input.row.paymentStatus === "DUE" ? "DUE" : "PENDING",
        input.row.paymentMethod || "MIGRATION",
        endsAt,
        input.row.paymentStatus === "PAID" ? (input.row.paymentDate || new Date().toISOString()) : null,
        input.row.notes || "Imported from migration sheet",
        input.actorUserId,
        input.jobId,
        input.rowId,
        input.fingerprint,
      ],
    );
  }
  await client.query("UPDATE libraries SET total_seats = (SELECT COUNT(*) FROM seats WHERE library_id = $1), available_seats = (SELECT COUNT(*) FROM seats WHERE library_id = $1 AND status = 'AVAILABLE') WHERE id = $1", [input.libraryId]);
  return {
    studentUserId: studentId,
    assignmentId,
    studentCode,
    loginId: studentCode || input.row.email || input.row.mobile,
    temporaryPassword,
    isNewStudent,
    seatCode: input.row.seatCode || null,
    planName: plan.name,
  };
}

export async function commitOwnerMigration(input: { libraryId: string; actorUserId: string; jobId: string }) {
  const db = requireDb();
  const job = await db.query<{ status: string; error_count: number }>("SELECT status, error_count FROM library_migration_jobs WHERE id = $1 AND library_id = $2 LIMIT 1", [input.jobId, input.libraryId]);
  if (!job.rows[0]) throw new AppError(404, "Migration job not found.", "MIGRATION_JOB_NOT_FOUND");
  if (!["DRAFT", "FAILED"].includes(job.rows[0].status)) throw new AppError(409, "Migration job already committed or closed.", "MIGRATION_JOB_NOT_DRAFT");

  await db.query("UPDATE library_migration_jobs SET status = 'COMMITTING', updated_at = NOW() WHERE id = $1", [input.jobId]);
  const rows = await db.query<{ id: string; normalized_data: NormalizedMigrationRow; row_fingerprint: string; errors: string[]; status: string }>(
    "SELECT id::text, normalized_data, row_fingerprint, errors, status FROM library_migration_rows WHERE job_id = $1 ORDER BY row_number",
    [input.jobId],
  );
  const summary = { successRows: 0, failedRows: 0, skippedRows: 0 };
  for (const item of rows.rows) {
    if (item.status === "SUCCESS") {
      summary.skippedRows += 1;
      continue;
    }
    if (item.errors.length > 0) {
      await db.query("UPDATE library_migration_rows SET status = 'FAILED', result = $2::jsonb, updated_at = NOW() WHERE id = $1", [item.id, JSON.stringify({ reason: "Preview errors must be fixed before import." })]);
      summary.failedRows += 1;
      continue;
    }
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const result = await commitOneRow(client, {
        libraryId: input.libraryId,
        actorUserId: input.actorUserId,
        jobId: input.jobId,
        rowId: item.id,
        fingerprint: item.row_fingerprint,
        row: item.normalized_data,
      });
      await client.query("UPDATE library_migration_rows SET status = 'SUCCESS', result = $2::jsonb, updated_at = NOW() WHERE id = $1", [item.id, JSON.stringify(result)]);
      await client.query("COMMIT");
      summary.successRows += 1;
    } catch (error) {
      await client.query("ROLLBACK");
      await db.query("UPDATE library_migration_rows SET status = 'FAILED', result = $2::jsonb, updated_at = NOW() WHERE id = $1", [item.id, JSON.stringify({ reason: error instanceof Error ? error.message : "Import failed" })]);
      summary.failedRows += 1;
    } finally {
      client.release();
    }
  }
  await db.query(
    `
    UPDATE library_migration_jobs
    SET status = CASE WHEN $2::int > 0 THEN 'FAILED' ELSE 'COMMITTED' END,
        summary = summary || $3::jsonb,
        committed_at = NOW(),
        updated_at = NOW()
    WHERE id = $1
    `,
    [input.jobId, summary.failedRows, JSON.stringify(summary)],
  );
  await createAuditLog({
    actorUserId: input.actorUserId,
    libraryId: input.libraryId,
    action: "migration.committed",
    entityType: "library_migration_job",
    entityId: input.jobId,
    metadata: summary,
  });
  return summary;
}

export async function listOwnerMigrationJobs(libraryId: string) {
  const result = await requireDb().query(
    `
    SELECT id::text, file_name, status, summary, error_count, warning_count, committed_at::text, created_at::text
    FROM library_migration_jobs
    WHERE library_id = $1
    ORDER BY created_at DESC
    LIMIT 30
    `,
    [libraryId],
  );
  return result.rows;
}

export async function getOwnerMigrationJob(input: { libraryId: string; jobId: string }) {
  const db = requireDb();
  const [job, rows] = await Promise.all([
    db.query("SELECT id::text, file_name, status, summary, error_count, warning_count, committed_at::text, created_at::text FROM library_migration_jobs WHERE id = $1 AND library_id = $2 LIMIT 1", [input.jobId, input.libraryId]),
    db.query("SELECT id::text, row_number, normalized_data, status, action, errors, warnings, result FROM library_migration_rows WHERE job_id = $1 AND library_id = $2 ORDER BY row_number LIMIT 300", [input.jobId, input.libraryId]),
  ]);
  if (!job.rows[0]) throw new AppError(404, "Migration job not found.", "MIGRATION_JOB_NOT_FOUND");
  return { ...job.rows[0], rows: rows.rows };
}

export async function buildOwnerMigrationCredentialPdf(input: { libraryId: string; actorUserId: string; jobId: string }) {
  const db = requireDb();
  const job = await db.query<{ id: string; file_name: string | null; created_at: string; status: string; library_name: string }>(
    `
    SELECT j.id::text, j.file_name, j.created_at::text, j.status, l.name AS library_name
    FROM library_migration_jobs j
    INNER JOIN libraries l ON l.id = j.library_id
    WHERE j.id = $1 AND j.library_id = $2
    LIMIT 1
    `,
    [input.jobId, input.libraryId],
  );
  if (!job.rows[0]) throw new AppError(404, "Migration job not found.", "MIGRATION_JOB_NOT_FOUND");
  const rows = await db.query<{ normalized_data: NormalizedMigrationRow; result: Record<string, unknown>; status: string }>(
    "SELECT normalized_data, result, status FROM library_migration_rows WHERE job_id = $1 AND library_id = $2 AND status = 'SUCCESS' ORDER BY row_number",
    [input.jobId, input.libraryId],
  );
  const tableRows = rows.rows.map((row) => ({
    name: row.normalized_data.studentName,
    father: row.normalized_data.fatherName || "-",
    mobile: row.normalized_data.mobile || "-",
    login_id: String(row.result.loginId ?? row.result.studentCode ?? "-"),
    password: row.result.temporaryPassword ? String(row.result.temporaryPassword) : "Existing password / Forgot password",
  }));
  await createAuditLog({
    actorUserId: input.actorUserId,
    libraryId: input.libraryId,
    action: "migration.credentials.downloaded",
    entityType: "library_migration_job",
    entityId: input.jobId,
    metadata: { rows: tableRows.length },
  });
  return buildPdfBuffer({
    title: `${job.rows[0].library_name} student login credentials`,
    subtitle: "Share carefully. Existing student passwords are not exposed.",
    summary: [
      { label: "Migration file", value: job.rows[0].file_name ?? "-" },
      { label: "Created at", value: job.rows[0].created_at },
      { label: "Students", value: String(tableRows.length) },
    ],
    tables: [{ title: "Student login list", rows: tableRows }],
  });
}

export async function getOwnerMigrationLoginStatus(input: { libraryId: string; q?: string; status?: string; plan?: string; room?: string }) {
  const result = await requireDb().query(
    `
    SELECT
      u.id::text AS student_user_id,
      u.full_name,
      u.phone,
      COALESCE(u.student_code, u.email, u.phone) AS login_id,
      s.seat_number,
      lr.name AS room_name,
      sa.plan_name,
      first_login.first_login_at,
      last_login.last_login_at,
      CASE WHEN first_login.first_login_at IS NULL THEN 'NOT_LOGGED_IN' ELSE 'LOGGED_IN' END AS login_status
    FROM student_assignments sa
    INNER JOIN users u ON u.id = sa.student_user_id
    LEFT JOIN seats s ON s.id = sa.seat_id
    LEFT JOIN library_rooms lr ON lr.id = s.room_id
    LEFT JOIN LATERAL (
      SELECT MIN(al.created_at)::text AS first_login_at
      FROM audit_logs al
      WHERE al.actor_user_id = u.id AND al.action = 'auth.login'
    ) first_login ON TRUE
    LEFT JOIN LATERAL (
      SELECT MAX(al.created_at)::text AS last_login_at
      FROM audit_logs al
      WHERE al.actor_user_id = u.id AND al.action = 'auth.login'
    ) last_login ON TRUE
    WHERE sa.library_id = $1
      AND sa.status = 'ACTIVE'
      AND ($2::text = '' OR lower(u.full_name) LIKE '%' || lower($2) || '%' OR u.phone LIKE '%' || $2 || '%')
      AND ($3::text = 'ALL' OR CASE WHEN first_login.first_login_at IS NULL THEN 'NOT_LOGGED_IN' ELSE 'LOGGED_IN' END = $3)
      AND ($4::text = '' OR lower(sa.plan_name) = lower($4))
      AND ($5::text = '' OR lower(COALESCE(lr.name, '')) = lower($5))
    ORDER BY first_login.first_login_at NULLS FIRST, u.full_name
    LIMIT 500
    `,
    [input.libraryId, input.q ?? "", input.status ?? "ALL", input.plan ?? "", input.room ?? ""],
  );
  return result.rows;
}
