import type { Request, Response } from "express";
import { AppError } from "../lib/errors";
import {
  createOwnerStudentInterventionNote,
  createManualRevision,
  createStudentFeedPost,
  createSyllabusSubject,
  createSyllabusTopic,
  completeStudentRevision,
  getStudentFeed,
  getOwnerStudentProductivity,
  getOwnerProductivityTrends,
  getStudentRevisionDashboard,
  listOwnerFollowUpQueue,
  getStudentAnalytics,
  getStudentFocusLeaderboard,
  getStudentSyllabus,
  listStudentLibraries,
  setActiveStudentLibrary,
  updateStudentFeedVisibility,
  updateOwnerStudentInterventionStatus,
  updateSyllabusTopicProgress,
} from "../services/productivity.service";
import {
  completeRevisionBodySchema,
  createFeedPostBodySchema,
  createManualRevisionBodySchema,
  createStudentInterventionNoteBodySchema,
  createSyllabusSubjectBodySchema,
  createSyllabusTopicBodySchema,
  updateFeedVisibilityBodySchema,
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
