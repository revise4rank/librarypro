import { z } from "zod";

export const createSyllabusSubjectBodySchema = z.object({
  title: z.string().trim().min(2).max(120),
  colorHex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal("")),
});

export const createSyllabusTopicBodySchema = z.object({
  subjectId: z.string().uuid(),
  title: z.string().trim().min(2).max(180),
  estimatedMinutes: z.coerce.number().int().min(15).max(1440).default(60),
  topicOrder: z.coerce.number().int().min(0).max(5000).optional().default(0),
});

export const updateTopicProgressBodySchema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]),
  progressPercent: z.coerce.number().int().min(0).max(100).default(0),
});

export const createStudentInterventionNoteBodySchema = z.object({
  noteText: z.string().trim().min(4).max(1200),
  noteType: z.enum(["GENERAL", "ATTENDANCE", "FOCUS", "PAYMENT", "SYLLABUS"]).default("GENERAL"),
  followUpAt: z
    .string()
    .trim()
    .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), "Invalid follow-up date")
    .optional()
    .or(z.literal("")),
});

export const updateStudentInterventionStatusBodySchema = z.object({
  noteStatus: z.enum(["OPEN", "DONE", "ESCALATED"]).default("OPEN"),
});

export const createManualRevisionBodySchema = z.object({
  topicId: z.string().uuid(),
  scheduledFor: z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid revision date"),
  minutesTarget: z.coerce.number().int().min(5).max(240).default(25),
});

export const completeRevisionBodySchema = z.object({
  minutesSpent: z.coerce.number().int().min(1).max(300).default(25),
  confidenceScore: z.coerce.number().int().min(1).max(5).default(3),
  notes: z.string().trim().max(600).optional().or(z.literal("")),
});

export const createFeedPostBodySchema = z.object({
  eventType: z.enum(["CUSTOM_PROGRESS", "TOPIC_COMPLETED", "SUBJECT_COMPLETED", "FOCUS_STREAK", "FOCUS_HOURS"]),
  title: z.string().trim().min(2).max(180),
  body: z.string().trim().min(2).max(1000),
  visibility: z.enum(["PUBLIC", "LIBRARY_MEMBERS", "PRIVATE"]).default("LIBRARY_MEMBERS"),
});

export const updateFeedVisibilityBodySchema = z.object({
  defaultVisibility: z.enum(["PUBLIC", "LIBRARY_MEMBERS", "PRIVATE"]).default("LIBRARY_MEMBERS"),
  allowSubjectCompletionPosts: z.boolean().default(true),
  allowFocusPosts: z.boolean().default(true),
  allowStreakPosts: z.boolean().default(true),
});

export const createStudentRejoinRequestBodySchema = z.object({
  seatPreference: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});
