import type { Request, Response } from "express";
import { requireDb } from "../lib/db";
import { AppError } from "../lib/errors";
import { saveUploadedBookRequestToc } from "../lib/storage";

function requireStudent(req: Request) {
  if (!req.auth || req.auth.role !== "STUDENT") {
    throw new AppError(401, "Student authentication required", "STUDENT_AUTH_REQUIRED");
  }
  return {
    studentUserId: req.auth.userId,
    libraryId: req.tenant?.libraryId ?? req.auth.libraryIds[0] ?? null,
  };
}

function requireOwner(req: Request) {
  if (!req.auth || req.auth.role !== "LIBRARY_OWNER" || !req.auth.libraryIds[0]) {
    throw new AppError(401, "Library owner authentication required", "OWNER_AUTH_REQUIRED");
  }
  return {
    ownerUserId: req.auth.userId,
    libraryId: req.auth.libraryIds[0],
  };
}

function bodyText(value: unknown, maxLength: number) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, maxLength) : null;
}

function normalizeBookRequest(row: Record<string, unknown>) {
  return {
    id: row.id,
    student_user_id: row.student_user_id,
    student_name: row.student_name ?? null,
    library_id: row.library_id ?? null,
    title: row.title,
    author: row.author ?? null,
    class_name: row.class_name ?? null,
    subject: row.subject ?? null,
    message: row.message ?? null,
    toc_image_url: row.toc_image_url ?? null,
    status: row.status,
    created_at: row.created_at,
    reviewed_at: row.reviewed_at ?? null,
  };
}

export async function createStudentBookRequestController(req: Request, res: Response) {
  const { studentUserId, libraryId } = requireStudent(req);
  const title = bodyText(req.body.title, 180);
  if (!title) {
    throw new AppError(400, "Book title is required", "BOOK_TITLE_REQUIRED");
  }

  let tocImageUrl: string | null = null;
  if (req.file) {
    const stored = await saveUploadedBookRequestToc({ file: req.file, studentUserId });
    tocImageUrl = stored.url;
  }

  const result = await requireDb().query(
    `
    INSERT INTO student_book_requests (
      student_user_id, library_id, title, author, class_name, subject, message, toc_image_url
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id::text, student_user_id::text, library_id::text, title, author, class_name, subject, message, toc_image_url, status, created_at::text, reviewed_at::text
    `,
    [
      studentUserId,
      libraryId,
      title,
      bodyText(req.body.author, 140),
      bodyText(req.body.className, 80),
      bodyText(req.body.subject, 120),
      bodyText(req.body.message, 1000),
      tocImageUrl,
    ],
  );

  res.status(201).json({ success: true, data: normalizeBookRequest(result.rows[0]) });
}

export async function listStudentBookRequestsController(req: Request, res: Response) {
  const { studentUserId } = requireStudent(req);
  const result = await requireDb().query(
    `
    SELECT id::text, student_user_id::text, library_id::text, title, author, class_name, subject, message, toc_image_url, status, created_at::text, reviewed_at::text
    FROM student_book_requests
    WHERE student_user_id = $1
    ORDER BY created_at DESC
    LIMIT 30
    `,
    [studentUserId],
  );
  res.json({ success: true, data: result.rows.map(normalizeBookRequest) });
}

export async function listOwnerBookRequestsController(req: Request, res: Response) {
  const { libraryId } = requireOwner(req);
  const result = await requireDb().query(
    `
    SELECT
      sbr.id::text,
      sbr.student_user_id::text,
      sbr.library_id::text,
      u.full_name AS student_name,
      sbr.title,
      sbr.author,
      sbr.class_name,
      sbr.subject,
      sbr.message,
      sbr.toc_image_url,
      sbr.status,
      sbr.created_at::text,
      sbr.reviewed_at::text
    FROM student_book_requests sbr
    INNER JOIN users u ON u.id = sbr.student_user_id
    WHERE sbr.library_id = $1
    ORDER BY sbr.created_at DESC
    LIMIT 80
    `,
    [libraryId],
  );
  res.json({ success: true, data: result.rows.map(normalizeBookRequest) });
}

export async function updateOwnerBookRequestStatusController(req: Request, res: Response) {
  const { libraryId, ownerUserId } = requireOwner(req);
  const requestId = req.params.requestId;
  const status = String(req.body.status ?? "").trim();
  if (!["PENDING", "APPROVED", "REJECTED", "FULFILLED"].includes(status)) {
    throw new AppError(400, "Invalid book request status", "INVALID_BOOK_REQUEST_STATUS");
  }

  const result = await requireDb().query(
    `
    UPDATE student_book_requests
    SET status = $3,
        reviewed_by_user_id = $4,
        reviewed_at = CASE WHEN $3 = 'PENDING' THEN NULL ELSE NOW() END,
        updated_at = NOW()
    WHERE id = $1
      AND library_id = $2
    RETURNING id::text, student_user_id::text, library_id::text, title, author, class_name, subject, message, toc_image_url, status, created_at::text, reviewed_at::text
    `,
    [requestId, libraryId, status, ownerUserId],
  );
  if (!result.rows[0]) {
    throw new AppError(404, "Book request not found", "BOOK_REQUEST_NOT_FOUND");
  }
  res.json({ success: true, data: normalizeBookRequest(result.rows[0]) });
}
