import type { Request, Response } from "express";
import ExcelJS from "exceljs";
import { AppError } from "../lib/errors";
import {
  createOwnerStudentInterventionNote,
  addStudentBook,
  createAdminBookChapter,
  createAdminBookTopic,
  createManualRevision,
  createStudentFeedPost,
  createSyllabusSubject,
  createSyllabusTopic,
  completeStudentRevision,
  getStudentFeed,
  getOwnerStudentProductivity,
  getOwnerProductivityTrends,
  getAdminBook,
  getStudentRevisionDashboard,
  listOwnerFollowUpQueue,
  getStudentAnalytics,
  getStudentFocusLeaderboard,
  getStudentSyllabus,
  getStudentBook,
  importGlobalBookRows,
  importGlobalSyllabusRows,
  importSyllabusTemplateForStudent,
  listAdminBooks,
  listGlobalSyllabusTemplates,
  listStudentBooks,
  listStudentLibraries,
  searchStudentBooks,
  setActiveStudentLibrary,
  syncStudentBook,
  updateAdminBook,
  updateAdminBookChapter,
  updateAdminBookTopic,
  updateStudentFeedVisibility,
  updateOwnerStudentInterventionStatus,
  updateSyllabusTopicProgress,
  toggleFeedLike,
  listStudentPlannerWeek,
  listStudentPlannerMonth,
  createStudentPlannerEntry,
  updateStudentPlannerEntry,
  deleteStudentPlannerEntry,
  carryForwardStudentPlannerEntry,
  markStudentPlannerRevision,
  listStudentPlannerGoals,
  createStudentPlannerGoal,
  updateStudentPlannerGoal,
  deleteStudentPlannerGoal,
  listStudentPlannerNotes,
  createStudentPlannerNote,
  updateStudentPlannerNote,
  deleteStudentPlannerNote,
  listStudentPlannerExams,
  createStudentPlannerExam,
  updateStudentPlannerExam,
  deleteStudentPlannerExam,
  listStudentPlannerHabits,
  updateStudentPlannerHabit,
  getStudentPlannerAnalytics,
} from "../services/productivity.service";
import {
  completeRevisionBodySchema,
  createFeedPostBodySchema,
  createManualRevisionBodySchema,
  createStudentInterventionNoteBodySchema,
  createSyllabusSubjectBodySchema,
  createSyllabusTopicBodySchema,
  adminSyllabusImportBodySchema,
  adminBookImportBodySchema,
  createAdminBookChapterBodySchema,
  createAdminBookTopicBodySchema,
  importSyllabusTemplateBodySchema,
  updateFeedVisibilityBodySchema,
  updateAdminBookBodySchema,
  updateAdminBookChapterBodySchema,
  updateAdminBookTopicBodySchema,
  updateStudentInterventionStatusBodySchema,
  updateTopicProgressBodySchema,
} from "../validators/productivity.validators";

function requireStudentContext(req: Request) {
  if (!req.auth || req.auth.role !== "STUDENT") {
    throw new AppError(401, "Student authentication required", "STUDENT_AUTH_REQUIRED");
  }
  return {
    studentUserId: req.auth.userId,
    libraryId: req.tenant?.libraryId ?? req.auth.libraryIds[0] ?? null,
  };
}

function actorNameFromRequest(req: Request) {
  const auth = req.auth as ({ fullName?: string } & typeof req.auth) | undefined;
  return auth?.fullName ?? "Student";
}

function paramValue(value: string | string[] | undefined, code: string) {
  if (!value) {
    throw new AppError(400, "Required route parameter missing", code);
  }
  return Array.isArray(value) ? value[0] : value;
}

export async function listStudentLibrariesController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const data = await listStudentLibraries(studentUserId);
  res.json({ success: true, data });
}

export async function setActiveStudentLibraryController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const libraryId = paramValue(req.params.libraryId, "LIBRARY_ID_REQUIRED");
  const data = await setActiveStudentLibrary(studentUserId, libraryId);
  res.json({ success: true, data });
}

export async function getStudentSyllabusController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const data = await getStudentSyllabus(studentUserId);
  res.json({ success: true, data });
}

export async function getStudentSyllabusAnalyticsController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const data = await getStudentSyllabus(studentUserId);
  res.json({ success: true, data: data.analytics });
}

export async function createSyllabusSubjectController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const parsed = createSyllabusSubjectBodySchema.parse(req.body);
  const data = await createSyllabusSubject({
    studentUserId,
    title: parsed.title,
    colorHex: parsed.colorHex || null,
    className: parsed.className || null,
  });
  res.status(201).json({ success: true, data });
}

function normalizeHeader(value: unknown) {
  return String(value ?? "").trim();
}

function rowsFromCsv(buffer: Buffer) {
  const lines = buffer.toString("utf8").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line, index) => {
    const values = line.split(",").map((value) => value.trim());
    const row = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] ?? ""]));
    return {
      className: row.className,
      subjectTitle: row.subjectTitle,
      topicTitle: row.topicTitle,
      estimatedMinutes: row.estimatedMinutes || 60,
      topicOrder: row.topicOrder || index,
      colorHex: row.colorHex || "",
    };
  });
}

async function rowsFromSpreadsheet(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];
  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber - 1] = normalizeHeader(cell.value);
  });

  const rows: Record<string, unknown>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const current: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      current[header] = row.getCell(index + 1).text;
    });
    rows.push(current);
  });

  return rows
    .filter((row) => Object.values(row).some((value) => String(value ?? "").trim()))
    .map((row, index) => ({
      className: normalizeHeader(row.className),
      subjectTitle: normalizeHeader(row.subjectTitle),
      topicTitle: normalizeHeader(row.topicTitle),
      estimatedMinutes: normalizeHeader(row.estimatedMinutes) || 60,
      topicOrder: normalizeHeader(row.topicOrder) || index,
      colorHex: normalizeHeader(row.colorHex),
    }));
}

function bookRowsFromCsv(buffer: Buffer) {
  const lines = buffer.toString("utf8").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line, index) => {
    const values = line.split(",").map((value) => value.trim());
    const row = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] ?? ""]));
    return {
      bookTitle: row.bookTitle,
      author: row.author || "",
      className: row.className || "",
      subject: row.subject || "",
      language: row.language || "",
      chapterTitle: row.chapterTitle,
      chapterOrder: row.chapterOrder || index,
      topicTitle: row.topicTitle,
      topicOrder: row.topicOrder || index,
      estimatedMinutes: row.estimatedMinutes || 60,
    };
  });
}

async function bookRowsFromSpreadsheet(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];
  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber - 1] = normalizeHeader(cell.value);
  });

  const rows: Record<string, unknown>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const current: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      current[header] = row.getCell(index + 1).text;
    });
    rows.push(current);
  });

  return rows
    .filter((row) => Object.values(row).some((value) => String(value ?? "").trim()))
    .map((row, index) => ({
      bookTitle: normalizeHeader(row.bookTitle),
      author: normalizeHeader(row.author),
      className: normalizeHeader(row.className),
      subject: normalizeHeader(row.subject),
      language: normalizeHeader(row.language),
      chapterTitle: normalizeHeader(row.chapterTitle),
      chapterOrder: normalizeHeader(row.chapterOrder) || index,
      topicTitle: normalizeHeader(row.topicTitle),
      topicOrder: normalizeHeader(row.topicOrder) || index,
      estimatedMinutes: normalizeHeader(row.estimatedMinutes) || 60,
    }));
}

export async function listStudentSyllabusTemplatesController(req: Request, res: Response) {
  requireStudentContext(req);
  const rawClassName = Array.isArray(req.query.className) ? req.query.className[0] : req.query.className;
  const className = typeof rawClassName === "string" && rawClassName.trim() ? rawClassName.trim() : null;
  const data = await listGlobalSyllabusTemplates(className);
  res.json({ success: true, data });
}

export async function importStudentSyllabusTemplateController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const parsed = importSyllabusTemplateBodySchema.parse(req.body);
  const data = await importSyllabusTemplateForStudent({
    studentUserId,
    className: parsed.className,
    subjectTitle: parsed.subjectTitle || undefined,
  });
  res.status(201).json({ success: true, data });
}

export async function createSyllabusTopicController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const parsed = createSyllabusTopicBodySchema.parse(req.body);
  const data = await createSyllabusTopic({
    studentUserId,
    subjectId: parsed.subjectId,
    title: parsed.title,
    estimatedMinutes: parsed.estimatedMinutes,
    topicOrder: parsed.topicOrder,
  });
  res.status(201).json({ success: true, data });
}

export async function updateSyllabusTopicProgressController(req: Request, res: Response) {
  const { studentUserId, libraryId } = requireStudentContext(req);
  const topicId = paramValue(req.params.topicId, "TOPIC_ID_REQUIRED");
  const parsed = updateTopicProgressBodySchema.parse(req.body);
  const data = await updateSyllabusTopicProgress({
    studentUserId,
    libraryId,
    actorName: actorNameFromRequest(req),
    topicId,
    status: parsed.status,
    progressPercent: parsed.progressPercent,
  });
  res.json({ success: true, data });
}

export async function getStudentAnalyticsController(req: Request, res: Response) {
  const { studentUserId, libraryId } = requireStudentContext(req);
  const data = await getStudentAnalytics({ studentUserId, libraryId });
  res.json({ success: true, data });
}

export async function getStudentRevisionDashboardController(req: Request, res: Response) {
  const { studentUserId, libraryId } = requireStudentContext(req);
  const data = await getStudentRevisionDashboard({ studentUserId, libraryId });
  res.json({ success: true, data });
}

export async function createManualRevisionController(req: Request, res: Response) {
  const { studentUserId, libraryId } = requireStudentContext(req);
  const parsed = createManualRevisionBodySchema.parse(req.body);
  const data = await createManualRevision({
    studentUserId,
    libraryId,
    topicId: parsed.topicId,
    scheduledFor: parsed.scheduledFor,
    minutesTarget: parsed.minutesTarget,
  });
  res.status(201).json({ success: true, data });
}

export async function completeStudentRevisionController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const revisionId = paramValue(req.params.revisionId, "REVISION_ID_REQUIRED");
  const parsed = completeRevisionBodySchema.parse(req.body);
  const data = await completeStudentRevision({
    studentUserId,
    revisionId,
    minutesSpent: parsed.minutesSpent,
    confidenceScore: parsed.confidenceScore,
    notes: parsed.notes || undefined,
  });
  res.json({ success: true, data });
}

export async function getStudentFeedController(req: Request, res: Response) {
  const { studentUserId, libraryId } = requireStudentContext(req);
  const data = await getStudentFeed({ studentUserId, libraryId });
  res.json({ success: true, data });
}

export async function createStudentFeedPostController(req: Request, res: Response) {
  const { studentUserId, libraryId } = requireStudentContext(req);
  const parsed = createFeedPostBodySchema.parse(req.body);
  const data = await createStudentFeedPost({
    studentUserId,
    libraryId,
    actorName: actorNameFromRequest(req),
    eventType: parsed.eventType,
    title: parsed.title,
    body: parsed.body,
    visibility: parsed.visibility,
  });
  res.status(201).json({ success: true, data });
}

export async function updateStudentFeedVisibilityController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const parsed = updateFeedVisibilityBodySchema.parse(req.body);
  const data = await updateStudentFeedVisibility({
    studentUserId,
    defaultVisibility: parsed.defaultVisibility,
    allowSubjectCompletionPosts: parsed.allowSubjectCompletionPosts,
    allowFocusPosts: parsed.allowFocusPosts,
    allowStreakPosts: parsed.allowStreakPosts,
  });
  res.json({ success: true, data });
}

export async function getStudentFocusLeaderboardController(req: Request, res: Response) {
  const { libraryId } = requireStudentContext(req);
  if (!libraryId) {
    throw new AppError(400, "Student tenant context missing", "STUDENT_LIBRARY_REQUIRED");
  }
  const rawWindow = Array.isArray(req.query.window) ? req.query.window[0] : req.query.window;
  const window = rawWindow === "30d" ? "30d" : "7d";
  const data = await getStudentFocusLeaderboard(libraryId, window);
  res.json({ success: true, data });
}

export async function listAdminBooksController(req: Request, res: Response) {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : null;
  const className = typeof req.query.className === "string" ? req.query.className.trim() : null;
  const subject = typeof req.query.subject === "string" ? req.query.subject.trim() : null;
  const status = typeof req.query.status === "string" ? req.query.status.trim() : null;
  const data = await listAdminBooks({ q, className, subject, status });
  res.json({ success: true, data });
}

export async function getAdminBookController(req: Request, res: Response) {
  const bookId = paramValue(req.params.bookId, "BOOK_ID_REQUIRED");
  const data = await getAdminBook(bookId);
  res.json({ success: true, data });
}

export async function downloadAdminBookTemplateController(_req: Request, res: Response) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BookLib";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Book TOC Import");
  sheet.columns = [
    { header: "bookTitle", key: "bookTitle", width: 34 },
    { header: "author", key: "author", width: 24 },
    { header: "className", key: "className", width: 18 },
    { header: "subject", key: "subject", width: 20 },
    { header: "language", key: "language", width: 14 },
    { header: "chapterTitle", key: "chapterTitle", width: 34 },
    { header: "chapterOrder", key: "chapterOrder", width: 14 },
    { header: "topicTitle", key: "topicTitle", width: 42 },
    { header: "topicOrder", key: "topicOrder", width: 14 },
    { header: "estimatedMinutes", key: "estimatedMinutes", width: 18 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.addRows([
    {
      bookTitle: "NCERT Physics Class 12",
      author: "NCERT",
      className: "Class 12",
      subject: "Physics",
      language: "English",
      chapterTitle: "Current Electricity",
      chapterOrder: 1,
      topicTitle: "Electric current and drift velocity",
      topicOrder: 1,
      estimatedMinutes: 60,
    },
    {
      bookTitle: "NCERT Physics Class 12",
      author: "NCERT",
      className: "Class 12",
      subject: "Physics",
      language: "English",
      chapterTitle: "Current Electricity",
      chapterOrder: 1,
      topicTitle: "Ohm's law and resistance",
      topicOrder: 2,
      estimatedMinutes: 75,
    },
  ]);
  const notes = workbook.addWorksheet("Instructions");
  notes.addRows([
    ["Required columns", "bookTitle, chapterTitle, topicTitle"],
    ["Update behavior", "Same book + author updates the existing book; same chapter/topic updates order and minutes."],
    ["Publish", "After import, publish the book so students can search and add it."],
  ]);
  notes.columns = [{ width: 24 }, { width: 96 }];
  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="booklib-book-toc-template.xlsx"');
  res.send(Buffer.from(buffer));
}

export async function importAdminBooksController(req: Request, res: Response) {
  if (!req.auth) throw new AppError(401, "Super admin authentication required", "SUPER_ADMIN_AUTH_REQUIRED");
  const parsed = adminBookImportBodySchema.parse(req.body);
  const data = await importGlobalBookRows({ createdByUserId: req.auth.userId, rows: parsed.rows });
  res.status(201).json({ success: true, data });
}

export async function uploadAdminBooksController(req: Request, res: Response) {
  if (!req.auth) throw new AppError(401, "Super admin authentication required", "SUPER_ADMIN_AUTH_REQUIRED");
  if (!req.file) throw new AppError(400, "File is required", "FILE_REQUIRED");
  const fileName = req.file.originalname.toLowerCase();
  if (fileName.endsWith(".xls")) {
    throw new AppError(400, "Legacy .xls files are not supported for secure import. Upload CSV or XLSX instead.", "UNSUPPORTED_LEGACY_XLS");
  }
  const rawRows = fileName.endsWith(".csv") || req.file.mimetype.toLowerCase().includes("csv")
    ? bookRowsFromCsv(req.file.buffer)
    : await bookRowsFromSpreadsheet(req.file.buffer);
  const parsed = adminBookImportBodySchema.parse({ rows: rawRows });
  const data = await importGlobalBookRows({ createdByUserId: req.auth.userId, rows: parsed.rows });
  res.status(201).json({ success: true, data });
}

export async function updateAdminBookController(req: Request, res: Response) {
  const bookId = paramValue(req.params.bookId, "BOOK_ID_REQUIRED");
  const parsed = updateAdminBookBodySchema.parse(req.body);
  const data = await updateAdminBook({
    bookId,
    title: parsed.title,
    author: parsed.author || undefined,
    className: parsed.className || undefined,
    subject: parsed.subject || undefined,
    language: parsed.language || undefined,
    status: parsed.status,
  });
  res.json({ success: true, data });
}

export async function createAdminBookChapterController(req: Request, res: Response) {
  const bookId = paramValue(req.params.bookId, "BOOK_ID_REQUIRED");
  const parsed = createAdminBookChapterBodySchema.parse(req.body);
  const data = await createAdminBookChapter({ bookId, chapterTitle: parsed.chapterTitle, chapterOrder: parsed.chapterOrder });
  res.status(201).json({ success: true, data });
}

export async function updateAdminBookChapterController(req: Request, res: Response) {
  const bookId = paramValue(req.params.bookId, "BOOK_ID_REQUIRED");
  const chapterId = paramValue(req.params.chapterId, "CHAPTER_ID_REQUIRED");
  const parsed = updateAdminBookChapterBodySchema.parse(req.body);
  const data = await updateAdminBookChapter({ bookId, chapterId, chapterTitle: parsed.chapterTitle, chapterOrder: parsed.chapterOrder });
  res.json({ success: true, data });
}

export async function createAdminBookTopicController(req: Request, res: Response) {
  const bookId = paramValue(req.params.bookId, "BOOK_ID_REQUIRED");
  const parsed = createAdminBookTopicBodySchema.parse(req.body);
  const data = await createAdminBookTopic({
    bookId,
    chapterId: parsed.chapterId,
    topicTitle: parsed.topicTitle,
    topicOrder: parsed.topicOrder,
    estimatedMinutes: parsed.estimatedMinutes,
  });
  res.status(201).json({ success: true, data });
}

export async function updateAdminBookTopicController(req: Request, res: Response) {
  const bookId = paramValue(req.params.bookId, "BOOK_ID_REQUIRED");
  const topicId = paramValue(req.params.topicId, "TOPIC_ID_REQUIRED");
  const parsed = updateAdminBookTopicBodySchema.parse(req.body);
  const data = await updateAdminBookTopic({
    bookId,
    topicId,
    chapterId: parsed.chapterId,
    topicTitle: parsed.topicTitle,
    topicOrder: parsed.topicOrder,
    estimatedMinutes: parsed.estimatedMinutes,
  });
  res.json({ success: true, data });
}

export async function listAdminSyllabusTemplatesController(req: Request, res: Response) {
  const rawClassName = Array.isArray(req.query.className) ? req.query.className[0] : req.query.className;
  const className = typeof rawClassName === "string" && rawClassName.trim() ? rawClassName.trim() : null;
  const data = await listGlobalSyllabusTemplates(className);
  res.json({ success: true, data });
}

export async function searchStudentBooksController(req: Request, res: Response) {
  requireStudentContext(req);
  const q = typeof req.query.q === "string" ? req.query.q.trim() : null;
  const className = typeof req.query.className === "string" ? req.query.className.trim() : null;
  const subject = typeof req.query.subject === "string" ? req.query.subject.trim() : null;
  const data = await searchStudentBooks({ q, className, subject });
  res.json({ success: true, data });
}

export async function listStudentBooksController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const data = await listStudentBooks(studentUserId);
  res.json({ success: true, data });
}

export async function addStudentBookController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const bookId = paramValue(req.params.bookId, "BOOK_ID_REQUIRED");
  const data = await addStudentBook({ studentUserId, bookId });
  res.status(201).json({ success: true, data });
}

export async function getStudentBookController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const studentBookId = paramValue(req.params.studentBookId, "STUDENT_BOOK_ID_REQUIRED");
  const data = await getStudentBook({ studentUserId, studentBookId });
  res.json({ success: true, data });
}

export async function syncStudentBookController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const studentBookId = paramValue(req.params.studentBookId, "STUDENT_BOOK_ID_REQUIRED");
  const data = await syncStudentBook({ studentUserId, studentBookId });
  res.json({ success: true, data });
}

export async function downloadAdminSyllabusTemplateController(_req: Request, res: Response) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BookLib";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Syllabus Import");
  sheet.columns = [
    { header: "className", key: "className", width: 18 },
    { header: "subjectTitle", key: "subjectTitle", width: 24 },
    { header: "topicTitle", key: "topicTitle", width: 42 },
    { header: "estimatedMinutes", key: "estimatedMinutes", width: 18 },
    { header: "topicOrder", key: "topicOrder", width: 14 },
    { header: "colorHex", key: "colorHex", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.addRows([
    {
      className: "Class 12",
      subjectTitle: "Physics",
      topicTitle: "Current Electricity",
      estimatedMinutes: 90,
      topicOrder: 1,
      colorHex: "#2563eb",
    },
    {
      className: "Class 12",
      subjectTitle: "Physics",
      topicTitle: "Ray Optics",
      estimatedMinutes: 90,
      topicOrder: 2,
      colorHex: "#2563eb",
    },
    {
      className: "Class 12",
      subjectTitle: "Chemistry",
      topicTitle: "Solid State",
      estimatedMinutes: 75,
      topicOrder: 1,
      colorHex: "#16a34a",
    },
  ]);

  const notes = workbook.addWorksheet("Instructions");
  notes.addRows([
    ["Fill rows in 'Syllabus Import' only."],
    ["Required columns", "className, subjectTitle, topicTitle"],
    ["Optional columns", "estimatedMinutes, topicOrder, colorHex"],
    ["Upload format", "Save as .xlsx and upload from Superadmin > Syllabus."],
  ]);
  notes.columns = [{ width: 24 }, { width: 72 }];

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="booklib-syllabus-import-template.xlsx"');
  res.send(Buffer.from(buffer));
}

export async function importAdminSyllabusTemplatesController(req: Request, res: Response) {
  if (!req.auth) {
    throw new AppError(401, "Super admin authentication required", "SUPER_ADMIN_AUTH_REQUIRED");
  }
  const parsed = adminSyllabusImportBodySchema.parse(req.body);
  const data = await importGlobalSyllabusRows({
    createdByUserId: req.auth.userId,
    rows: parsed.rows.map((row) => ({
      className: row.className,
      subjectTitle: row.subjectTitle,
      topicTitle: row.topicTitle,
      estimatedMinutes: row.estimatedMinutes,
      topicOrder: row.topicOrder,
      colorHex: row.colorHex || null,
    })),
  });
  res.status(201).json({ success: true, data });
}

export async function uploadAdminSyllabusTemplatesController(req: Request, res: Response) {
  if (!req.auth) {
    throw new AppError(401, "Super admin authentication required", "SUPER_ADMIN_AUTH_REQUIRED");
  }
  if (!req.file) {
    throw new AppError(400, "File is required", "FILE_REQUIRED");
  }

  const fileName = req.file.originalname.toLowerCase();
  if (fileName.endsWith(".xls")) {
    throw new AppError(400, "Legacy .xls files are not supported for secure import. Upload CSV or XLSX instead.", "UNSUPPORTED_LEGACY_XLS");
  }
  const rawRows = fileName.endsWith(".csv") || req.file.mimetype.toLowerCase().includes("csv")
    ? rowsFromCsv(req.file.buffer)
    : await rowsFromSpreadsheet(req.file.buffer);

  const parsed = adminSyllabusImportBodySchema.parse({ rows: rawRows });
  const data = await importGlobalSyllabusRows({
    createdByUserId: req.auth.userId,
    rows: parsed.rows.map((row) => ({
      className: row.className,
      subjectTitle: row.subjectTitle,
      topicTitle: row.topicTitle,
      estimatedMinutes: row.estimatedMinutes,
      topicOrder: row.topicOrder,
      colorHex: row.colorHex || null,
    })),
  });
  res.status(201).json({ success: true, data });
}

function requireOwnerContext(req: Request) {
  if (!req.auth || req.auth.role !== "LIBRARY_OWNER" || !req.auth.libraryIds[0]) {
    throw new AppError(401, "Library owner authentication required", "OWNER_AUTH_REQUIRED");
  }

  return {
    libraryId: req.auth.libraryIds[0],
  };
}

export async function getOwnerStudentProductivityController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const studentUserId = paramValue(req.params.studentUserId, "STUDENT_USER_ID_REQUIRED");
  const data = await getOwnerStudentProductivity({ libraryId, studentUserId });
  res.json({ success: true, data });
}

export async function createOwnerStudentInterventionNoteController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  if (!req.auth) {
    throw new AppError(401, "Owner authentication required", "OWNER_AUTH_REQUIRED");
  }
  const studentUserId = paramValue(req.params.studentUserId, "STUDENT_USER_ID_REQUIRED");
  const parsed = createStudentInterventionNoteBodySchema.parse(req.body);
  const data = await createOwnerStudentInterventionNote({
    libraryId,
    studentUserId,
    actorUserId: req.auth.userId,
    noteText: parsed.noteText,
    noteType: parsed.noteType,
    followUpAt: parsed.followUpAt || undefined,
  });
  res.status(201).json({ success: true, data });
}

export async function updateOwnerStudentInterventionStatusController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const noteId = paramValue(req.params.noteId, "NOTE_ID_REQUIRED");
  const parsed = updateStudentInterventionStatusBodySchema.parse(req.body);
  const data = await updateOwnerStudentInterventionStatus({
    libraryId,
    noteId,
    noteStatus: parsed.noteStatus,
  });
  res.json({ success: true, data });
}

export async function listOwnerFollowUpQueueController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const data = await listOwnerFollowUpQueue(libraryId);
  res.json({ success: true, data });
}

export async function getOwnerProductivityTrendsController(req: Request, res: Response) {
  const { libraryId } = requireOwnerContext(req);
  const rawWindow = Array.isArray(req.query.window) ? req.query.window[0] : req.query.window;
  const window = rawWindow === "30d" ? "30d" : "7d";
  const data = await getOwnerProductivityTrends(libraryId, window);
  res.json({ success: true, data });
}

// ─── Feed Likes ───────────────────────────────────────────────────────────────

export async function toggleFeedLikeController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const postId = paramValue(req.params.postId, "POST_ID_REQUIRED");
  const data = await toggleFeedLike(postId, studentUserId);
  res.json({ success: true, data });
}

// ─── Study Planner ────────────────────────────────────────────────────────────

export async function listStudentPlannerWeekController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const rawWeek = Array.isArray(req.query.weekStart) ? req.query.weekStart[0] : req.query.weekStart;
  // Default to current Monday
  const weekStart = rawWeek ?? (() => {
    const d = new Date();
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  })();
  const data = await listStudentPlannerWeek(studentUserId, weekStart as string);
  res.json({ success: true, data });
}

export async function listStudentPlannerMonthController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const rawMonth = Array.isArray(req.query.month) ? req.query.month[0] : req.query.month;
  const month = rawMonth ?? new Date().toISOString().slice(0, 7);
  const monthStart = `${month as string}-01`;
  const data = await listStudentPlannerMonth(studentUserId, monthStart);
  res.json({ success: true, data });
}

export async function createStudentPlannerEntryController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const { planDate, title, subject, chapterTopic, targetMinutes, actualMinutes, notes, priority, status, deadlineAt, startTime, endTime, taskType, sourceType, carryForwardFromId, revisionStage } = req.body as {
    planDate: string;
    title?: string;
    subject?: string;
    chapterTopic?: string;
    targetMinutes?: number;
    actualMinutes?: number;
    notes?: string;
    priority?: string;
    status?: string;
    deadlineAt?: string;
    startTime?: string;
    endTime?: string;
    taskType?: string;
    sourceType?: string;
    carryForwardFromId?: string;
    revisionStage?: number;
  };
  if (!planDate) throw new AppError(400, "planDate is required", "PLAN_DATE_REQUIRED");
  const data = await createStudentPlannerEntry({
    studentUserId,
    planDate,
    title: title ?? null,
    subject: subject ?? null,
    chapterTopic: chapterTopic ?? null,
    targetMinutes: targetMinutes ?? 60,
    actualMinutes,
    notes: notes ?? null,
    priority,
    status,
    deadlineAt: deadlineAt ?? null,
    startTime: startTime ?? null,
    endTime: endTime ?? null,
    taskType,
    sourceType,
    carryForwardFromId: carryForwardFromId ?? null,
    revisionStage,
  });
  res.status(201).json({ success: true, data });
}

export async function updateStudentPlannerEntryController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const entryId = paramValue(req.params.entryId, "ENTRY_ID_REQUIRED");
  const { planDate, title, actualMinutes, completed, notes, subject, chapterTopic, targetMinutes, priority, status, deadlineAt, startTime, endTime, taskType, revisionStage, lastRevisedAt } = req.body as {
    planDate?: string;
    title?: string;
    actualMinutes?: number;
    completed?: boolean;
    notes?: string;
    subject?: string;
    chapterTopic?: string;
    targetMinutes?: number;
    priority?: string;
    status?: string;
    deadlineAt?: string;
    startTime?: string;
    endTime?: string;
    taskType?: string;
    revisionStage?: number;
    lastRevisedAt?: string;
  };
  const data = await updateStudentPlannerEntry({
    entryId,
    studentUserId,
    planDate,
    title,
    actualMinutes,
    completed,
    notes,
    subject,
    chapterTopic,
    targetMinutes,
    priority,
    status,
    deadlineAt,
    startTime,
    endTime,
    taskType,
    revisionStage,
    lastRevisedAt,
  });
  res.json({ success: true, data });
}

export async function deleteStudentPlannerEntryController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const entryId = paramValue(req.params.entryId, "ENTRY_ID_REQUIRED");
  const data = await deleteStudentPlannerEntry(entryId, studentUserId);
  res.json({ success: true, data });
}

export async function carryForwardStudentPlannerEntryController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const entryId = paramValue(req.params.entryId, "ENTRY_ID_REQUIRED");
  const { nextDate } = req.body as { nextDate?: string };
  if (!nextDate) throw new AppError(400, "nextDate is required", "NEXT_DATE_REQUIRED");
  const data = await carryForwardStudentPlannerEntry({ entryId, studentUserId, nextDate });
  res.status(201).json({ success: true, data });
}

export async function markStudentPlannerRevisionController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const entryId = paramValue(req.params.entryId, "ENTRY_ID_REQUIRED");
  const { revisionStage } = req.body as { revisionStage?: number };
  const data = await markStudentPlannerRevision({ entryId, studentUserId, revisionStage: revisionStage ?? 1 });
  res.json({ success: true, data });
}

export async function listStudentPlannerGoalsController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const goalType = String(req.query.goalType ?? "WEEKLY").toUpperCase() === "MONTHLY" ? "MONTHLY" : "WEEKLY";
  const periodStart = String(req.query.periodStart ?? new Date().toISOString().slice(0, 10));
  const data = await listStudentPlannerGoals(studentUserId, goalType, periodStart);
  res.json({ success: true, data });
}

export async function createStudentPlannerGoalController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const { goalType, periodStart, title, subject, targetMinutes, targetTasks, notes } = req.body as {
    goalType?: "WEEKLY" | "MONTHLY";
    periodStart?: string;
    title?: string;
    subject?: string;
    targetMinutes?: number;
    targetTasks?: number;
    notes?: string;
  };
  if (!title) throw new AppError(400, "title is required", "GOAL_TITLE_REQUIRED");
  if (!periodStart) throw new AppError(400, "periodStart is required", "GOAL_PERIOD_REQUIRED");
  const data = await createStudentPlannerGoal({
    studentUserId,
    goalType: goalType === "MONTHLY" ? "MONTHLY" : "WEEKLY",
    periodStart,
    title,
    subject: subject ?? null,
    targetMinutes,
    targetTasks,
    notes: notes ?? null,
  });
  res.status(201).json({ success: true, data });
}

export async function updateStudentPlannerGoalController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const goalId = paramValue(req.params.goalId, "GOAL_ID_REQUIRED");
  const { title, subject, targetMinutes, targetTasks, completedTasks, status, notes } = req.body as {
    title?: string;
    subject?: string | null;
    targetMinutes?: number;
    targetTasks?: number;
    completedTasks?: number;
    status?: string;
    notes?: string | null;
  };
  const data = await updateStudentPlannerGoal({ goalId, studentUserId, title, subject, targetMinutes, targetTasks, completedTasks, status, notes });
  res.json({ success: true, data });
}

export async function deleteStudentPlannerGoalController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const goalId = paramValue(req.params.goalId, "GOAL_ID_REQUIRED");
  const data = await deleteStudentPlannerGoal(goalId, studentUserId);
  res.json({ success: true, data });
}

export async function listStudentPlannerNotesController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const data = await listStudentPlannerNotes(studentUserId);
  res.json({ success: true, data });
}

export async function createStudentPlannerNoteController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const { noteText, color, pinned } = req.body as { noteText?: string; color?: string; pinned?: boolean };
  if (!noteText) throw new AppError(400, "noteText is required", "NOTE_TEXT_REQUIRED");
  const data = await createStudentPlannerNote({ studentUserId, noteText, color, pinned });
  res.status(201).json({ success: true, data });
}

export async function updateStudentPlannerNoteController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const noteId = paramValue(req.params.noteId, "NOTE_ID_REQUIRED");
  const { noteText, color, pinned, posX, posY, width, height } = req.body as {
    noteText?: string;
    color?: string;
    pinned?: boolean;
    posX?: number;
    posY?: number;
    width?: number;
    height?: number;
  };
  const data = await updateStudentPlannerNote({ noteId, studentUserId, noteText, color, pinned, posX, posY, width, height });
  res.json({ success: true, data });
}

export async function deleteStudentPlannerNoteController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const noteId = paramValue(req.params.noteId, "NOTE_ID_REQUIRED");
  const data = await deleteStudentPlannerNote(noteId, studentUserId);
  res.json({ success: true, data });
}

export async function listStudentPlannerExamsController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const data = await listStudentPlannerExams(studentUserId);
  res.json({ success: true, data });
}

export async function createStudentPlannerExamController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const { title, examAt, subject, priority, notes } = req.body as { title?: string; examAt?: string; subject?: string; priority?: string; notes?: string };
  if (!title) throw new AppError(400, "title is required", "EXAM_TITLE_REQUIRED");
  if (!examAt) throw new AppError(400, "examAt is required", "EXAM_DATE_REQUIRED");
  const data = await createStudentPlannerExam({ studentUserId, title, examAt, subject: subject ?? null, priority, notes: notes ?? null });
  res.status(201).json({ success: true, data });
}

export async function updateStudentPlannerExamController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const examId = paramValue(req.params.examId, "EXAM_ID_REQUIRED");
  const { title, examAt, subject, priority, notes } = req.body as {
    title?: string;
    examAt?: string;
    subject?: string | null;
    priority?: string;
    notes?: string | null;
  };
  const data = await updateStudentPlannerExam({ examId, studentUserId, title, examAt, subject, priority, notes });
  res.json({ success: true, data });
}

export async function deleteStudentPlannerExamController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const examId = paramValue(req.params.examId, "EXAM_ID_REQUIRED");
  const data = await deleteStudentPlannerExam(examId, studentUserId);
  res.json({ success: true, data });
}

export async function listStudentPlannerHabitsController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const toDate = String(req.query.toDate ?? new Date().toISOString().slice(0, 10));
  const fromDate = String(req.query.fromDate ?? (() => {
    const date = new Date(toDate);
    date.setDate(date.getDate() - 29);
    return date.toISOString().slice(0, 10);
  })());
  const data = await listStudentPlannerHabits(studentUserId, fromDate, toDate);
  res.json({ success: true, data });
}

export async function updateStudentPlannerHabitController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const { habitDate, studied, water, sleep, exercise, notes } = req.body as { habitDate?: string; studied?: boolean; water?: boolean; sleep?: boolean; exercise?: boolean; notes?: string };
  if (!habitDate) throw new AppError(400, "habitDate is required", "HABIT_DATE_REQUIRED");
  const data = await updateStudentPlannerHabit({ studentUserId, habitDate, studied, water, sleep, exercise, notes: notes ?? null });
  res.json({ success: true, data });
}

export async function getStudentPlannerAnalyticsController(req: Request, res: Response) {
  const { studentUserId } = requireStudentContext(req);
  const toDate = String(req.query.toDate ?? new Date().toISOString().slice(0, 10));
  const fromDate = String(req.query.fromDate ?? (() => {
    const date = new Date(toDate);
    date.setDate(date.getDate() - 34);
    return date.toISOString().slice(0, 10);
  })());
  const data = await getStudentPlannerAnalytics(studentUserId, fromDate, toDate);
  res.json({ success: true, data });
}
