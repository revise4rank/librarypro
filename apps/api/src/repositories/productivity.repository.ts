import type { Pool, PoolClient } from "pg";

export type StudentLibraryRow = {
  library_id: string;
  library_name: string;
  city: string;
  seat_number: string | null;
  login_id: string;
  is_active: boolean;
  joined_at: string;
  left_at: string | null;
  status: "ACTIVE" | "LEFT";
};

export type SyllabusTopicRow = {
  id: string;
  subject_id: string;
  title: string;
  topic_order: number;
  estimated_minutes: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  progress_percent: number;
  completed_at: string | null;
};

export type SyllabusSubjectRow = {
  id: string;
  title: string;
  class_name: string | null;
  color_hex: string | null;
  total_topics: number;
  completed_topics: number;
  completion_percent: number;
  topics: SyllabusTopicRow[];
};

export type GlobalSyllabusSubjectRow = {
  id: string;
  class_name: string;
  subject_title: string;
  color_hex: string | null;
  topics: Array<{
    id: string;
    topic_title: string;
    topic_order: number;
    estimated_minutes: number;
  }>;
};

export type GlobalBookTopicRow = {
  id: string;
  chapter_id: string;
  topic_title: string;
  topic_order: number;
  estimated_minutes: number;
};

export type GlobalBookChapterRow = {
  id: string;
  chapter_title: string;
  chapter_order: number;
  topics: GlobalBookTopicRow[];
};

export type GlobalBookRow = {
  id: string;
  title: string;
  author: string | null;
  class_name: string | null;
  subject: string | null;
  language: string | null;
  status: "DRAFT" | "PUBLISHED" | "UNPUBLISHED";
  chapter_count: string;
  topic_count: string;
  student_count: string;
  updated_at: string;
  chapters?: GlobalBookChapterRow[];
};

export type StudentBookRow = {
  id: string;
  book_id: string;
  title: string;
  author: string | null;
  class_name: string | null;
  subject: string | null;
  language: string | null;
  added_at: string;
  total_topics: string;
  completed_topics: string;
  in_progress_topics: string;
  new_topics_available: string;
  chapters: GlobalBookChapterRow[];
};

export type StudentBadgeRow = {
  badge_code: string;
  badge_label: string;
  awarded_at: string;
  metadata: Record<string, unknown>;
};

export type StudentInterventionNoteRow = {
  id: string;
  student_user_id?: string;
  student_name?: string;
  note_text: string;
  note_type: string;
  actor_name: string;
  note_status: string;
  follow_up_at: string | null;
  created_at: string;
};

export type ProductivityTrendPointRow = {
  day_value: string;
  focus_minutes: string;
  attendance_students: string;
  focus_sessions: string;
};

export type OverdueFollowUpReminderCandidateRow = {
  note_id: string;
  library_id: string;
  student_user_id: string;
  student_name: string;
  note_text: string;
  note_type: string;
  note_status: string;
  follow_up_at: string;
  actor_name: string;
};

export type RevisionScheduleRow = {
  id: string;
  topic_id: string;
  subject_id: string | null;
  subject_title: string | null;
  topic_title: string;
  source_type: string;
  revision_stage: number;
  scheduled_for: string;
  status: string;
  priority_score: number;
  completed_at: string | null;
};

export type RevisionAnalyticsRow = {
  pending_count: string;
  completed_count: string;
  overdue_count: string;
  revision_completion_percent: string;
  revision_consistency_days: string;
  weak_topics: string;
};

export type FeedPostRow = {
  id: string;
  student_user_id: string;
  library_id: string | null;
  event_type: string;
  visibility: string;
  actor_name: string;
  title: string;
  body: string;
  metrics: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  like_count?: string;
};

export class ProductivityRepository {
  constructor(private readonly pool: Pool) {}

  async ensureStudentLibraryMappings(client: PoolClient, studentUserId: string) {
    await client.query(
      `
      INSERT INTO student_library_mapping (student_user_id, library_id, login_id, is_active, joined_at, updated_at)
      SELECT
        ulr.user_id,
        ulr.library_id,
        COALESCE(u.student_code, u.email, u.phone, 'student-' || substr(u.id::text, 1, 8)),
        NOT EXISTS (
          SELECT 1
          FROM student_library_mapping existing
          WHERE existing.student_user_id = ulr.user_id
            AND existing.is_active = TRUE
        ),
        NOW(),
        NOW()
      FROM user_library_roles ulr
      INNER JOIN users u ON u.id = ulr.user_id
      WHERE ulr.user_id = $1
        AND ulr.role = 'STUDENT'
      ON CONFLICT (student_user_id, library_id) DO NOTHING
      `,
      [studentUserId],
    );
  }

  async listStudentLibraries(client: PoolClient, studentUserId: string) {
    const result = await client.query<StudentLibraryRow>(
      `
      SELECT
        slm.library_id::text,
        l.name AS library_name,
        l.city,
        s.seat_number,
        slm.login_id,
        slm.is_active,
        slm.joined_at::text,
        slm.left_at::text,
        CASE WHEN slm.left_at IS NULL THEN 'ACTIVE' ELSE 'LEFT' END::text AS status
      FROM student_library_mapping slm
      INNER JOIN libraries l ON l.id = slm.library_id
      LEFT JOIN student_assignments sa
        ON sa.library_id = slm.library_id
       AND sa.student_user_id = slm.student_user_id
       AND sa.status = 'ACTIVE'
      LEFT JOIN seats s ON s.id = sa.seat_id
      WHERE slm.student_user_id = $1
      ORDER BY (slm.left_at IS NULL) DESC, slm.is_active DESC, COALESCE(slm.left_at, slm.joined_at) DESC
      `,
      [studentUserId],
    );

    return result.rows;
  }

  async setActiveStudentLibrary(client: PoolClient, studentUserId: string, libraryId: string) {
    await client.query(
      `
      UPDATE student_library_mapping
      SET is_active = CASE WHEN library_id = $2 THEN TRUE ELSE FALSE END,
          updated_at = NOW()
      WHERE student_user_id = $1
      `,
      [studentUserId, libraryId],
    );
  }

  async createSubject(client: PoolClient, input: {
    studentUserId: string;
    title: string;
    colorHex?: string | null;
    className?: string | null;
  }) {
    const result = await client.query<{ id: string }>(
      `
      INSERT INTO subjects (student_user_id, title, color_hex, class_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id
      `,
      [input.studentUserId, input.title, input.colorHex ?? null, input.className ?? null],
    );
    return result.rows[0];
  }

  async findSubjectByStudentTitleClass(client: PoolClient, input: {
    studentUserId: string;
    title: string;
    className?: string | null;
  }) {
    const result = await client.query<{ id: string }>(
      `
      SELECT id::text
      FROM subjects
      WHERE student_user_id = $1
        AND lower(title) = lower($2)
        AND COALESCE(class_name, '') = COALESCE($3, '')
      ORDER BY created_at ASC
      LIMIT 1
      `,
      [input.studentUserId, input.title, input.className ?? null],
    );
    return result.rows[0] ?? null;
  }

  async createTopic(client: PoolClient, input: {
    studentUserId: string;
    subjectId: string;
    title: string;
    estimatedMinutes: number;
    topicOrder: number;
  }) {
    const result = await client.query<{ id: string }>(
      `
      INSERT INTO topics (student_user_id, subject_id, title, estimated_minutes, topic_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [input.studentUserId, input.subjectId, input.title, input.estimatedMinutes, input.topicOrder],
    );
    return result.rows[0];
  }

  async createTopicIfMissing(client: PoolClient, input: {
    studentUserId: string;
    subjectId: string;
    title: string;
    estimatedMinutes: number;
    topicOrder: number;
  }) {
    const existing = await client.query<{ id: string }>(
      `
      SELECT id::text
      FROM topics
      WHERE student_user_id = $1
        AND subject_id = $2
        AND lower(title) = lower($3)
      LIMIT 1
      `,
      [input.studentUserId, input.subjectId, input.title],
    );
    if (existing.rows[0]) return { ...existing.rows[0], created: false };
    const topic = await this.createTopic(client, input);
    return { ...topic, created: true };
  }

  async addBookForStudent(client: PoolClient, input: { studentUserId: string; bookId: string }) {
    const studentBookResult = await client.query<{ id: string }>(
      `
      INSERT INTO student_books (student_user_id, book_id, is_active, last_synced_at, updated_at)
      VALUES ($1, $2, TRUE, NOW(), NOW())
      ON CONFLICT (student_user_id, book_id)
      DO UPDATE SET is_active = TRUE, updated_at = NOW()
      RETURNING id::text
      `,
      [input.studentUserId, input.bookId],
    );
    const studentBookId = studentBookResult.rows[0].id;
    const bookResult = await client.query<{
      title: string;
      class_name: string | null;
      subject: string | null;
    }>(
      "SELECT title, class_name, subject FROM global_books WHERE id = $1 AND status = 'PUBLISHED' LIMIT 1",
      [input.bookId],
    );
    const book = bookResult.rows[0] ?? null;
    if (!book) return { studentBookId, topicsImported: 0 };

    let subject = await this.findSubjectByStudentTitleClass(client, {
      studentUserId: input.studentUserId,
      title: book.title,
      className: book.class_name,
    });
    if (!subject) {
      subject = await this.createSubject(client, {
        studentUserId: input.studentUserId,
        title: book.title,
        className: book.class_name,
        colorHex: "#10b981",
      });
    }

    const topicsResult = await client.query<{
      id: string;
      chapter_id: string;
      chapter_title: string;
      topic_title: string;
      topic_order: number;
      estimated_minutes: number;
    }>(
      `
      SELECT
        t.id::text,
        t.chapter_id::text,
        c.chapter_title,
        t.topic_title,
        t.topic_order,
        t.estimated_minutes
      FROM global_book_topics t
      INNER JOIN global_book_chapters c ON c.id = t.chapter_id
      WHERE t.book_id = $1
      ORDER BY c.chapter_order ASC, t.topic_order ASC, t.created_at ASC
      `,
      [input.bookId],
    );

    let topicsImported = 0;
    for (const topic of topicsResult.rows) {
      const inserted = await client.query<{ id: string }>(
        `
        INSERT INTO topics (
          student_user_id, subject_id, title, estimated_minutes, topic_order,
          student_book_id, global_book_id, global_book_chapter_id, global_book_topic_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (student_user_id, global_book_topic_id)
        WHERE global_book_topic_id IS NOT NULL
        DO NOTHING
        RETURNING id::text
        `,
        [
          input.studentUserId,
          subject.id,
          topic.topic_title,
          topic.estimated_minutes,
          topic.topic_order,
          studentBookId,
          input.bookId,
          topic.chapter_id,
          topic.id,
        ],
      );
      if (inserted.rows[0]) topicsImported += 1;
    }

    await client.query("UPDATE student_books SET last_synced_at = NOW(), updated_at = NOW() WHERE id = $1", [studentBookId]);
    return { studentBookId, topicsImported };
  }

  async listStudentBooks(studentUserId: string): Promise<StudentBookRow[]> {
    const booksResult = await this.pool.query<StudentBookRow>(
      `
      SELECT
        sb.id::text,
        sb.book_id::text,
        b.title,
        b.author,
        b.class_name,
        b.subject,
        b.language,
        sb.added_at::text,
        COUNT(DISTINCT t.id)::text AS total_topics,
        COUNT(DISTINCT t.id) FILTER (WHERE sp.status = 'COMPLETED')::text AS completed_topics,
        COUNT(DISTINCT t.id) FILTER (WHERE sp.status = 'IN_PROGRESS')::text AS in_progress_topics,
        GREATEST(COUNT(DISTINCT gbt.id) - COUNT(DISTINCT t.global_book_topic_id), 0)::text AS new_topics_available
      FROM student_books sb
      INNER JOIN global_books b ON b.id = sb.book_id
      LEFT JOIN global_book_topics gbt ON gbt.book_id = b.id
      LEFT JOIN topics t
        ON t.student_book_id = sb.id
       AND t.student_user_id = sb.student_user_id
      LEFT JOIN student_progress sp
        ON sp.topic_id = t.id
       AND sp.student_user_id = sb.student_user_id
      WHERE sb.student_user_id = $1
        AND sb.is_active = TRUE
      GROUP BY sb.id, b.id
      ORDER BY sb.pinned DESC, sb.added_at DESC
      `,
      [studentUserId],
    );
    const books = booksResult.rows;
    for (const book of books) {
      book.chapters = await this.listStudentBookChapters(studentUserId, book.id);
    }
    return books;
  }

  async getStudentBook(studentUserId: string, studentBookId: string) {
    const books = await this.listStudentBooks(studentUserId);
    return books.find((book) => book.id === studentBookId) ?? null;
  }

  async listStudentBookChapters(studentUserId: string, studentBookId: string): Promise<GlobalBookChapterRow[]> {
    const chaptersResult = await this.pool.query<{
      id: string;
      chapter_title: string;
      chapter_order: number;
    }>(
      `
      SELECT DISTINCT c.id::text, c.chapter_title, c.chapter_order
      FROM topics t
      INNER JOIN global_book_chapters c ON c.id = t.global_book_chapter_id
      WHERE t.student_user_id = $1
        AND t.student_book_id = $2
      ORDER BY c.chapter_order ASC, c.chapter_title ASC
      `,
      [studentUserId, studentBookId],
    );
    if (chaptersResult.rows.length === 0) return [];

    const topicsResult = await this.pool.query<GlobalBookTopicRow & {
      status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
      progress_percent: number;
      completed_at: string | null;
      local_topic_id: string;
    }>(
      `
      SELECT
        t.id::text AS local_topic_id,
        COALESCE(t.global_book_topic_id, t.id)::text AS id,
        t.global_book_chapter_id::text AS chapter_id,
        t.title AS topic_title,
        t.topic_order,
        t.estimated_minutes,
        COALESCE(sp.status, 'NOT_STARTED')::text AS status,
        COALESCE(sp.progress_percent, 0) AS progress_percent,
        sp.completed_at::text
      FROM topics t
      LEFT JOIN student_progress sp
        ON sp.topic_id = t.id
       AND sp.student_user_id = t.student_user_id
      WHERE t.student_user_id = $1
        AND t.student_book_id = $2
      ORDER BY t.topic_order ASC, t.created_at ASC
      `,
      [studentUserId, studentBookId],
    );

    const topicsByChapter = new Map<string, GlobalBookChapterRow["topics"]>();
    for (const topic of topicsResult.rows) {
      const current = topicsByChapter.get(topic.chapter_id) ?? [];
      current.push(topic);
      topicsByChapter.set(topic.chapter_id, current);
    }
    return chaptersResult.rows.map((chapter) => ({
      ...chapter,
      topics: topicsByChapter.get(chapter.id) ?? [],
    }));
  }

  async updateTopicProgress(client: PoolClient, input: {
    studentUserId: string;
    topicId: string;
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    progressPercent: number;
  }) {
    await client.query(
      `
      INSERT INTO student_progress (
        student_user_id, topic_id, status, progress_percent, completed_at, last_studied_at
      )
      VALUES (
        $1, $2, $3, $4,
        CASE WHEN $3 = 'COMPLETED' THEN NOW() ELSE NULL END,
        NOW()
      )
      ON CONFLICT (student_user_id, topic_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        progress_percent = EXCLUDED.progress_percent,
        completed_at = CASE
          WHEN EXCLUDED.status = 'COMPLETED' THEN NOW()
          ELSE NULL
        END,
        last_studied_at = NOW(),
        updated_at = NOW()
      `,
      [input.studentUserId, input.topicId, input.status, input.progressPercent],
    );
  }

  async listSyllabus(studentUserId: string): Promise<SyllabusSubjectRow[]> {
    const subjectsResult = await this.pool.query<{
      id: string;
      title: string;
      class_name: string | null;
      color_hex: string | null;
      total_topics: string;
      completed_topics: string;
      completion_percent: string;
    }>(
      `
      SELECT
        s.id::text,
        s.title,
        s.class_name,
        s.color_hex,
        COUNT(t.id)::text AS total_topics,
        COUNT(*) FILTER (WHERE sp.status = 'COMPLETED')::text AS completed_topics,
        CASE
          WHEN COUNT(t.id) = 0 THEN 0
          ELSE ROUND(
            (COUNT(*) FILTER (WHERE sp.status = 'COMPLETED')::numeric / COUNT(t.id)::numeric) * 100
          )
        END::text AS completion_percent
      FROM subjects s
      LEFT JOIN topics t ON t.subject_id = s.id
      LEFT JOIN student_progress sp
        ON sp.topic_id = t.id
       AND sp.student_user_id = s.student_user_id
      WHERE s.student_user_id = $1
      GROUP BY s.id, s.title, s.class_name, s.color_hex, s.created_at
      ORDER BY s.created_at DESC
      `,
      [studentUserId],
    );

    const topicsResult = await this.pool.query<SyllabusTopicRow>(
      `
      SELECT
        t.id::text,
        t.subject_id::text,
        t.title,
        t.topic_order,
        t.estimated_minutes,
        COALESCE(sp.status, 'NOT_STARTED')::text AS status,
        COALESCE(sp.progress_percent, 0) AS progress_percent,
        sp.completed_at::text
      FROM topics t
      LEFT JOIN student_progress sp
        ON sp.topic_id = t.id
       AND sp.student_user_id = t.student_user_id
      WHERE t.student_user_id = $1
      ORDER BY t.topic_order ASC, t.created_at ASC
      `,
      [studentUserId],
    );

    const topicsBySubject = new Map<string, SyllabusTopicRow[]>();
    for (const topic of topicsResult.rows) {
      const current = topicsBySubject.get(topic.subject_id) ?? [];
      current.push(topic);
      topicsBySubject.set(topic.subject_id, current);
    }

    return subjectsResult.rows.map((subject) => ({
      id: subject.id,
      title: subject.title,
      class_name: subject.class_name,
      color_hex: subject.color_hex,
      total_topics: Number(subject.total_topics),
      completed_topics: Number(subject.completed_topics),
      completion_percent: Number(subject.completion_percent),
      topics: topicsBySubject.get(subject.id) ?? [],
    }));
  }

  async listGlobalSyllabusTemplates(className?: string | null): Promise<GlobalSyllabusSubjectRow[]> {
    const subjectsResult = await this.pool.query<{
      id: string;
      class_name: string;
      subject_title: string;
      color_hex: string | null;
    }>(
      `
      SELECT id::text, class_name, subject_title, color_hex
      FROM global_syllabus_subjects
      WHERE ($1::text IS NULL OR class_name = $1)
      ORDER BY class_name ASC, subject_title ASC
      `,
      [className || null],
    );

    if (subjectsResult.rows.length === 0) return [];

    const topicsResult = await this.pool.query<{
      id: string;
      global_subject_id: string;
      topic_title: string;
      topic_order: number;
      estimated_minutes: number;
    }>(
      `
      SELECT id::text, global_subject_id::text, topic_title, topic_order, estimated_minutes
      FROM global_syllabus_topics
      WHERE global_subject_id = ANY($1::uuid[])
      ORDER BY topic_order ASC, created_at ASC
      `,
      [subjectsResult.rows.map((subject) => subject.id)],
    );

    const topicsBySubject = new Map<string, GlobalSyllabusSubjectRow["topics"]>();
    for (const topic of topicsResult.rows) {
      const current = topicsBySubject.get(topic.global_subject_id) ?? [];
      current.push({
        id: topic.id,
        topic_title: topic.topic_title,
        topic_order: topic.topic_order,
        estimated_minutes: topic.estimated_minutes,
      });
      topicsBySubject.set(topic.global_subject_id, current);
    }

    return subjectsResult.rows.map((subject) => ({
      ...subject,
      topics: topicsBySubject.get(subject.id) ?? [],
    }));
  }

  async importGlobalSyllabusRows(client: PoolClient, input: {
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
    let subjectsTouched = 0;
    let topicsTouched = 0;
    const touchedSubjects = new Set<string>();

    for (const row of input.rows) {
      const subjectResult = await client.query<{ id: string }>(
        `
        INSERT INTO global_syllabus_subjects (class_name, subject_title, color_hex, created_by_user_id, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (class_name, subject_title)
        DO UPDATE SET
          color_hex = COALESCE(EXCLUDED.color_hex, global_syllabus_subjects.color_hex),
          updated_at = NOW()
        RETURNING id
        `,
        [row.className, row.subjectTitle, row.colorHex ?? null, input.createdByUserId],
      );
      const subjectId = subjectResult.rows[0].id;
      if (!touchedSubjects.has(subjectId)) {
        touchedSubjects.add(subjectId);
        subjectsTouched += 1;
      }

      await client.query(
        `
        INSERT INTO global_syllabus_topics (global_subject_id, topic_title, topic_order, estimated_minutes, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (global_subject_id, topic_title)
        DO UPDATE SET
          topic_order = EXCLUDED.topic_order,
          estimated_minutes = EXCLUDED.estimated_minutes,
          updated_at = NOW()
        `,
        [subjectId, row.topicTitle, row.topicOrder, row.estimatedMinutes],
      );
      topicsTouched += 1;
    }

    return { subjectsTouched, topicsTouched };
  }

  async listAdminBooks(filters: { q?: string | null; className?: string | null; subject?: string | null; status?: string | null }) {
    const result = await this.pool.query<GlobalBookRow>(
      `
      SELECT
        b.id::text,
        b.title,
        b.author,
        b.class_name,
        b.subject,
        b.language,
        b.status,
        b.updated_at::text,
        COUNT(DISTINCT c.id)::text AS chapter_count,
        COUNT(DISTINCT t.id)::text AS topic_count,
        COUNT(DISTINCT sb.id)::text AS student_count
      FROM global_books b
      LEFT JOIN global_book_chapters c ON c.book_id = b.id
      LEFT JOIN global_book_topics t ON t.book_id = b.id
      LEFT JOIN student_books sb ON sb.book_id = b.id
      WHERE (
          $1::text IS NULL
          OR b.title ILIKE '%' || $1 || '%'
          OR COALESCE(b.author, '') ILIKE '%' || $1 || '%'
          OR COALESCE(b.class_name, '') ILIKE '%' || $1 || '%'
          OR COALESCE(b.subject, '') ILIKE '%' || $1 || '%'
        )
        AND ($2::text IS NULL OR b.class_name = $2)
        AND ($3::text IS NULL OR b.subject = $3)
        AND ($4::text IS NULL OR b.status = $4)
      GROUP BY b.id
      ORDER BY b.updated_at DESC, b.title ASC
      LIMIT 200
      `,
      [filters.q || null, filters.className || null, filters.subject || null, filters.status || null],
    );
    return result.rows;
  }

  async getGlobalBook(bookId: string) {
    const books = await this.pool.query<GlobalBookRow>(
      `
      SELECT
        b.id::text,
        b.title,
        b.author,
        b.class_name,
        b.subject,
        b.language,
        b.status,
        b.updated_at::text,
        COUNT(DISTINCT c.id)::text AS chapter_count,
        COUNT(DISTINCT t.id)::text AS topic_count,
        COUNT(DISTINCT sb.id)::text AS student_count
      FROM global_books b
      LEFT JOIN global_book_chapters c ON c.book_id = b.id
      LEFT JOIN global_book_topics t ON t.book_id = b.id
      LEFT JOIN student_books sb ON sb.book_id = b.id
      WHERE b.id = $1
      GROUP BY b.id
      LIMIT 1
      `,
      [bookId],
    );
    const book = books.rows[0] ?? null;
    if (!book) return null;
    return { ...book, chapters: await this.listBookChapters(bookId) };
  }

  async listBookChapters(bookId: string): Promise<GlobalBookChapterRow[]> {
    const chaptersResult = await this.pool.query<{
      id: string;
      chapter_title: string;
      chapter_order: number;
    }>(
      `
      SELECT id::text, chapter_title, chapter_order
      FROM global_book_chapters
      WHERE book_id = $1
      ORDER BY chapter_order ASC, created_at ASC
      `,
      [bookId],
    );
    if (chaptersResult.rows.length === 0) return [];

    const topicsResult = await this.pool.query<GlobalBookTopicRow>(
      `
      SELECT id::text, chapter_id::text, topic_title, topic_order, estimated_minutes
      FROM global_book_topics
      WHERE chapter_id = ANY($1::uuid[])
      ORDER BY topic_order ASC, created_at ASC
      `,
      [chaptersResult.rows.map((chapter) => chapter.id)],
    );

    const topicsByChapter = new Map<string, GlobalBookTopicRow[]>();
    for (const topic of topicsResult.rows) {
      const current = topicsByChapter.get(topic.chapter_id) ?? [];
      current.push(topic);
      topicsByChapter.set(topic.chapter_id, current);
    }

    return chaptersResult.rows.map((chapter) => ({
      ...chapter,
      topics: topicsByChapter.get(chapter.id) ?? [],
    }));
  }

  async importGlobalBookRows(client: PoolClient, input: {
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
    let booksTouched = 0;
    let chaptersTouched = 0;
    let topicsTouched = 0;
    const touchedBooks = new Set<string>();
    const touchedChapters = new Set<string>();

    for (const row of input.rows) {
      const existingBook = await client.query<{ id: string }>(
        `
        SELECT id::text
        FROM global_books
        WHERE lower(title) = lower($1)
          AND lower(COALESCE(author, '')) = lower(COALESCE(NULLIF($2, ''), ''))
        LIMIT 1
        `,
        [row.bookTitle, row.author ?? ""],
      );

      const bookResult = existingBook.rows[0]
        ? await client.query<{ id: string }>(
            `
            UPDATE global_books
            SET
              class_name = COALESCE(NULLIF($2, ''), class_name),
              subject = COALESCE(NULLIF($3, ''), subject),
              language = COALESCE(NULLIF($4, ''), language),
              updated_at = NOW()
            WHERE id = $1
            RETURNING id::text
            `,
            [existingBook.rows[0].id, row.className ?? "", row.subject ?? "", row.language ?? ""],
          )
        : await client.query<{ id: string }>(
            `
            INSERT INTO global_books (title, author, class_name, subject, language, created_by_user_id, updated_at)
            VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), $6, NOW())
            RETURNING id::text
            `,
            [row.bookTitle, row.author ?? "", row.className ?? "", row.subject ?? "", row.language ?? "", input.createdByUserId],
          );
      const bookId = bookResult.rows[0].id;
      if (!touchedBooks.has(bookId)) {
        touchedBooks.add(bookId);
        booksTouched += 1;
      }

      const chapterResult = await client.query<{ id: string }>(
        `
        INSERT INTO global_book_chapters (book_id, chapter_title, chapter_order, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (book_id, chapter_title)
        DO UPDATE SET chapter_order = EXCLUDED.chapter_order, updated_at = NOW()
        RETURNING id::text
        `,
        [bookId, row.chapterTitle, row.chapterOrder],
      );
      const chapterId = chapterResult.rows[0].id;
      if (!touchedChapters.has(chapterId)) {
        touchedChapters.add(chapterId);
        chaptersTouched += 1;
      }

      await client.query(
        `
        INSERT INTO global_book_topics (book_id, chapter_id, topic_title, topic_order, estimated_minutes, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (chapter_id, topic_title)
        DO UPDATE SET
          topic_order = EXCLUDED.topic_order,
          estimated_minutes = EXCLUDED.estimated_minutes,
          updated_at = NOW()
        `,
        [bookId, chapterId, row.topicTitle, row.topicOrder, row.estimatedMinutes],
      );
      topicsTouched += 1;
    }

    return { booksTouched, chaptersTouched, topicsTouched };
  }

  async updateGlobalBook(client: PoolClient, bookId: string, input: {
    title?: string;
    author?: string | null;
    className?: string | null;
    subject?: string | null;
    language?: string | null;
    status?: "DRAFT" | "PUBLISHED" | "UNPUBLISHED";
  }) {
    const result = await client.query<{ id: string }>(
      `
      UPDATE global_books
      SET
        title = COALESCE($2, title),
        author = COALESCE($3, author),
        class_name = COALESCE($4, class_name),
        subject = COALESCE($5, subject),
        language = COALESCE($6, language),
        status = COALESCE($7, status),
        updated_at = NOW()
      WHERE id = $1
      RETURNING id::text
      `,
      [
        bookId,
        input.title ?? null,
        input.author ?? null,
        input.className ?? null,
        input.subject ?? null,
        input.language ?? null,
        input.status ?? null,
      ],
    );
    return result.rows[0] ?? null;
  }

  async updateGlobalBookChapter(client: PoolClient, input: {
    bookId: string;
    chapterId: string;
    chapterTitle?: string;
    chapterOrder?: number;
  }) {
    const result = await client.query<{ id: string }>(
      `
      UPDATE global_book_chapters
      SET
        chapter_title = COALESCE($3, chapter_title),
        chapter_order = COALESCE($4, chapter_order),
        updated_at = NOW()
      WHERE id = $2
        AND book_id = $1
      RETURNING id::text
      `,
      [input.bookId, input.chapterId, input.chapterTitle ?? null, input.chapterOrder ?? null],
    );
    await client.query("UPDATE global_books SET updated_at = NOW() WHERE id = $1", [input.bookId]);
    return result.rows[0] ?? null;
  }

  async createOrUpdateGlobalBookChapter(client: PoolClient, input: { bookId: string; chapterTitle: string; chapterOrder: number }) {
    const result = await client.query<{ id: string }>(
      `
      INSERT INTO global_book_chapters (book_id, chapter_title, chapter_order, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (book_id, chapter_title)
      DO UPDATE SET chapter_order = EXCLUDED.chapter_order, updated_at = NOW()
      RETURNING id::text
      `,
      [input.bookId, input.chapterTitle, input.chapterOrder],
    );
    await client.query("UPDATE global_books SET updated_at = NOW() WHERE id = $1", [input.bookId]);
    return result.rows[0];
  }

  async createOrUpdateGlobalBookTopic(client: PoolClient, input: {
    bookId: string;
    chapterId: string;
    topicTitle: string;
    topicOrder: number;
    estimatedMinutes: number;
  }) {
    const result = await client.query<{ id: string }>(
      `
      INSERT INTO global_book_topics (book_id, chapter_id, topic_title, topic_order, estimated_minutes, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (chapter_id, topic_title)
      DO UPDATE SET topic_order = EXCLUDED.topic_order, estimated_minutes = EXCLUDED.estimated_minutes, updated_at = NOW()
      RETURNING id::text
      `,
      [input.bookId, input.chapterId, input.topicTitle, input.topicOrder, input.estimatedMinutes],
    );
    await client.query("UPDATE global_books SET updated_at = NOW() WHERE id = $1", [input.bookId]);
    return result.rows[0];
  }

  async updateGlobalBookTopic(client: PoolClient, input: {
    bookId: string;
    topicId: string;
    chapterId?: string;
    topicTitle?: string;
    topicOrder?: number;
    estimatedMinutes?: number;
  }) {
    const result = await client.query<{ id: string }>(
      `
      UPDATE global_book_topics
      SET
        chapter_id = COALESCE($3, chapter_id),
        topic_title = COALESCE($4, topic_title),
        topic_order = COALESCE($5, topic_order),
        estimated_minutes = COALESCE($6, estimated_minutes),
        updated_at = NOW()
      WHERE id = $2
        AND book_id = $1
      RETURNING id::text
      `,
      [
        input.bookId,
        input.topicId,
        input.chapterId ?? null,
        input.topicTitle ?? null,
        input.topicOrder ?? null,
        input.estimatedMinutes ?? null,
      ],
    );
    await client.query("UPDATE global_books SET updated_at = NOW() WHERE id = $1", [input.bookId]);
    return result.rows[0] ?? null;
  }

  async searchPublishedBooks(filters: { q?: string | null; className?: string | null; subject?: string | null }) {
    return this.listAdminBooks({ ...filters, status: "PUBLISHED" });
  }

  async getSyllabusAnalytics(studentUserId: string) {
    const result = await this.pool.query<{
      total_subjects: string;
      total_topics: string;
      completed_topics: string;
      daily_completed_topics: string;
    }>(
      `
      SELECT
        (SELECT COUNT(*)::text FROM subjects WHERE student_user_id = $1) AS total_subjects,
        (SELECT COUNT(*)::text FROM topics WHERE student_user_id = $1) AS total_topics,
        (SELECT COUNT(*)::text FROM student_progress WHERE student_user_id = $1 AND status = 'COMPLETED') AS completed_topics,
        (
          SELECT COUNT(*)::text
          FROM student_progress
          WHERE student_user_id = $1
            AND status = 'COMPLETED'
            AND completed_at::date = CURRENT_DATE
        ) AS daily_completed_topics
      `,
      [studentUserId],
    );

    return result.rows[0];
  }

  async getSyllabusHabitAnalytics(studentUserId: string) {
    const weeklyResult = await this.pool.query<{
      day_value: string;
      completed_topics: string;
    }>(
      `
      WITH days AS (
        SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day')::date AS day_value
      )
      SELECT
        days.day_value::text,
        COUNT(sp.topic_id)::text AS completed_topics
      FROM days
      LEFT JOIN student_progress sp
        ON sp.completed_at::date = days.day_value
       AND sp.student_user_id = $1
       AND sp.status = 'COMPLETED'
      GROUP BY days.day_value
      ORDER BY days.day_value ASC
      `,
      [studentUserId],
    );

    const completionDaysResult = await this.pool.query<{ day_value: string }>(
      `
      SELECT DISTINCT completed_at::date::text AS day_value
      FROM student_progress
      WHERE student_user_id = $1
        AND status = 'COMPLETED'
        AND completed_at IS NOT NULL
        AND completed_at >= CURRENT_DATE - INTERVAL '365 days'
      ORDER BY day_value DESC
      `,
      [studentUserId],
    );

    const pendingResult = await this.pool.query<{
      id: string;
      title: string;
      subject_title: string;
      class_name: string | null;
      estimated_minutes: number;
      progress_percent: number;
    }>(
      `
      SELECT
        t.id::text,
        t.title,
        s.title AS subject_title,
        s.class_name,
        t.estimated_minutes,
        COALESCE(sp.progress_percent, 0) AS progress_percent
      FROM topics t
      INNER JOIN subjects s ON s.id = t.subject_id
      LEFT JOIN student_progress sp
        ON sp.topic_id = t.id
       AND sp.student_user_id = t.student_user_id
      WHERE t.student_user_id = $1
        AND COALESCE(sp.status, 'NOT_STARTED') <> 'COMPLETED'
      ORDER BY COALESCE(sp.progress_percent, 0) DESC, s.created_at DESC, t.topic_order ASC, t.created_at ASC
      LIMIT 6
      `,
      [studentUserId],
    );

    const remainingResult = await this.pool.query<{
      remaining_topics: string;
      remaining_minutes: string;
      in_progress_topics: string;
    }>(
      `
      SELECT
        COUNT(t.id)::text AS remaining_topics,
        COALESCE(SUM(t.estimated_minutes), 0)::text AS remaining_minutes,
        COUNT(t.id) FILTER (WHERE COALESCE(sp.status, 'NOT_STARTED') = 'IN_PROGRESS')::text AS in_progress_topics
      FROM topics t
      LEFT JOIN student_progress sp
        ON sp.topic_id = t.id
       AND sp.student_user_id = t.student_user_id
      WHERE t.student_user_id = $1
        AND COALESCE(sp.status, 'NOT_STARTED') <> 'COMPLETED'
      `,
      [studentUserId],
    );

    return {
      weekly: weeklyResult.rows,
      completionDays: completionDaysResult.rows,
      nextTopics: pendingResult.rows,
      remaining: remainingResult.rows[0],
    };
  }

  async getStudentAnalytics(studentUserId: string, libraryId?: string | null) {
    const result = await this.pool.query<{
      total_focus_minutes: string;
      weekly_focus_minutes: string;
      monthly_focus_minutes: string;
      focus_sessions_count: string;
      attendance_days: string;
      missed_days: string;
      avg_entry_hour: string | null;
      most_studied_subject: string | null;
      longest_streak: string;
      deep_work_hours: string;
    }>(
      `
      WITH focus_totals AS (
        SELECT
          COALESCE(SUM(duration_minutes), 0) AS total_focus_minutes,
          COALESCE(SUM(duration_minutes) FILTER (WHERE completed_at >= NOW() - INTERVAL '7 days'), 0) AS weekly_focus_minutes,
          COALESCE(SUM(duration_minutes) FILTER (WHERE completed_at >= NOW() - INTERVAL '30 days'), 0) AS monthly_focus_minutes,
          COUNT(*) AS focus_sessions_count,
          COALESCE(SUM(duration_minutes) FILTER (WHERE duration_minutes >= 50), 0) / 60.0 AS deep_work_hours
        FROM student_focus_sessions
        WHERE student_user_id = $1
      ),
        attendance AS (
          SELECT
            COUNT(DISTINCT checked_in_at::date) AS attendance_days,
            GREATEST(0, 30 - COUNT(DISTINCT checked_in_at::date)) AS missed_days,
            ROUND(AVG(EXTRACT(HOUR FROM checked_in_at)))::text AS avg_entry_hour
        FROM checkins
        WHERE student_user_id = $1
          AND ($2::uuid IS NULL OR library_id = $2::uuid)
          AND checked_in_at >= NOW() - INTERVAL '30 days'
        ),
        subject_totals AS (
          SELECT
            COALESCE(sfsb.subject_name, subj.title, 'General focus') AS subject_name,
            SUM(sfs.duration_minutes) AS total_minutes
          FROM student_focus_sessions sfs
          LEFT JOIN student_focus_subjects sfsb ON sfsb.id = sfs.subject_id
          LEFT JOIN subjects subj ON subj.id = sfs.subject_id
          WHERE sfs.student_user_id = $1
          GROUP BY COALESCE(sfsb.subject_name, subj.title, 'General focus')
          ORDER BY total_minutes DESC NULLS LAST
          LIMIT 1
        ),
        distinct_focus_days AS (
          SELECT DISTINCT completed_at::date AS day_value
          FROM student_focus_sessions
          WHERE student_user_id = $1
        ),
        streak_groups AS (
          SELECT
            day_value,
            (day_value - (ROW_NUMBER() OVER (ORDER BY day_value))::int) AS streak_key
          FROM distinct_focus_days
        ),
        streaks AS (
          SELECT COALESCE(MAX(streak_count), 0) AS longest_streak
          FROM (
            SELECT COUNT(*) AS streak_count
            FROM streak_groups
            GROUP BY streak_key
          ) grouped
        )
      SELECT
        ft.total_focus_minutes::text,
        ft.weekly_focus_minutes::text,
        ft.monthly_focus_minutes::text,
        ft.focus_sessions_count::text,
        COALESCE(att.attendance_days, 0)::text AS attendance_days,
        COALESCE(att.missed_days, 0)::text AS missed_days,
        att.avg_entry_hour,
        (SELECT subject_name FROM subject_totals) AS most_studied_subject,
        COALESCE(st.longest_streak, 0)::text AS longest_streak,
        ROUND(COALESCE(ft.deep_work_hours, 0), 1)::text AS deep_work_hours
      FROM focus_totals ft
      CROSS JOIN attendance att
      CROSS JOIN streaks st
      `,
      [studentUserId, libraryId ?? null],
    );

    return result.rows[0];
  }

  async getFocusLeaderboard(libraryId: string, window: "7d" | "30d" = "7d") {
    const interval = window === "30d" ? "30 days" : "7 days";
    const result = await this.pool.query<{
      student_user_id: string;
      student_name: string;
      total_minutes: string;
      total_sessions: string;
    }>(
      `
      SELECT
        sfs.student_user_id::text,
        u.full_name AS student_name,
        COALESCE(SUM(sfs.duration_minutes), 0)::text AS total_minutes,
        COUNT(*)::text AS total_sessions
      FROM student_focus_sessions sfs
      INNER JOIN users u ON u.id = sfs.student_user_id
      INNER JOIN student_library_mapping slm
        ON slm.student_user_id = sfs.student_user_id
       AND slm.library_id = $1
      WHERE sfs.completed_at >= NOW() - $2::interval
      GROUP BY sfs.student_user_id, u.full_name
      ORDER BY COALESCE(SUM(sfs.duration_minutes), 0) DESC, COUNT(*) DESC, u.full_name ASC
      LIMIT 10
      `,
      [libraryId, interval],
    );
    return result.rows;
  }

  async isStudentMappedToLibrary(libraryId: string, studentUserId: string) {
    const result = await this.pool.query<{ exists_flag: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM student_library_mapping
        WHERE library_id = $1
          AND student_user_id = $2
          AND left_at IS NULL
      ) AS exists_flag
      `,
      [libraryId, studentUserId],
    );

    return result.rows[0]?.exists_flag ?? false;
  }

  async listFocusSubjectTotals(studentUserId: string) {
    const result = await this.pool.query<{
      subject_label: string;
      total_minutes: string;
      total_sessions: string;
    }>(
      `
      SELECT
        COALESCE(sfsb.subject_name, s.title, 'General focus') AS subject_label,
        COALESCE(SUM(sfs.duration_minutes), 0)::text AS total_minutes,
        COUNT(*)::text AS total_sessions
      FROM student_focus_sessions sfs
      LEFT JOIN student_focus_subjects sfsb ON sfsb.id = sfs.subject_id
      LEFT JOIN subjects s ON s.id = sfs.subject_id
      WHERE sfs.student_user_id = $1
      GROUP BY COALESCE(sfsb.subject_name, s.title, 'General focus')
      ORDER BY COALESCE(SUM(sfs.duration_minutes), 0) DESC, COUNT(*) DESC
      LIMIT 8
      `,
      [studentUserId],
    );

    return result.rows;
  }

  async listRecentFocusSessions(studentUserId: string) {
    const result = await this.pool.query<{
      topic_title: string | null;
      session_type: string;
      duration_minutes: number;
      completed_at: string;
    }>(
      `
      SELECT topic_title, session_type, duration_minutes, completed_at::text
      FROM student_focus_sessions
      WHERE student_user_id = $1
      ORDER BY completed_at DESC
      LIMIT 10
      `,
      [studentUserId],
    );

    return result.rows;
  }

  async listStudentBadges(studentUserId: string) {
    const result = await this.pool.query<StudentBadgeRow>(
      `
      SELECT badge_code, badge_label, awarded_at::text, metadata
      FROM student_badges
      WHERE student_user_id = $1
      ORDER BY awarded_at DESC
      `,
      [studentUserId],
    );

    return result.rows;
  }

  async awardStudentBadge(client: PoolClient, input: {
    studentUserId: string;
    badgeCode: string;
    badgeLabel: string;
    metadata?: Record<string, unknown>;
  }) {
    await client.query(
      `
      INSERT INTO student_badges (student_user_id, badge_code, badge_label, metadata)
      VALUES ($1, $2, $3, $4::jsonb)
      ON CONFLICT (student_user_id, badge_code) DO NOTHING
      `,
      [input.studentUserId, input.badgeCode, input.badgeLabel, JSON.stringify(input.metadata ?? {})],
    );
  }

  async listStudentInterventionNotes(libraryId: string, studentUserId: string) {
    const result = await this.pool.query<StudentInterventionNoteRow>(
      `
      SELECT
        sin.id::text,
        sin.note_text,
        sin.note_type,
        sin.note_status,
        sin.follow_up_at::text,
        u.full_name AS actor_name,
        sin.created_at::text
      FROM student_intervention_notes sin
      INNER JOIN users u ON u.id = sin.actor_user_id
      WHERE sin.library_id = $1
        AND sin.student_user_id = $2
      ORDER BY sin.created_at DESC
      LIMIT 20
      `,
      [libraryId, studentUserId],
    );

    return result.rows;
  }

  async createStudentInterventionNote(client: PoolClient, input: {
    libraryId: string;
    studentUserId: string;
    actorUserId: string;
    noteText: string;
    noteType: string;
    followUpAt?: string | null;
  }) {
    const result = await client.query<{ id: string }>(
      `
      INSERT INTO student_intervention_notes (library_id, student_user_id, actor_user_id, note_text, note_type, follow_up_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id::text
      `,
      [input.libraryId, input.studentUserId, input.actorUserId, input.noteText, input.noteType, input.followUpAt ?? null],
    );

    return result.rows[0];
  }

  async updateStudentInterventionStatus(client: PoolClient, input: {
    libraryId: string;
    noteId: string;
    noteStatus: string;
  }) {
    const result = await client.query<{ id: string }>(
      `
      UPDATE student_intervention_notes
      SET note_status = $3
      WHERE id = $1
        AND library_id = $2
      RETURNING id::text
      `,
      [input.noteId, input.libraryId, input.noteStatus],
    );

    return result.rows[0] ?? null;
  }

  async listOwnerFollowUpQueue(libraryId: string) {
    const result = await this.pool.query<StudentInterventionNoteRow>(
      `
      SELECT
        sin.id::text,
        sin.student_user_id::text,
        u.full_name AS student_name,
        sin.note_text,
        sin.note_type,
        sin.note_status,
        sin.follow_up_at::text,
        actor.full_name AS actor_name,
        sin.created_at::text
      FROM student_intervention_notes sin
      INNER JOIN users u ON u.id = sin.student_user_id
      INNER JOIN users actor ON actor.id = sin.actor_user_id
      WHERE sin.library_id = $1
        AND sin.note_status <> 'DONE'
        AND sin.follow_up_at IS NOT NULL
      ORDER BY sin.follow_up_at ASC, sin.created_at DESC
      LIMIT 12
      `,
      [libraryId],
    );

    return result.rows;
  }

  async getOwnerProductivityTrends(libraryId: string, days: number) {
    const result = await this.pool.query<ProductivityTrendPointRow>(
      `
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - (($2::int - 1) * INTERVAL '1 day'),
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS day_value
      ),
      focus AS (
        SELECT
          sfs.completed_at::date AS day_value,
          COALESCE(SUM(sfs.duration_minutes), 0)::text AS focus_minutes,
          COUNT(*)::text AS focus_sessions
        FROM student_focus_sessions sfs
        INNER JOIN student_library_mapping slm
          ON slm.student_user_id = sfs.student_user_id
         AND slm.library_id = $1
         AND slm.left_at IS NULL
        WHERE sfs.completed_at >= CURRENT_DATE - (($2::int - 1) * INTERVAL '1 day')
        GROUP BY sfs.completed_at::date
      ),
      attendance AS (
        SELECT
          c.checked_in_at::date AS day_value,
          COUNT(DISTINCT c.student_user_id)::text AS attendance_students
        FROM checkins c
        WHERE c.library_id = $1
          AND c.checked_in_at >= CURRENT_DATE - (($2::int - 1) * INTERVAL '1 day')
        GROUP BY c.checked_in_at::date
      )
      SELECT
        ds.day_value::text,
        COALESCE(f.focus_minutes, '0') AS focus_minutes,
        COALESCE(a.attendance_students, '0') AS attendance_students,
        COALESCE(f.focus_sessions, '0') AS focus_sessions
      FROM date_series ds
      LEFT JOIN focus f ON f.day_value = ds.day_value
      LEFT JOIN attendance a ON a.day_value = ds.day_value
      ORDER BY ds.day_value ASC
      `,
      [libraryId, days],
    );

    return result.rows;
  }

  async getStudentProductivityTrends(studentUserId: string, libraryId: string | null, days: number) {
    const result = await this.pool.query<ProductivityTrendPointRow>(
      `
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - (($3::int - 1) * INTERVAL '1 day'),
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS day_value
      ),
      focus AS (
        SELECT
          sfs.completed_at::date AS day_value,
          COALESCE(SUM(sfs.duration_minutes), 0)::text AS focus_minutes,
          COUNT(*)::text AS focus_sessions
        FROM student_focus_sessions sfs
        LEFT JOIN checkins c
          ON c.student_user_id = sfs.student_user_id
         AND c.checked_in_at::date = sfs.completed_at::date
        WHERE sfs.student_user_id = $1
          AND sfs.completed_at >= CURRENT_DATE - (($3::int - 1) * INTERVAL '1 day')
          AND ($2::uuid IS NULL OR c.library_id = $2::uuid)
        GROUP BY sfs.completed_at::date
      ),
      attendance AS (
        SELECT
          c.checked_in_at::date AS day_value,
          COUNT(*)::text AS attendance_students
        FROM checkins c
        WHERE c.student_user_id = $1
          AND ($2::uuid IS NULL OR c.library_id = $2::uuid)
          AND c.checked_in_at >= CURRENT_DATE - (($3::int - 1) * INTERVAL '1 day')
        GROUP BY c.checked_in_at::date
      )
      SELECT
        ds.day_value::text,
        COALESCE(f.focus_minutes, '0') AS focus_minutes,
        COALESCE(a.attendance_students, '0') AS attendance_students,
        COALESCE(f.focus_sessions, '0') AS focus_sessions
      FROM date_series ds
      LEFT JOIN focus f ON f.day_value = ds.day_value
      LEFT JOIN attendance a ON a.day_value = ds.day_value
      ORDER BY ds.day_value ASC
      `,
      [studentUserId, libraryId, days],
    );

    return result.rows;
  }

  async listOverdueFollowUpReminderCandidates() {
    const result = await this.pool.query<OverdueFollowUpReminderCandidateRow>(
      `
      SELECT
        sin.id::text AS note_id,
        sin.library_id::text,
        sin.student_user_id::text,
        student.full_name AS student_name,
        sin.note_text,
        sin.note_type,
        sin.note_status,
        sin.follow_up_at::text,
        actor.full_name AS actor_name
      FROM student_intervention_notes sin
      INNER JOIN users student ON student.id = sin.student_user_id
      INNER JOIN users actor ON actor.id = sin.actor_user_id
      WHERE sin.note_status IN ('OPEN', 'ESCALATED')
        AND sin.follow_up_at IS NOT NULL
        AND sin.follow_up_at <= NOW()
        AND NOT EXISTS (
          SELECT 1
          FROM student_intervention_reminders sir
          WHERE sir.intervention_note_id = sin.id
            AND sir.reminder_type = 'OVERDUE'
            AND sir.reminder_date = CURRENT_DATE
        )
      ORDER BY sin.follow_up_at ASC, sin.created_at ASC
      LIMIT 100
      `,
    );

    return result.rows;
  }

  async getTopicForStudent(studentUserId: string, topicId: string) {
    const result = await this.pool.query<{
      topic_id: string;
      topic_title: string;
      subject_id: string;
      subject_title: string;
    }>(
      `
      SELECT
        t.id::text AS topic_id,
        t.title AS topic_title,
        s.id::text AS subject_id,
        s.title AS subject_title
      FROM topics t
      INNER JOIN subjects s ON s.id = t.subject_id
      WHERE t.id = $1
        AND t.student_user_id = $2
      LIMIT 1
      `,
      [topicId, studentUserId],
    );

    return result.rows[0] ?? null;
  }

  async countCompletedTopicsBySubject(studentUserId: string, subjectId: string) {
    const result = await this.pool.query<{ completed_topics: string; total_topics: string }>(
      `
      SELECT
        COUNT(*) FILTER (WHERE sp.status = 'COMPLETED')::text AS completed_topics,
        COUNT(t.id)::text AS total_topics
      FROM topics t
      LEFT JOIN student_progress sp
        ON sp.topic_id = t.id
       AND sp.student_user_id = $1
      WHERE t.subject_id = $2
        AND t.student_user_id = $1
      `,
      [studentUserId, subjectId],
    );

    return result.rows[0] ?? { completed_topics: "0", total_topics: "0" };
  }

  async createRevisionSchedule(client: PoolClient, input: {
    studentUserId: string;
    libraryId?: string | null;
    subjectId?: string | null;
    topicId: string;
    sourceType: string;
    revisionStage: number;
    scheduledFor: string;
    priorityScore: number;
    metadata?: Record<string, unknown>;
  }) {
    await client.query(
      `
      INSERT INTO revision_schedules (
        student_user_id, library_id, subject_id, topic_id, source_type,
        revision_stage, scheduled_for, status, priority_score, metadata, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9::jsonb, NOW())
      ON CONFLICT (student_user_id, topic_id, revision_stage, source_type)
      DO UPDATE SET
        scheduled_for = EXCLUDED.scheduled_for,
        priority_score = EXCLUDED.priority_score,
        status = CASE
          WHEN revision_schedules.status = 'COMPLETED' THEN revision_schedules.status
          ELSE 'PENDING'
        END,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      `,
      [
        input.studentUserId,
        input.libraryId ?? null,
        input.subjectId ?? null,
        input.topicId,
        input.sourceType,
        input.revisionStage,
        input.scheduledFor,
        input.priorityScore,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }

  async listRevisionSchedules(studentUserId: string, libraryId?: string | null) {
    const result = await this.pool.query<RevisionScheduleRow>(
      `
      SELECT
        rs.id::text,
        rs.topic_id::text,
        rs.subject_id::text,
        s.title AS subject_title,
        t.title AS topic_title,
        rs.source_type,
        rs.revision_stage,
        rs.scheduled_for::text,
        rs.status,
        rs.priority_score,
        rs.completed_at::text
      FROM revision_schedules rs
      INNER JOIN topics t ON t.id = rs.topic_id
      LEFT JOIN subjects s ON s.id = rs.subject_id
      WHERE rs.student_user_id = $1
        AND ($2::uuid IS NULL OR rs.library_id = $2::uuid OR rs.library_id IS NULL)
      ORDER BY rs.scheduled_for ASC, rs.priority_score DESC
      `,
      [studentUserId, libraryId ?? null],
    );

    return result.rows;
  }

  async getRevisionAnalytics(studentUserId: string, libraryId?: string | null) {
    const result = await this.pool.query<RevisionAnalyticsRow>(
      `
      WITH base AS (
        SELECT *
        FROM revision_schedules
        WHERE student_user_id = $1
          AND ($2::uuid IS NULL OR library_id = $2::uuid OR library_id IS NULL)
      ),
      weak_topics AS (
        SELECT COUNT(DISTINCT topic_id)::text AS weak_topics
        FROM revision_logs
        WHERE student_user_id = $1
          AND confidence_score <= 2
      ),
      consistency AS (
        SELECT COUNT(DISTINCT revised_at::date)::text AS revision_consistency_days
        FROM revision_logs
        WHERE student_user_id = $1
          AND revised_at >= NOW() - INTERVAL '30 days'
      )
      SELECT
        COUNT(*) FILTER (WHERE status = 'PENDING' AND scheduled_for >= NOW())::text AS pending_count,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::text AS completed_count,
        COUNT(*) FILTER (WHERE status <> 'COMPLETED' AND scheduled_for < NOW())::text AS overdue_count,
        CASE WHEN COUNT(*) = 0 THEN '0'
          ELSE ROUND((COUNT(*) FILTER (WHERE status = 'COMPLETED')::numeric / COUNT(*)::numeric) * 100)::text
        END AS revision_completion_percent,
        (SELECT revision_consistency_days FROM consistency),
        (SELECT weak_topics FROM weak_topics)
      FROM base
      `,
      [studentUserId, libraryId ?? null],
    );

    return result.rows[0];
  }

  async completeRevisionSchedule(client: PoolClient, input: {
    studentUserId: string;
    revisionId: string;
    minutesSpent: number;
    confidenceScore: number;
    notes?: string | null;
  }) {
    const revisionResult = await client.query<{
      id: string;
      topic_id: string;
      subject_id: string | null;
      scheduled_for: string;
      revision_stage: number;
    }>(
      `
      UPDATE revision_schedules
      SET status = 'COMPLETED',
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
        AND student_user_id = $2
      RETURNING id::text, topic_id::text, subject_id::text, scheduled_for::text, revision_stage
      `,
      [input.revisionId, input.studentUserId],
    );

    const revision = revisionResult.rows[0] ?? null;
    if (!revision) {
      return null;
    }

    await client.query(
      `
      INSERT INTO revision_logs (
        revision_schedule_id, student_user_id, topic_id, minutes_spent, confidence_score, result_status, revised_at, notes
      )
      VALUES ($1, $2, $3, $4, $5, 'DONE', NOW(), $6)
      `,
      [input.revisionId, input.studentUserId, revision.topic_id, input.minutesSpent, input.confidenceScore, input.notes ?? null],
    );

    await client.query(
      `
      UPDATE revision_schedules
      SET priority_score = GREATEST(
        15,
        CASE
          WHEN $2 <= 2 THEN priority_score + 25
          WHEN $2 = 3 THEN priority_score + 10
          ELSE priority_score - 10
        END
      ),
      updated_at = NOW()
      WHERE topic_id = $1
        AND student_user_id = $3
        AND status <> 'COMPLETED'
      `,
      [revision.topic_id, input.confidenceScore, input.studentUserId],
    );

    return revision;
  }

  async getFeedVisibilitySettings(studentUserId: string) {
    const result = await this.pool.query<{
      default_visibility: string;
      allow_subject_completion_posts: boolean;
      allow_focus_posts: boolean;
      allow_streak_posts: boolean;
    }>(
      `
      SELECT
        default_visibility,
        allow_subject_completion_posts,
        allow_focus_posts,
        allow_streak_posts
      FROM feed_visibility_settings
      WHERE student_user_id = $1
      LIMIT 1
      `,
      [studentUserId],
    );

    return result.rows[0] ?? {
      default_visibility: "LIBRARY_MEMBERS",
      allow_subject_completion_posts: true,
      allow_focus_posts: true,
      allow_streak_posts: true,
    };
  }

  async upsertFeedVisibilitySettings(client: PoolClient, input: {
    studentUserId: string;
    defaultVisibility: string;
    allowSubjectCompletionPosts: boolean;
    allowFocusPosts: boolean;
    allowStreakPosts: boolean;
  }) {
    await client.query(
      `
      INSERT INTO feed_visibility_settings (
        student_user_id, default_visibility, allow_subject_completion_posts, allow_focus_posts, allow_streak_posts, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (student_user_id)
      DO UPDATE SET
        default_visibility = EXCLUDED.default_visibility,
        allow_subject_completion_posts = EXCLUDED.allow_subject_completion_posts,
        allow_focus_posts = EXCLUDED.allow_focus_posts,
        allow_streak_posts = EXCLUDED.allow_streak_posts,
        updated_at = NOW()
      `,
      [input.studentUserId, input.defaultVisibility, input.allowSubjectCompletionPosts, input.allowFocusPosts, input.allowStreakPosts],
    );
  }

  async createFeedPost(client: PoolClient, input: {
    studentUserId: string;
    libraryId?: string | null;
    eventType: string;
    visibility: string;
    actorName: string;
    title: string;
    body: string;
    metrics?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }) {
    const result = await client.query<{ id: string }>(
      `
      INSERT INTO student_feed_posts (
        student_user_id, library_id, event_type, visibility, actor_name, title, body, metrics, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb)
      RETURNING id::text
      `,
      [
        input.studentUserId,
        input.libraryId ?? null,
        input.eventType,
        input.visibility,
        input.actorName,
        input.title,
        input.body,
        JSON.stringify(input.metrics ?? {}),
        JSON.stringify(input.metadata ?? {}),
      ],
    );

    return result.rows[0];
  }

  async listStudentFeed(studentUserId: string, libraryId?: string | null) {
    const result = await this.pool.query<FeedPostRow>(
      `
      SELECT
        sfp.id::text,
        sfp.student_user_id::text,
        sfp.library_id::text,
        sfp.event_type,
        sfp.visibility,
        sfp.actor_name,
        sfp.title,
        sfp.body,
        sfp.metrics,
        sfp.metadata,
        sfp.created_at::text,
        COUNT(fl.id)::text AS like_count
      FROM student_feed_posts sfp
      LEFT JOIN feed_likes fl ON fl.feed_post_id = sfp.id
      WHERE sfp.visibility <> 'PRIVATE'
        AND (
          sfp.visibility = 'PUBLIC'
          OR sfp.student_user_id = $1
          OR ($2::uuid IS NOT NULL AND sfp.library_id = $2::uuid)
        )
      GROUP BY sfp.id
      ORDER BY sfp.created_at DESC
      LIMIT 40
      `,
      [studentUserId, libraryId ?? null],
    );

    return result.rows;
  }

  // ─── Feed Likes ─────────────────────────────────────────────────────────────

  async toggleFeedLike(postId: string, studentUserId: string): Promise<{ liked: boolean; likesCount: number }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const existing = await client.query<{ id: string }>(
        `SELECT id FROM feed_likes WHERE feed_post_id = $1 AND student_user_id = $2 LIMIT 1`,
        [postId, studentUserId],
      );

      let liked: boolean;
      if (existing.rows.length > 0) {
        await client.query(
          `DELETE FROM feed_likes WHERE feed_post_id = $1 AND student_user_id = $2`,
          [postId, studentUserId],
        );
        liked = false;
      } else {
        await client.query(
          `INSERT INTO feed_likes (feed_post_id, student_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [postId, studentUserId],
        );
        liked = true;
      }

      const countResult = await client.query<{ cnt: string }>(
        `SELECT COUNT(*)::text AS cnt FROM feed_likes WHERE feed_post_id = $1`,
        [postId],
      );

      await client.query("COMMIT");
      return { liked, likesCount: parseInt(countResult.rows[0]?.cnt ?? "0", 10) };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // ─── Study Planner ───────────────────────────────────────────────────────────

  async listPlannerWeek(studentUserId: string, weekStart: string) {
    const result = await this.pool.query<{
      id: string;
      plan_date: string;
      subject: string | null;
      target_minutes: number;
      actual_minutes: number;
      notes: string | null;
      completed: boolean;
    }>(
      `
      SELECT
        id::text,
        plan_date::text,
        subject,
        target_minutes,
        actual_minutes,
        notes,
        completed
      FROM study_plan_entries
      WHERE student_user_id = $1
        AND plan_date >= $2::date
        AND plan_date < ($2::date + INTERVAL '7 days')
      ORDER BY plan_date ASC, created_at ASC
      `,
      [studentUserId, weekStart],
    );
    return result.rows;
  }

  async listPlannerMonth(studentUserId: string, monthStart: string) {
    const result = await this.pool.query<{
      plan_date: string;
      total_entries: string;
      completed_entries: string;
      total_target: string;
      total_actual: string;
    }>(
      `
      SELECT
        plan_date::text,
        COUNT(*)::text AS total_entries,
        SUM(CASE WHEN completed THEN 1 ELSE 0 END)::text AS completed_entries,
        COALESCE(SUM(target_minutes), 0)::text AS total_target,
        COALESCE(SUM(actual_minutes), 0)::text AS total_actual
      FROM study_plan_entries
      WHERE student_user_id = $1
        AND plan_date >= $2::date
        AND plan_date < ($2::date + INTERVAL '1 month')
      GROUP BY plan_date
      ORDER BY plan_date ASC
      `,
      [studentUserId, monthStart],
    );
    return result.rows;
  }

  async createPlannerEntry(input: {
    studentUserId: string;
    planDate: string;
    subject?: string | null;
    targetMinutes: number;
    notes?: string | null;
  }) {
    const result = await this.pool.query<{ id: string }>(
      `
      INSERT INTO study_plan_entries (student_user_id, plan_date, subject, target_minutes, notes)
      VALUES ($1, $2::date, $3, $4, $5)
      RETURNING id::text
      `,
      [input.studentUserId, input.planDate, input.subject ?? null, input.targetMinutes, input.notes ?? null],
    );
    return result.rows[0];
  }

  async updatePlannerEntry(input: {
    entryId: string;
    studentUserId: string;
    actualMinutes?: number;
    completed?: boolean;
    notes?: string | null;
    subject?: string | null;
    targetMinutes?: number;
  }) {
    const result = await this.pool.query<{ id: string }>(
      `
      UPDATE study_plan_entries
      SET
        actual_minutes = COALESCE($3, actual_minutes),
        completed = COALESCE($4, completed),
        notes = COALESCE($5, notes),
        subject = COALESCE($6, subject),
        target_minutes = COALESCE($7, target_minutes),
        updated_at = NOW()
      WHERE id = $1 AND student_user_id = $2
      RETURNING id::text
      `,
      [
        input.entryId,
        input.studentUserId,
        input.actualMinutes ?? null,
        input.completed ?? null,
        input.notes ?? null,
        input.subject ?? null,
        input.targetMinutes ?? null,
      ],
    );
    return result.rows[0] ?? null;
  }

  async deletePlannerEntry(entryId: string, studentUserId: string) {
    const result = await this.pool.query<{ id: string }>(
      `DELETE FROM study_plan_entries WHERE id = $1 AND student_user_id = $2 RETURNING id::text`,
      [entryId, studentUserId],
    );
    return result.rows[0] ?? null;
  }

  async listOwnerRecipientIds(libraryId: string) {
    const result = await this.pool.query<{ user_id: string }>(
      `
      SELECT DISTINCT user_id::text
      FROM user_library_roles
      WHERE library_id = $1
        AND role = 'LIBRARY_OWNER'
      `,
      [libraryId],
    );

    return result.rows.map((row) => row.user_id);
  }

  async insertOwnerReminderNotifications(client: PoolClient, input: {
    libraryId: string;
    recipientIds: string[];
    title: string;
    message: string;
  }) {
    for (const recipientId of input.recipientIds) {
      await client.query(
        `
        INSERT INTO notifications (
          library_id, sender_user_id, recipient_user_id, type, title, message, delivered_at
        )
        VALUES ($1, NULL, $2, 'GENERAL', $3, $4, NOW())
        `,
        [input.libraryId, recipientId, input.title, input.message],
      );
    }
  }

  async insertInterventionReminderLogs(client: PoolClient, input: {
    noteIds: string[];
    reminderType: string;
    metadata?: Record<string, unknown>;
  }) {
    for (const noteId of input.noteIds) {
      await client.query(
        `
        INSERT INTO student_intervention_reminders (
          intervention_note_id, reminder_type, reminder_date, metadata
        )
        VALUES ($1, $2, CURRENT_DATE, $3::jsonb)
        ON CONFLICT (intervention_note_id, reminder_type, reminder_date) DO NOTHING
        `,
        [noteId, input.reminderType, JSON.stringify(input.metadata ?? {})],
      );
    }
  }
}
