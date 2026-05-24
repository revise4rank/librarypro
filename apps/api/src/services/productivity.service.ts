import { getRedisClient } from "../lib/cache";
import { requireDb } from "../lib/db";
import { AppError } from "../lib/errors";
import { deliverOwnerFollowUpReminder } from "../lib/notification-channels";
import { ProductivityRepository } from "../repositories/productivity.repository";

const leaderboardCache = new Map<string, { expiresAt: number; value: unknown }>();
const LEADERBOARD_TTL_MS = 5 * 60 * 1000;
const TREND_DAYS = 14;
const TREND_DAYS_LONG = 30;

function repository() {
  return new ProductivityRepository(requireDb());
}

async function syncStudentBadges(studentUserId: string, analytics: {
  attendanceDays: number;
  longestStreak: number;
  totalStudyHours: number;
  deepWorkHours: number;
}) {
  const badgeDefinitions = [
    { code: "STREAK_3", label: "3 day streak", unlocked: analytics.longestStreak >= 3, tier: "BRONZE", icon: "Bolt", family: "STREAK" },
    { code: "STREAK_7", label: "7 day streak", unlocked: analytics.longestStreak >= 7, tier: "SILVER", icon: "Spark", family: "STREAK" },
    { code: "STREAK_14", label: "14 day streak", unlocked: analytics.longestStreak >= 14, tier: "GOLD", icon: "Crown", family: "STREAK" },
    { code: "ATTENDANCE_20", label: "20 day attendance", unlocked: analytics.attendanceDays >= 20, tier: "SILVER", icon: "Compass", family: "ATTENDANCE" },
    { code: "STUDY_50_HOURS", label: "50 study hours", unlocked: analytics.totalStudyHours >= 50, tier: "GOLD", icon: "Flame", family: "STUDY" },
    { code: "DEEP_WORK_10", label: "10 deep work hours", unlocked: analytics.deepWorkHours >= 10, tier: "SILVER", icon: "Orbit", family: "FOCUS" },
  ];

  const unlocked = badgeDefinitions.filter((badge) => badge.unlocked);
  if (unlocked.length === 0) {
    return repository().listStudentBadges(studentUserId);
  }

  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    for (const badge of unlocked) {
      await repo.awardStudentBadge(client, {
        studentUserId,
        badgeCode: badge.code,
        badgeLabel: badge.label,
        metadata: {
          attendanceDays: analytics.attendanceDays,
          longestStreak: analytics.longestStreak,
          totalStudyHours: analytics.totalStudyHours,
          deepWorkHours: analytics.deepWorkHours,
          tier: badge.tier,
          icon: badge.icon,
          family: badge.family,
        },
      });
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return repo.listStudentBadges(studentUserId);
}

function getLeaderboardCached<T>(key: string) {
  const current = leaderboardCache.get(key);
  if (!current) return null;
  if (current.expiresAt < Date.now()) {
    leaderboardCache.delete(key);
    return null;
  }
  return current.value as T;
}

function setLeaderboardCached(key: string, value: unknown) {
  leaderboardCache.set(key, {
    value,
    expiresAt: Date.now() + LEADERBOARD_TTL_MS,
  });
}

export async function listStudentLibraries(studentUserId: string) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await repo.ensureStudentLibraryMappings(client, studentUserId);
    return await repo.listStudentLibraries(client, studentUserId);
  } finally {
    client.release();
  }
}

export async function setActiveStudentLibrary(studentUserId: string, libraryId: string) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await repo.ensureStudentLibraryMappings(client, studentUserId);
    await repo.setActiveStudentLibrary(client, studentUserId, libraryId);
    await client.query("COMMIT");
    return { libraryId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createSyllabusSubject(input: {
  studentUserId: string;
  title: string;
  colorHex?: string | null;
  className?: string | null;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    return await repo.createSubject(client, input);
  } finally {
    client.release();
  }
}

export async function listGlobalSyllabusTemplates(className?: string | null) {
  return repository().listGlobalSyllabusTemplates(className);
}

export async function importGlobalSyllabusRows(input: {
  createdByUserId: string;
  rows: Array<{
    className: string;
    subjectTitle: string;
    topicTitle: string;
    estimatedMinutes: number;
    topicOrder: number;
    colorHex?: string | null;
  }>;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await repo.importGlobalSyllabusRows(client, input);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listAdminBooks(filters: {
  q?: string | null;
  className?: string | null;
  subject?: string | null;
  status?: string | null;
}) {
  return repository().listAdminBooks(filters);
}

export async function getAdminBook(bookId: string) {
  const book = await repository().getGlobalBook(bookId);
  if (!book) {
    throw new AppError(404, "Book not found", "BOOK_NOT_FOUND");
  }
  return book;
}

export async function importGlobalBookRows(input: {
  createdByUserId: string;
  rows: Array<{
    bookTitle: string;
    author?: string | null;
    className?: string | null;
    subject?: string | null;
    language?: string | null;
    chapterTitle: string;
    chapterOrder: number;
    topicTitle: string;
    topicOrder: number;
    estimatedMinutes: number;
  }>;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await repo.importGlobalBookRows(client, input);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateAdminBook(input: {
  bookId: string;
  title?: string;
  author?: string | null;
  className?: string | null;
  subject?: string | null;
  language?: string | null;
  status?: "DRAFT" | "PUBLISHED" | "UNPUBLISHED";
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await repo.updateGlobalBook(client, input.bookId, input);
    if (!result) {
      throw new AppError(404, "Book not found", "BOOK_NOT_FOUND");
    }
    await client.query("COMMIT");
    return await repo.getGlobalBook(input.bookId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createAdminBookChapter(input: { bookId: string; chapterTitle: string; chapterOrder: number }) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const chapter = await repo.createOrUpdateGlobalBookChapter(client, input);
    await client.query("COMMIT");
    return chapter;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateAdminBookChapter(input: {
  bookId: string;
  chapterId: string;
  chapterTitle?: string;
  chapterOrder?: number;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const chapter = await repo.updateGlobalBookChapter(client, input);
    if (!chapter) throw new AppError(404, "Chapter not found", "BOOK_CHAPTER_NOT_FOUND");
    await client.query("COMMIT");
    return chapter;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createAdminBookTopic(input: {
  bookId: string;
  chapterId: string;
  topicTitle: string;
  topicOrder: number;
  estimatedMinutes: number;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const topic = await repo.createOrUpdateGlobalBookTopic(client, input);
    await client.query("COMMIT");
    return topic;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateAdminBookTopic(input: {
  bookId: string;
  topicId: string;
  chapterId?: string;
  topicTitle?: string;
  topicOrder?: number;
  estimatedMinutes?: number;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const topic = await repo.updateGlobalBookTopic(client, input);
    if (!topic) throw new AppError(404, "Topic not found", "BOOK_TOPIC_NOT_FOUND");
    await client.query("COMMIT");
    return topic;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function searchStudentBooks(filters: { q?: string | null; className?: string | null; subject?: string | null }) {
  return repository().searchPublishedBooks(filters);
}

export async function listStudentBooks(studentUserId: string) {
  return repository().listStudentBooks(studentUserId);
}

export async function getStudentBook(input: { studentUserId: string; studentBookId: string }) {
  const book = await repository().getStudentBook(input.studentUserId, input.studentBookId);
  if (!book) throw new AppError(404, "Student book not found", "STUDENT_BOOK_NOT_FOUND");
  return book;
}

export async function addStudentBook(input: { studentUserId: string; bookId: string }) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await repo.addBookForStudent(client, input);
    await client.query("COMMIT");
    return { ...result, book: await repo.getStudentBook(input.studentUserId, result.studentBookId) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function syncStudentBook(input: { studentUserId: string; studentBookId: string }) {
  const current = await repository().getStudentBook(input.studentUserId, input.studentBookId);
  if (!current) throw new AppError(404, "Student book not found", "STUDENT_BOOK_NOT_FOUND");
  return addStudentBook({ studentUserId: input.studentUserId, bookId: current.book_id });
}

export async function importSyllabusTemplateForStudent(input: {
  studentUserId: string;
  className: string;
  subjectTitle?: string;
}) {
  const templates = await repository().listGlobalSyllabusTemplates(input.className);
  const selectedTemplates = input.subjectTitle
    ? templates.filter((subject) => subject.subject_title === input.subjectTitle)
    : templates;

  if (selectedTemplates.length === 0) {
    throw new AppError(404, "No syllabus template found for this class", "SYLLABUS_TEMPLATE_NOT_FOUND");
  }

  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    let subjectsImported = 0;
    let topicsImported = 0;
    for (const template of selectedTemplates) {
      let subject = await repo.findSubjectByStudentTitleClass(client, {
        studentUserId: input.studentUserId,
        title: template.subject_title,
        className: template.class_name,
      });
      if (!subject) {
        subject = await repo.createSubject(client, {
          studentUserId: input.studentUserId,
          title: template.subject_title,
          colorHex: template.color_hex,
          className: template.class_name,
        });
        subjectsImported += 1;
      }
      for (const topic of template.topics) {
        const importedTopic = await repo.createTopicIfMissing(client, {
          studentUserId: input.studentUserId,
          subjectId: subject.id,
          title: topic.topic_title,
          estimatedMinutes: topic.estimated_minutes,
          topicOrder: topic.topic_order,
        });
        if (importedTopic.created) {
          topicsImported += 1;
        }
      }
    }
    await client.query("COMMIT");
    return { subjectsImported, topicsImported };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createSyllabusTopic(input: {
  studentUserId: string;
  subjectId: string;
  title: string;
  estimatedMinutes: number;
  topicOrder: number;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    return await repo.createTopic(client, input);
  } finally {
    client.release();
  }
}

export async function updateSyllabusTopicProgress(input: {
  studentUserId: string;
  libraryId?: string | null;
  actorName?: string;
  topicId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  progressPercent: number;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await repo.updateTopicProgress(client, input);
    if (input.status === "COMPLETED") {
      const topic = await repo.getTopicForStudent(input.studentUserId, input.topicId);
      if (topic) {
        const revisionStages = [
          { stage: 1, offsetDays: 1, priority: 90 },
          { stage: 2, offsetDays: 3, priority: 75 },
          { stage: 3, offsetDays: 7, priority: 60 },
          { stage: 4, offsetDays: 15, priority: 45 },
        ];

        for (const revision of revisionStages) {
          const scheduledFor = new Date(Date.now() + revision.offsetDays * 24 * 60 * 60 * 1000).toISOString();
          await repo.createRevisionSchedule(client, {
            studentUserId: input.studentUserId,
            libraryId: input.libraryId ?? null,
            subjectId: topic.subject_id,
            topicId: input.topicId,
            sourceType: "AUTO",
            revisionStage: revision.stage,
            scheduledFor,
            priorityScore: revision.priority,
            metadata: {
              reason: "TOPIC_COMPLETED",
              offsetDays: revision.offsetDays,
            },
          });
        }

        const counts = await repo.countCompletedTopicsBySubject(input.studentUserId, topic.subject_id);
        const visibility = await repo.getFeedVisibilitySettings(input.studentUserId);
        if (visibility.allow_subject_completion_posts) {
          await repo.createFeedPost(client, {
            studentUserId: input.studentUserId,
            libraryId: input.libraryId ?? null,
            eventType: "TOPIC_COMPLETED",
            visibility: visibility.default_visibility,
            actorName: input.actorName ?? "Student",
            title: `${topic.topic_title} completed`,
            body: `${input.actorName ?? "Student"} completed ${topic.topic_title} and unlocked a revision path.`,
            metrics: {
              progressPercent: 100,
              completedTopics: Number(counts.completed_topics),
              totalTopics: Number(counts.total_topics),
            },
            metadata: {
              subjectId: topic.subject_id,
              subjectTitle: topic.subject_title,
              topicId: topic.topic_id,
              topicTitle: topic.topic_title,
            },
          });

          if (counts.completed_topics === counts.total_topics) {
            await repo.createFeedPost(client, {
              studentUserId: input.studentUserId,
              libraryId: input.libraryId ?? null,
              eventType: "SUBJECT_COMPLETED",
              visibility: visibility.default_visibility,
              actorName: input.actorName ?? "Student",
              title: `${topic.subject_title} syllabus completed`,
              body: `${input.actorName ?? "Student"} completed the full ${topic.subject_title} syllabus.`,
              metrics: {
                completedTopics: Number(counts.completed_topics),
                totalTopics: Number(counts.total_topics),
              },
              metadata: {
                subjectId: topic.subject_id,
                subjectTitle: topic.subject_title,
              },
            });
          }
        }
      }
    }
    await client.query("COMMIT");
    return { topicId: input.topicId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getStudentSyllabus(studentUserId: string) {
  const [subjects, books, analytics, habit] = await Promise.all([
    repository().listSyllabus(studentUserId),
    repository().listStudentBooks(studentUserId),
    repository().getSyllabusAnalytics(studentUserId),
    repository().getSyllabusHabitAnalytics(studentUserId),
  ]);
  const bookTopicTotal = books.reduce((sum, book) => sum + Number(book.total_topics), 0);
  const completedBookTopics = books.reduce((sum, book) => sum + Number(book.completed_topics), 0);
  const booksWithNewTopics = books.filter((book) => Number(book.new_topics_available) > 0).length;
  const completedDays = new Set(habit.completionDays.map((row) => row.day_value));
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  const streakAnchor = completedDays.has(todayKey) ? today : completedDays.has(yesterdayKey) ? yesterday : null;
  let completionStreakDays = 0;
  if (streakAnchor) {
    for (let offset = 0; offset < 365; offset += 1) {
      const day = new Date(streakAnchor.getTime() - offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      if (!completedDays.has(day)) break;
      completionStreakDays += 1;
    }
  }
  const longestCompletionStreak = habit.completionDays
    .map((row) => row.day_value)
    .sort()
    .reduce(
      (state, dayValue) => {
        const previous = state.previous ? new Date(`${state.previous}T00:00:00.000Z`) : null;
        const current = new Date(`${dayValue}T00:00:00.000Z`);
        const consecutive = previous && current.getTime() - previous.getTime() === 24 * 60 * 60 * 1000;
        const currentCount = consecutive ? state.current + 1 : 1;
        return {
          previous: dayValue,
          current: currentCount,
          best: Math.max(state.best, currentCount),
        };
      },
      { previous: "", current: 0, best: 0 },
    ).best;
  return {
    subjects,
    books,
    analytics: {
      totalSubjects: Number(analytics.total_subjects),
      totalTopics: Number(analytics.total_topics),
      completedTopics: Number(analytics.completed_topics),
      activeBooks: books.length,
      bookTopics: bookTopicTotal,
      completedBookTopics,
      booksWithNewTopics,
      dailyCompletedTopics: Number(analytics.daily_completed_topics),
      completionPercent:
        Number(analytics.total_topics) > 0
          ? Math.round((Number(analytics.completed_topics) / Number(analytics.total_topics)) * 100)
          : 0,
      completionStreakDays,
      longestCompletionStreak,
      remainingTopics: Number(habit.remaining?.remaining_topics ?? 0),
      remainingMinutes: Number(habit.remaining?.remaining_minutes ?? 0),
      inProgressTopics: Number(habit.remaining?.in_progress_topics ?? 0),
      weeklyCompletions: habit.weekly.map((row) => ({
        date: row.day_value,
        completedTopics: Number(row.completed_topics),
      })),
      nextTopics: habit.nextTopics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        subjectTitle: topic.subject_title,
        className: topic.class_name,
        estimatedMinutes: Number(topic.estimated_minutes),
        progressPercent: Number(topic.progress_percent),
      })),
    },
  };
}

export async function getStudentAnalytics(input: { studentUserId: string; libraryId?: string | null }) {
  const data = await repository().getStudentAnalytics(input.studentUserId, input.libraryId);
  const normalized = {
    totalStudyHours: Math.round(Number(data.total_focus_minutes) / 60),
    weeklyStudyHours: Math.round(Number(data.weekly_focus_minutes) / 60),
    monthlyStudyHours: Math.round(Number(data.monthly_focus_minutes) / 60),
    focusSessionsCount: Number(data.focus_sessions_count),
    attendanceDays: Number(data.attendance_days),
    missedDays: Number(data.missed_days),
    avgEntryHour: data.avg_entry_hour ? `${data.avg_entry_hour}:00` : null,
    mostStudiedSubject: data.most_studied_subject,
    longestStreak: Number(data.longest_streak),
    deepWorkHours: Number(data.deep_work_hours),
  };
  const badges = await syncStudentBadges(input.studentUserId, {
    attendanceDays: normalized.attendanceDays,
    longestStreak: normalized.longestStreak,
    totalStudyHours: normalized.totalStudyHours,
    deepWorkHours: normalized.deepWorkHours,
  });

  return {
    ...normalized,
    badges: badges.map((badge) => ({
      badgeCode: badge.badge_code,
      badgeLabel: badge.badge_label,
      awardedAt: badge.awarded_at,
      metadata: badge.metadata ?? {},
    })),
  };
}

export async function getStudentRevisionDashboard(input: { studentUserId: string; libraryId?: string | null }) {
  const [rows, analytics] = await Promise.all([
    repository().listRevisionSchedules(input.studentUserId, input.libraryId),
    repository().getRevisionAnalytics(input.studentUserId, input.libraryId),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      topicId: row.topic_id,
      subjectId: row.subject_id,
      subjectTitle: row.subject_title,
      topicTitle: row.topic_title,
      sourceType: row.source_type,
      revisionStage: row.revision_stage,
      scheduledFor: row.scheduled_for,
      status: row.status,
      priorityScore: row.priority_score,
      completedAt: row.completed_at,
    })),
    analytics: {
      pendingCount: Number(analytics.pending_count),
      completedCount: Number(analytics.completed_count),
      overdueCount: Number(analytics.overdue_count),
      revisionCompletionPercent: Number(analytics.revision_completion_percent),
      revisionConsistencyDays: Number(analytics.revision_consistency_days),
      weakTopics: Number(analytics.weak_topics),
    },
  };
}

export async function createManualRevision(input: {
  studentUserId: string;
  libraryId?: string | null;
  topicId: string;
  scheduledFor: string;
  minutesTarget: number;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const topic = await repo.getTopicForStudent(input.studentUserId, input.topicId);
    if (!topic) {
      throw new AppError(404, "Topic not found", "REVISION_TOPIC_NOT_FOUND");
    }
    const row = await repo.createRevisionSchedule(client, {
      studentUserId: input.studentUserId,
      libraryId: input.libraryId ?? null,
      subjectId: topic.subject_id,
      topicId: input.topicId,
      sourceType: "MANUAL",
      revisionStage: 100 + Math.floor(Math.random() * 1000),
      scheduledFor: input.scheduledFor,
      priorityScore: Math.min(100, input.minutesTarget + 35),
      metadata: {
        reason: "MANUAL",
        minutesTarget: input.minutesTarget,
      },
    });
    await client.query("COMMIT");
    return row;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function completeStudentRevision(input: {
  studentUserId: string;
  revisionId: string;
  minutesSpent: number;
  confidenceScore: number;
  notes?: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const row = await repo.completeRevisionSchedule(client, input);
    if (!row) {
      throw new AppError(404, "Revision not found", "REVISION_NOT_FOUND");
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

export async function getStudentFeed(input: { studentUserId: string; libraryId?: string | null }) {
  const [posts, visibility] = await Promise.all([
    repository().listStudentFeed(input.studentUserId, input.libraryId),
    repository().getFeedVisibilitySettings(input.studentUserId),
  ]);

  return {
    items: posts.map((post) => ({
      id: post.id,
      studentUserId: post.student_user_id,
      libraryId: post.library_id,
      eventType: post.event_type,
      visibility: post.visibility,
      actorName: post.actor_name,
      title: post.title,
      body: post.body,
      metrics: post.metrics ?? {},
      metadata: post.metadata ?? {},
      createdAt: post.created_at,
      likeCount: Number(post.like_count ?? "0"),
    })),
    visibility: {
      defaultVisibility: visibility.default_visibility,
      allowSubjectCompletionPosts: visibility.allow_subject_completion_posts,
      allowFocusPosts: visibility.allow_focus_posts,
      allowStreakPosts: visibility.allow_streak_posts,
    },
  };
}

export async function createStudentFeedPost(input: {
  studentUserId: string;
  libraryId?: string | null;
  actorName: string;
  eventType: string;
  title: string;
  body: string;
  visibility: "PUBLIC" | "LIBRARY_MEMBERS" | "PRIVATE";
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    const row = await repo.createFeedPost(client, {
      studentUserId: input.studentUserId,
      libraryId: input.libraryId ?? null,
      actorName: input.actorName,
      eventType: input.eventType,
      title: input.title,
      body: input.body,
      visibility: input.visibility,
    });
    return row;
  } finally {
    client.release();
  }
}

export async function updateStudentFeedVisibility(input: {
  studentUserId: string;
  defaultVisibility: "PUBLIC" | "LIBRARY_MEMBERS" | "PRIVATE";
  allowSubjectCompletionPosts: boolean;
  allowFocusPosts: boolean;
  allowStreakPosts: boolean;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await repo.upsertFeedVisibilitySettings(client, input);
    return repo.getFeedVisibilitySettings(input.studentUserId);
  } finally {
    client.release();
  }
}

async function getLeaderboardValue(cacheKey: string) {
  const redis = await getRedisClient();
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as typeof leaderboardRows;
    }
  }

  return getLeaderboardCached<typeof leaderboardRows>(cacheKey);
}

async function setLeaderboardValue(cacheKey: string, value: typeof leaderboardRows) {
  const redis = await getRedisClient();
  if (redis) {
    await redis.setEx(cacheKey, Math.ceil(LEADERBOARD_TTL_MS / 1000), JSON.stringify(value));
    return;
  }

  setLeaderboardCached(cacheKey, value);
}

export async function getStudentFocusLeaderboard(libraryId: string, window: "7d" | "30d" = "7d") {
  const cacheKey = `focus:leaderboard:${libraryId}:${window}`;
  const cached = await getLeaderboardValue(cacheKey);
  if (cached) {
    return cached;
  }
  const leaderboardRows = await repository().getFocusLeaderboard(libraryId, window);
  const normalized = leaderboardRows
    .map((row, index) => ({
    rank: index + 1,
    studentUserId: row.student_user_id,
    studentName: row.student_name,
    totalMinutes: Number(row.total_minutes),
    totalSessions: Number(row.total_sessions),
  }))
    .slice(0, window === "30d" ? 10 : 10);
  await setLeaderboardValue(cacheKey, normalized);
  return normalized;
}

export async function getOwnerStudentProductivity(input: { libraryId: string; studentUserId: string }) {
  const repo = repository();
  const [isMapped, analytics, syllabus, focusSubjects, recentSessions, notes, trends] = await Promise.all([
    repo.isStudentMappedToLibrary(input.libraryId, input.studentUserId),
    repo.getStudentAnalytics(input.studentUserId, input.libraryId),
    repo.getSyllabusAnalytics(input.studentUserId),
    repo.listFocusSubjectTotals(input.studentUserId),
    repo.listRecentFocusSessions(input.studentUserId),
    repo.listStudentInterventionNotes(input.libraryId, input.studentUserId),
    repo.getStudentProductivityTrends(input.studentUserId, input.libraryId, TREND_DAYS),
  ]);

  if (!isMapped) {
    throw new AppError(404, "Student not mapped to this library", "OWNER_STUDENT_NOT_FOUND");
  }

  const badges = await syncStudentBadges(input.studentUserId, {
    attendanceDays: Number(analytics.attendance_days),
    longestStreak: Number(analytics.longest_streak),
    totalStudyHours: Math.round(Number(analytics.total_focus_minutes) / 60),
    deepWorkHours: Number(analytics.deep_work_hours),
  });

  return {
    summary: {
      totalStudyHours: Math.round(Number(analytics.total_focus_minutes) / 60),
      weeklyStudyHours: Math.round(Number(analytics.weekly_focus_minutes) / 60),
      attendanceDays: Number(analytics.attendance_days),
      missedDays: Number(analytics.missed_days),
      longestStreak: Number(analytics.longest_streak),
      deepWorkHours: Number(analytics.deep_work_hours),
      mostStudiedSubject: analytics.most_studied_subject,
      completedTopics: Number(syllabus.completed_topics),
      totalTopics: Number(syllabus.total_topics),
      dailyCompletedTopics: Number(syllabus.daily_completed_topics),
    },
    badges: badges.map((badge) => ({
      badgeCode: badge.badge_code,
      badgeLabel: badge.badge_label,
      awardedAt: badge.awarded_at,
      metadata: badge.metadata ?? {},
    })),
    focusSubjects: focusSubjects.map((row) => ({
      subjectLabel: row.subject_label,
      totalMinutes: Number(row.total_minutes),
      totalSessions: Number(row.total_sessions),
    })),
    recentSessions: recentSessions.map((session) => ({
      topicTitle: session.topic_title,
      sessionType: session.session_type,
      durationMinutes: Number(session.duration_minutes),
      completedAt: session.completed_at,
    })),
    trends: trends.map((point) => ({
      date: point.day_value,
      focusMinutes: Number(point.focus_minutes),
      attendanceCount: Number(point.attendance_students),
      focusSessions: Number(point.focus_sessions),
    })),
    interventionNotes: notes.map((note) => ({
      id: note.id,
      noteText: note.note_text,
      noteType: note.note_type,
      noteStatus: note.note_status,
      followUpAt: note.follow_up_at,
      actorName: note.actor_name,
      createdAt: note.created_at,
    })),
  };
}

export async function createOwnerStudentInterventionNote(input: {
  libraryId: string;
  studentUserId: string;
  actorUserId: string;
  noteText: string;
  noteType: "GENERAL" | "ATTENDANCE" | "FOCUS" | "PAYMENT" | "SYLLABUS";
  followUpAt?: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const isMapped = await repo.isStudentMappedToLibrary(input.libraryId, input.studentUserId);
    if (!isMapped) {
      throw new AppError(404, "Student not mapped to this library", "OWNER_STUDENT_NOT_FOUND");
    }
    const row = await repo.createStudentInterventionNote(client, input);
    await client.query("COMMIT");
    return row;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateOwnerStudentInterventionStatus(input: {
  libraryId: string;
  noteId: string;
  noteStatus: "OPEN" | "DONE" | "ESCALATED";
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const row = await repo.updateStudentInterventionStatus(client, input);
    if (!row) {
      throw new AppError(404, "Intervention note not found", "INTERVENTION_NOTE_NOT_FOUND");
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

export async function listOwnerFollowUpQueue(libraryId: string) {
  const rows = await repository().listOwnerFollowUpQueue(libraryId);
  return rows.map((row) => ({
    id: row.id,
    studentUserId: row.student_user_id!,
    studentName: row.student_name!,
    noteText: row.note_text,
    noteType: row.note_type,
    noteStatus: row.note_status,
    followUpAt: row.follow_up_at,
    actorName: row.actor_name,
    createdAt: row.created_at,
  }));
}

export async function getOwnerProductivityTrends(libraryId: string, window: "7d" | "30d" = "7d") {
  const days = window === "30d" ? TREND_DAYS_LONG : 7;
  const rows = await repository().getOwnerProductivityTrends(libraryId, days);
  const points = rows.map((row) => ({
    date: row.day_value,
    focusMinutes: Number(row.focus_minutes),
    attendanceStudents: Number(row.attendance_students),
    focusSessions: Number(row.focus_sessions),
  }));

  const topFocusDay = points.reduce(
    (best, current) => (current.focusMinutes > best.focusMinutes ? current : best),
    { date: points[0]?.date ?? "", focusMinutes: 0, attendanceStudents: 0, focusSessions: 0 },
  );
  const topAttendanceDay = points.reduce(
    (best, current) => (current.attendanceStudents > best.attendanceStudents ? current : best),
    { date: points[0]?.date ?? "", focusMinutes: 0, attendanceStudents: 0, focusSessions: 0 },
  );

  return {
    points,
    summary: {
      topFocusDay: topFocusDay.date || null,
      topFocusMinutes: topFocusDay.focusMinutes,
      topAttendanceDay: topAttendanceDay.date || null,
      topAttendanceStudents: topAttendanceDay.attendanceStudents,
    },
  };
}

export async function runOverdueFollowUpReminders() {
  const db = requireDb();
  const repo = repository();
  const candidates = await repo.listOverdueFollowUpReminderCandidates();
  if (candidates.length === 0) {
    return { reminderCount: 0, librariesTouched: 0 };
  }

  const byLibrary = new Map<string, typeof candidates>();
  for (const candidate of candidates) {
    const current = byLibrary.get(candidate.library_id) ?? [];
    current.push(candidate);
    byLibrary.set(candidate.library_id, current);
  }

  for (const [libraryId, libraryCandidates] of byLibrary) {
    const recipientIds = await repo.listOwnerRecipientIds(libraryId);
    if (recipientIds.length === 0) {
      continue;
    }

    const title = `${libraryCandidates.length} overdue student follow-up${libraryCandidates.length > 1 ? "s" : ""}`;
    const preview = libraryCandidates
      .slice(0, 3)
      .map((candidate) => `${candidate.student_name}: ${candidate.note_type.toLowerCase()}`)
      .join(", ");
    const message = `Pending coaching items need action. ${preview}${libraryCandidates.length > 3 ? "..." : ""}`;

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await repo.insertOwnerReminderNotifications(client, {
        libraryId,
        recipientIds,
        title,
        message,
      });
      await repo.insertInterventionReminderLogs(client, {
        noteIds: libraryCandidates.map((candidate) => candidate.note_id),
        reminderType: "OVERDUE",
        metadata: {
          title,
          preview,
        },
      });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    await deliverOwnerFollowUpReminder({
      libraryId,
      title,
      message,
      recipientCount: recipientIds.length,
      metadata: {
        reminderType: "OVERDUE_FOLLOW_UP",
        overdueNotes: libraryCandidates.length,
      },
    });
  }

  return {
    reminderCount: candidates.length,
    librariesTouched: byLibrary.size,
  };
}

// ─── Feed Likes ───────────────────────────────────────────────────────────────

export async function toggleFeedLike(postId: string, studentUserId: string) {
  return repo.toggleFeedLike(postId, studentUserId);
}

// ─── Study Planner ────────────────────────────────────────────────────────────

export async function listStudentPlannerWeek(studentUserId: string, weekStart: string) {
  const rows = await repo.listPlannerWeek(studentUserId, weekStart);
  return rows;
}

export async function listStudentPlannerMonth(studentUserId: string, monthStart: string) {
  const rows = await repo.listPlannerMonth(studentUserId, monthStart);
  return rows.map((row) => ({
    planDate: row.plan_date,
    totalEntries: parseInt(row.total_entries, 10),
    completedEntries: parseInt(row.completed_entries, 10),
    totalTarget: parseInt(row.total_target, 10),
    totalActual: parseInt(row.total_actual, 10),
  }));
}

export async function createStudentPlannerEntry(input: {
  studentUserId: string;
  planDate: string;
  subject?: string | null;
  targetMinutes: number;
  notes?: string | null;
}) {
  return repo.createPlannerEntry(input);
}

export async function updateStudentPlannerEntry(input: {
  entryId: string;
  studentUserId: string;
  actualMinutes?: number;
  completed?: boolean;
  notes?: string | null;
  subject?: string | null;
  targetMinutes?: number;
}) {
  const row = await repo.updatePlannerEntry(input);
  if (!row) throw new AppError(404, "Planner entry not found", "ENTRY_NOT_FOUND");
  return row;
}

export async function deleteStudentPlannerEntry(entryId: string, studentUserId: string) {
  const row = await repo.deletePlannerEntry(entryId, studentUserId);
  if (!row) throw new AppError(404, "Planner entry not found", "ENTRY_NOT_FOUND");
  return row;
}

const leaderboardRows: Array<{
  rank: number;
  studentUserId: string;
  studentName: string;
  totalMinutes: number;
  totalSessions: number;
}> = [];
