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
  color_hex: string | null;
  total_topics: number;
  completed_topics: number;
  completion_percent: number;
  topics: SyllabusTopicRow[];
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
  }) {
    const result = await client.query<{ id: string }>(
      `
      INSERT INTO subjects (student_user_id, title, color_hex)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [input.studentUserId, input.title, input.colorHex ?? null],
    );
    return result.rows[0];
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
      color_hex: string | null;
      total_topics: string;
      completed_topics: string;
      completion_percent: string;
    }>(
      `
      SELECT
        s.id::text,
        s.title,
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
      GROUP BY s.id, s.title, s.color_hex, s.created_at
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
      color_hex: subject.color_hex,
      total_topics: Number(subject.total_topics),
      completed_topics: Number(subject.completed_topics),
      completion_percent: Number(subject.completion_percent),
      topics: topicsBySubject.get(subject.id) ?? [],
    }));
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
        SELECT s.subject_name, SUM(s.duration_minutes) AS total_minutes
        FROM student_focus_sessions s
        WHERE s.student_user_id = $1
        GROUP BY s.subject_name
        ORDER BY total_minutes DESC NULLS LAST
        LIMIT 1
      ),
      streaks AS (
        SELECT COALESCE(MAX(streak_count), 0) AS longest_streak
        FROM (
          SELECT COUNT(*) AS streak_count
          FROM (
            SELECT DISTINCT completed_at::date AS day_value
            FROM student_focus_sessions
            WHERE student_user_id = $1
          ) d
          GROUP BY (day_value - (ROW_NUMBER() OVER (ORDER BY day_value))::int)
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
