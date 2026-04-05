import type { Pool, PoolClient } from "pg";

export type OwnerStudentRow = {
  assignment_id: string;
  student_user_id: string;
  student_code: string | null;
  student_name: string;
  father_name: string | null;
  student_email: string | null;
  student_phone: string | null;
  seat_number: string | null;
  plan_name: string;
  plan_price: string;
  duration_months: number;
  next_due_date: string | null;
  starts_at: string;
  ends_at: string;
  payment_status: string;
  due_amount: string;
  status: string;
};

export type OwnerSeatRow = {
  id: string;
  floor_name: string | null;
  floor_id?: string | null;
  section_name?: string | null;
  seat_number: string;
  row_no: number;
  col_no: number;
  pos_x: number;
  pos_y: number;
  status: string;
  reserved_until?: string | null;
  assignment_id: string | null;
  student_name: string | null;
  student_user_id: string | null;
  plan_name?: string | null;
  payment_status?: string | null;
  ends_at?: string | null;
  last_check_in_at?: string | null;
};

export type OwnerPaymentRow = {
  id: string;
  student_user_id: string;
  student_name: string;
  amount: string;
  method: string;
  status: string;
  reference_no: string | null;
  paid_at: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
};

export type OwnerNotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  delivered_at: string | null;
  created_at: string;
  recipient_user_id: string | null;
  recipient_name: string | null;
};

export type OwnerFloorRow = {
  id: string;
  name: string;
  floor_number: number;
  layout_columns: number;
  layout_rows: number;
  layout_meta?: {
    aisleCells?: string[];
    sectionColors?: Record<string, string>;
  } | null;
};

export type OwnerCheckinRow = {
  id: string;
  student_name: string;
  seat_number: string | null;
  checked_in_at: string;
  checked_out_at: string | null;
  duration_minutes: number | null;
  status: "INSIDE" | "COMPLETED";
};

export type OwnerExpenseRow = {
  id: string;
  category: string;
  title: string;
  amount: string;
  spent_on: string;
  notes: string | null;
  created_at: string;
};

export type DueRecoveryTargetRow = {
  student_user_id: string;
  student_name: string;
  student_phone: string | null;
  seat_number: string | null;
  due_amount: string;
  next_due_date: string | null;
};

export type StudentFocusGoalRow = {
  daily_target_minutes: number;
  weekly_target_hours: number;
};

export type StudentFocusSubjectRow = {
  id: string;
  subject_name: string;
  topic_name: string | null;
  target_minutes: number;
  is_active: boolean;
  created_at: string;
};

export type StudentFocusSessionRow = {
  id: string;
  subject_id: string | null;
  topic_title: string | null;
  duration_minutes: number;
  session_type: string;
  completed_at: string;
};

export type LibraryAdminRow = {
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_head_admin: boolean;
  permissions?: string[];
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  actor_name: string | null;
  action: string;
  entity_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type JoinRequestRow = {
  id: string;
  student_user_id: string;
  student_name: string;
  student_code: string | null;
  student_email: string | null;
  student_phone: string | null;
  seat_preference: string | null;
  message: string | null;
  requested_via: string;
  status: string;
  created_at: string;
  reviewed_at?: string | null;
  review_reason?: string | null;
  linked_assignment_id?: string | null;
};

export type OwnerCheckinsFilter = {
  status?: "ALL" | "INSIDE" | "COMPLETED" | "OVERSTAY";
  search?: string;
  fromDate?: string;
  toDate?: string;
};

export type PageResult<T> = {
  rows: T[];
  total: number;
  page: number;
  limit: number;
};

export class OwnerOperationsRepository {
  constructor(private readonly pool: Pool) {}

  async listStudents(libraryId: string) {
    const result = await this.pool.query<OwnerStudentRow>(
      `
      SELECT
        sa.id AS assignment_id,
        u.id AS student_user_id,
        u.student_code,
        u.full_name AS student_name,
        sa.father_name,
        u.email AS student_email,
        u.phone AS student_phone,
        s.seat_number,
        sa.plan_name,
        sa.plan_price::text,
        sa.duration_months,
        sa.next_due_date::text,
        sa.starts_at::date::text,
        sa.ends_at::date::text,
        sa.payment_status::text,
        COALESCE((
          SELECT SUM(p.amount)
          FROM payments p
          WHERE p.library_id = sa.library_id
            AND p.student_user_id = sa.student_user_id
            AND p.status IN ('DUE', 'PENDING')
        ), 0)::text AS due_amount,
        sa.status::text
      FROM student_assignments sa
      INNER JOIN users u ON u.id = sa.student_user_id
      LEFT JOIN seats s ON s.id = sa.seat_id
      WHERE sa.library_id = $1
        AND sa.status IN ('ACTIVE', 'PENDING', 'EXPIRED')
      ORDER BY sa.created_at DESC
      `,
      [libraryId],
    );

    return result.rows;
  }

  async listStudentsPage(libraryId: string, page: number, limit: number): Promise<PageResult<OwnerStudentRow>> {
    const offset = (page - 1) * limit;
    const [rowsResult, countResult] = await Promise.all([
      this.pool.query<OwnerStudentRow>(
        `
        SELECT
          sa.id AS assignment_id,
          u.id AS student_user_id,
          u.student_code,
          u.full_name AS student_name,
          sa.father_name,
          u.email AS student_email,
          u.phone AS student_phone,
          s.seat_number,
          sa.plan_name,
          sa.plan_price::text,
          sa.duration_months,
          sa.next_due_date::text,
          sa.starts_at::date::text,
          sa.ends_at::date::text,
          sa.payment_status::text,
          COALESCE((
            SELECT SUM(p.amount)
            FROM payments p
            WHERE p.library_id = sa.library_id
              AND p.student_user_id = sa.student_user_id
              AND p.status IN ('DUE', 'PENDING')
          ), 0)::text AS due_amount,
          sa.status::text
        FROM student_assignments sa
        INNER JOIN users u ON u.id = sa.student_user_id
        LEFT JOIN seats s ON s.id = sa.seat_id
        WHERE sa.library_id = $1
          AND sa.status IN ('ACTIVE', 'PENDING', 'EXPIRED')
        ORDER BY sa.created_at DESC
        LIMIT $2 OFFSET $3
        `,
        [libraryId, limit, offset],
      ),
      this.pool.query<{ count: string }>(
        `
        SELECT COUNT(*)::text AS count
        FROM student_assignments sa
        WHERE sa.library_id = $1
          AND sa.status IN ('ACTIVE', 'PENDING', 'EXPIRED')
        `,
        [libraryId],
      ),
    ]);

    return {
      rows: rowsResult.rows,
      total: Number(countResult.rows[0]?.count ?? "0"),
      page,
      limit,
    };
  }

  async findStudentByEmailOrPhone(client: PoolClient, email?: string, phone?: string) {
    const result = await client.query<{ id: string; full_name: string; email: string | null; phone: string | null; student_code: string | null }>(
      `
      SELECT id, full_name, email, phone, student_code
      FROM users
      WHERE ($1::text IS NOT NULL AND email = $1)
         OR ($2::text IS NOT NULL AND phone = $2)
      LIMIT 1
      `,
      [email ?? null, phone ?? null],
    );

    return result.rows[0] ?? null;
  }

  async createStudent(client: PoolClient, input: {
    fullName: string;
    email?: string;
    phone?: string;
    studentCode: string;
    passwordHash: string;
  }) {
    const result = await client.query<{ id: string }>(
      `
      INSERT INTO users (full_name, email, phone, student_code, password_hash, global_role)
      VALUES ($1, $2, $3, $4, $5, 'STUDENT')
      RETURNING id
      `,
      [input.fullName, input.email ?? null, input.phone ?? null, input.studentCode, input.passwordHash],
    );

    return result.rows[0];
  }

  async ensureStudentRole(client: PoolClient, userId: string, libraryId: string) {
    await client.query(
      `
      INSERT INTO user_library_roles (user_id, library_id, role)
      VALUES ($1, $2, 'STUDENT')
      ON CONFLICT (user_id, library_id, role) DO NOTHING
      `,
      [userId, libraryId],
    );
  }

  async updateStudentUser(client: PoolClient, input: {
    userId: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
  }) {
    await client.query(
      `
      UPDATE users
      SET
        full_name = $2,
        email = $3,
        phone = $4,
        updated_at = NOW()
      WHERE id = $1
      `,
      [input.userId, input.fullName, input.email ?? null, input.phone ?? null],
    );
  }

  async findSeatByNumber(client: PoolClient, libraryId: string, seatNumber: string) {
    const result = await client.query<{ id: string; seat_number: string; status: string }>(
      `
      SELECT id, seat_number, status::text
      FROM seats
      WHERE library_id = $1 AND seat_number = $2
      LIMIT 1
      `,
      [libraryId, seatNumber],
    );

    return result.rows[0] ?? null;
  }

  async createAssignment(client: PoolClient, input: {
    libraryId: string;
    studentUserId: string;
    seatId: string | null;
    fatherName?: string | null;
    planName: string;
    planPrice: number;
    durationMonths: number;
    nextDueDate?: string | null;
    startsAt: string;
    endsAt: string;
    paymentStatus: "PENDING" | "PAID" | "DUE" | "FAILED" | "REFUNDED";
    assignedBy: string;
    notes?: string;
  }) {
    const result = await client.query<{ id: string }>(
      `
      INSERT INTO student_assignments (
        library_id, student_user_id, seat_id, plan_name, plan_price,
        father_name, duration_months, next_due_date, starts_at, ends_at, status, payment_status, assigned_by, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE', $11, $12, $13)
      RETURNING id
      `,
      [
        input.libraryId,
        input.studentUserId,
        input.seatId,
        input.planName,
        input.planPrice,
        input.fatherName ?? null,
        input.durationMonths,
        input.nextDueDate ?? null,
        input.startsAt,
        input.endsAt,
        input.paymentStatus,
        input.assignedBy,
        input.notes ?? null,
      ],
    );

    return result.rows[0];
  }

  async findAssignmentById(client: PoolClient, libraryId: string, assignmentId: string) {
    const result = await client.query<{
      id: string;
      library_id: string;
      student_user_id: string;
      seat_id: string | null;
      status: string;
    }>(
      `
      SELECT id, library_id, student_user_id, seat_id, status::text
      FROM student_assignments
      WHERE id = $1 AND library_id = $2
      LIMIT 1
      `,
      [assignmentId, libraryId],
    );

    return result.rows[0] ?? null;
  }

  async updateAssignment(client: PoolClient, input: {
    assignmentId: string;
    seatId: string | null;
    planName: string;
    planPrice: number;
    fatherName?: string | null;
    durationMonths: number;
    nextDueDate?: string | null;
    startsAt: string;
    endsAt: string;
    paymentStatus: "PENDING" | "PAID" | "DUE" | "FAILED" | "REFUNDED";
    notes?: string | null;
  }) {
    await client.query(
      `
      UPDATE student_assignments
      SET
        seat_id = $2,
        plan_name = $3,
        plan_price = $4,
        father_name = $5,
        duration_months = $6,
        next_due_date = $7,
        starts_at = $8,
        ends_at = $9,
        payment_status = $10,
        notes = $11,
        updated_at = NOW()
      WHERE id = $1
      `,
      [
        input.assignmentId,
        input.seatId,
        input.planName,
        input.planPrice,
        input.fatherName ?? null,
        input.durationMonths,
        input.nextDueDate ?? null,
        input.startsAt,
        input.endsAt,
        input.paymentStatus,
        input.notes ?? null,
      ],
    );
  }

  async cancelAssignment(client: PoolClient, assignmentId: string) {
    await client.query(
      `
      UPDATE student_assignments
      SET status = 'CANCELLED', seat_id = NULL, updated_at = NOW()
      WHERE id = $1
      `,
      [assignmentId],
    );
  }

  async updateSeatStatus(client: PoolClient, seatId: string, status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "DISABLED") {
    await client.query(
      `
      UPDATE seats
      SET status = $2, updated_at = NOW()
      WHERE id = $1
      `,
      [seatId, status],
    );
  }

  async listPayments(libraryId: string) {
    const result = await this.pool.query<OwnerPaymentRow>(
      `
      SELECT
        p.id,
        p.student_user_id,
        u.full_name AS student_name,
        p.amount::text,
        p.method,
        p.status::text,
        p.reference_no,
        p.paid_at::text,
        p.due_date::text,
        p.notes,
        p.created_at::text
      FROM payments p
      INNER JOIN users u ON u.id = p.student_user_id
      WHERE p.library_id = $1
      ORDER BY p.created_at DESC
      `,
      [libraryId],
    );

    return result.rows;
  }

  async listPaymentsPage(libraryId: string, page: number, limit: number): Promise<PageResult<OwnerPaymentRow>> {
    const offset = (page - 1) * limit;
    const [rowsResult, countResult] = await Promise.all([
      this.pool.query<OwnerPaymentRow>(
        `
        SELECT
          p.id,
          p.student_user_id,
          u.full_name AS student_name,
          p.amount::text,
          p.method,
          p.status::text,
          p.reference_no,
          p.paid_at::text,
          p.due_date::text,
          p.notes,
          p.created_at::text
        FROM payments p
        INNER JOIN users u ON u.id = p.student_user_id
        WHERE p.library_id = $1
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
        `,
        [libraryId, limit, offset],
      ),
      this.pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM payments WHERE library_id = $1`,
        [libraryId],
      ),
    ]);

    return { rows: rowsResult.rows, total: Number(countResult.rows[0]?.count ?? "0"), page, limit };
  }

  async findPaymentById(client: PoolClient, libraryId: string, paymentId: string) {
    const result = await client.query<{ id: string; student_user_id: string; assignment_id: string | null; status: string; amount: string }>(
      `
      SELECT id, student_user_id, assignment_id, status::text, amount::text
      FROM payments
      WHERE id = $1 AND library_id = $2
      LIMIT 1
      `,
      [paymentId, libraryId],
    );

    return result.rows[0] ?? null;
  }

  async getPaymentReceiptById(client: PoolClient, libraryId: string, paymentId: string) {
    const result = await client.query<{
      id: string;
      student_name: string;
      amount: string;
      method: string;
      status: string;
      reference_no: string | null;
      paid_at: string | null;
      due_date: string | null;
      notes: string | null;
      created_at: string;
    }>(
      `
      SELECT
        p.id::text,
        u.full_name AS student_name,
        p.amount::text,
        p.method,
        p.status::text,
        p.reference_no,
        p.paid_at::text,
        p.due_date::text,
        p.notes,
        p.created_at::text
      FROM payments p
      INNER JOIN users u ON u.id = p.student_user_id
      WHERE p.library_id = $1
        AND p.id = $2
      LIMIT 1
      `,
      [libraryId, paymentId],
    );

    return result.rows[0] ?? null;
  }

  async getStudentRejoinOptions(client: PoolClient, libraryId: string) {
    const [libraryResult, seatsResult] = await Promise.all([
      client.query<{ name: string; starting_price: string }>(
        `
        SELECT name, starting_price::text
        FROM libraries
        WHERE id = $1
        LIMIT 1
        `,
        [libraryId],
      ),
      client.query<{ seat_number: string; label: string | null }>(
        `
        SELECT seat_number, label
        FROM seats
        WHERE library_id = $1
          AND status = 'AVAILABLE'
        ORDER BY row_no ASC, col_no ASC, seat_number ASC
        LIMIT 8
        `,
        [libraryId],
      ),
    ]);

    return {
      libraryName: libraryResult.rows[0]?.name ?? null,
      suggestedPlanPrice: libraryResult.rows[0]?.starting_price ?? null,
      availableSeats: seatsResult.rows,
    };
  }

  async hasStudentLibraryHistory(client: PoolClient, studentUserId: string, libraryId: string) {
    const result = await client.query<{ exists_flag: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM student_library_mapping
        WHERE student_user_id = $1
          AND library_id = $2
      ) AS exists_flag
      `,
      [studentUserId, libraryId],
    );

    return result.rows[0]?.exists_flag ?? false;
  }

  async createPayment(client: PoolClient, input: {
    libraryId: string;
    studentUserId: string;
    assignmentId?: string | null;
    amount: number;
    status: "PENDING" | "PAID" | "DUE" | "FAILED" | "REFUNDED";
    method: string;
    dueDate?: string | null;
    paidAt?: string | null;
    referenceNo?: string | null;
    notes?: string | null;
    createdBy: string;
  }) {
    const result = await client.query<{ id: string }>(
      `
      INSERT INTO payments (
        library_id, student_user_id, assignment_id, amount, currency, status, method,
        paid_at, due_date, reference_no, notes, created_by
      )
      VALUES ($1, $2, $3, $4, 'INR', $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
      `,
      [
        input.libraryId,
        input.studentUserId,
        input.assignmentId ?? null,
        input.amount,
        input.status,
        input.method,
        input.paidAt ?? null,
        input.dueDate ?? null,
        input.referenceNo ?? null,
        input.notes ?? null,
        input.createdBy,
      ],
    );

    return result.rows[0];
  }

  async updatePayment(client: PoolClient, input: {
    paymentId: string;
    amount: number;
    status: "PENDING" | "PAID" | "DUE" | "FAILED" | "REFUNDED";
    method: string;
    dueDate?: string | null;
    paidAt?: string | null;
    referenceNo?: string | null;
    notes?: string | null;
  }) {
    await client.query(
      `
      UPDATE payments
      SET
        amount = $2,
        status = $3,
        method = $4,
        due_date = $5,
        paid_at = $6,
        reference_no = $7,
        notes = $8,
        updated_at = NOW()
      WHERE id = $1
      `,
      [
        input.paymentId,
        input.amount,
        input.status,
        input.method,
        input.dueDate ?? null,
        input.paidAt ?? null,
        input.referenceNo ?? null,
        input.notes ?? null,
      ],
    );
  }

  async updateAssignmentSeat(client: PoolClient, assignmentId: string, seatId: string | null) {
    await client.query(
      `
      UPDATE student_assignments
      SET seat_id = $2, updated_at = NOW()
      WHERE id = $1
      `,
      [assignmentId, seatId],
    );
  }

  async listStudentPayments(libraryId: string, studentUserId: string) {
    const result = await this.pool.query<OwnerPaymentRow>(
      `
      SELECT
        p.id,
        p.student_user_id,
        u.full_name AS student_name,
        p.amount::text,
        p.method,
        p.status::text,
        p.reference_no,
        p.paid_at::text,
        p.due_date::text,
        p.notes,
        p.created_at::text
      FROM payments p
      INNER JOIN users u ON u.id = p.student_user_id
      WHERE p.library_id = $1 AND p.student_user_id = $2
      ORDER BY p.created_at DESC
      `,
      [libraryId, studentUserId],
    );

    return result.rows;
  }

  async listStudentPaymentsPage(libraryId: string, studentUserId: string, page: number, limit: number): Promise<PageResult<OwnerPaymentRow>> {
    const offset = (page - 1) * limit;
    const [rowsResult, countResult] = await Promise.all([
      this.pool.query<OwnerPaymentRow>(
        `
        SELECT
          p.id,
          p.student_user_id,
          u.full_name AS student_name,
          p.amount::text,
          p.method,
          p.status::text,
          p.reference_no,
          p.paid_at::text,
          p.due_date::text,
          p.notes,
          p.created_at::text
        FROM payments p
        INNER JOIN users u ON u.id = p.student_user_id
        WHERE p.library_id = $1 AND p.student_user_id = $2
        ORDER BY p.created_at DESC
        LIMIT $3 OFFSET $4
        `,
        [libraryId, studentUserId, limit, offset],
      ),
      this.pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM payments WHERE library_id = $1 AND student_user_id = $2`,
        [libraryId, studentUserId],
      ),
    ]);

    return { rows: rowsResult.rows, total: Number(countResult.rows[0]?.count ?? "0"), page, limit };
  }

  async findStudentAssignmentForUser(client: PoolClient, libraryId: string, studentUserId: string) {
    const result = await client.query<{
      assignment_id: string;
      seat_number: string | null;
      plan_name: string;
      father_name: string | null;
      duration_months: number;
      next_due_date: string | null;
      ends_at: string;
      payment_status: string;
    }>(
      `
      SELECT
        sa.id AS assignment_id,
        s.seat_number,
        sa.plan_name,
        sa.father_name,
        sa.duration_months,
        sa.next_due_date::text,
        sa.ends_at::date::text,
        sa.payment_status::text
      FROM student_assignments sa
      LEFT JOIN seats s ON s.id = sa.seat_id
      WHERE sa.library_id = $1
        AND sa.student_user_id = $2
        AND sa.status = 'ACTIVE'
      ORDER BY sa.updated_at DESC
      LIMIT 1
      `,
      [libraryId, studentUserId],
    );

    return result.rows[0] ?? null;
  }

  async findStudentByName(client: PoolClient, libraryId: string, studentName: string) {
    const result = await client.query<{ student_user_id: string; assignment_id: string | null }>(
      `
      SELECT sa.student_user_id, sa.id AS assignment_id
      FROM student_assignments sa
      INNER JOIN users u ON u.id = sa.student_user_id
      WHERE sa.library_id = $1
        AND u.full_name = $2
      ORDER BY sa.created_at DESC
      LIMIT 1
      `,
      [libraryId, studentName],
    );

    return result.rows[0] ?? null;
  }

  async listNotifications(libraryId: string) {
    const result = await this.pool.query<OwnerNotificationRow>(
      `
      SELECT
        n.id,
        n.type::text,
        n.title,
        n.message,
        n.is_read,
        n.delivered_at::text,
        n.created_at::text,
        n.recipient_user_id,
        u.full_name AS recipient_name
      FROM notifications n
      LEFT JOIN users u ON u.id = n.recipient_user_id
      WHERE n.library_id = $1
      ORDER BY n.created_at DESC
      LIMIT 100
      `,
      [libraryId],
    );

    return result.rows;
  }

  async listNotificationsPage(libraryId: string, page: number, limit: number): Promise<PageResult<OwnerNotificationRow>> {
    const offset = (page - 1) * limit;
    const [rowsResult, countResult] = await Promise.all([
      this.pool.query<OwnerNotificationRow>(
        `
        SELECT
          n.id,
          n.type::text,
          n.title,
          n.message,
          n.is_read,
          n.delivered_at::text,
          n.created_at::text,
          n.recipient_user_id,
          u.full_name AS recipient_name
        FROM notifications n
        LEFT JOIN users u ON u.id = n.recipient_user_id
        WHERE n.library_id = $1
        ORDER BY n.created_at DESC
        LIMIT $2 OFFSET $3
        `,
        [libraryId, limit, offset],
      ),
      this.pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM notifications WHERE library_id = $1`,
        [libraryId],
      ),
    ]);

    return { rows: rowsResult.rows, total: Number(countResult.rows[0]?.count ?? "0"), page, limit };
  }

  async listStudentNotifications(libraryId: string, studentUserId: string) {
    const result = await this.pool.query<OwnerNotificationRow>(
      `
      SELECT
        n.id,
        n.type::text,
        n.title,
        n.message,
        n.is_read,
        n.delivered_at::text,
        n.created_at::text,
        n.recipient_user_id,
        u.full_name AS recipient_name
      FROM notifications n
      LEFT JOIN users u ON u.id = n.recipient_user_id
      WHERE n.library_id = $1 AND n.recipient_user_id = $2
      ORDER BY n.created_at DESC
      LIMIT 100
      `,
      [libraryId, studentUserId],
    );

    return result.rows;
  }

  async listStudentNotificationsPage(libraryId: string, studentUserId: string, page: number, limit: number): Promise<PageResult<OwnerNotificationRow>> {
    const offset = (page - 1) * limit;
    const [rowsResult, countResult] = await Promise.all([
      this.pool.query<OwnerNotificationRow>(
        `
        SELECT
          n.id,
          n.type::text,
          n.title,
          n.message,
          n.is_read,
          n.delivered_at::text,
          n.created_at::text,
          n.recipient_user_id,
          u.full_name AS recipient_name
        FROM notifications n
        LEFT JOIN users u ON u.id = n.recipient_user_id
        WHERE n.library_id = $1 AND n.recipient_user_id = $2
        ORDER BY n.created_at DESC
        LIMIT $3 OFFSET $4
        `,
        [libraryId, studentUserId, limit, offset],
      ),
      this.pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM notifications WHERE library_id = $1 AND recipient_user_id = $2`,
        [libraryId, studentUserId],
      ),
    ]);

    return { rows: rowsResult.rows, total: Number(countResult.rows[0]?.count ?? "0"), page, limit };
  }

  async listOwnerCheckins(libraryId: string, filters?: OwnerCheckinsFilter) {
    const search = filters?.search?.trim() ?? "";
    const status = filters?.status ?? "ALL";
    const fromDate = filters?.fromDate?.trim() || null;
    const toDate = filters?.toDate?.trim() || null;
    const result = await this.pool.query<OwnerCheckinRow>(
      `
      WITH enriched_checkins AS (
        SELECT
          c.id,
          u.full_name AS student_name,
          s.seat_number,
          c.checked_in_at::text,
          c.checked_out_at::text,
          CASE
            WHEN c.checked_out_at IS NULL THEN FLOOR(EXTRACT(EPOCH FROM (NOW() - c.checked_in_at)) / 60)::int
            ELSE FLOOR(EXTRACT(EPOCH FROM (c.checked_out_at - c.checked_in_at)) / 60)::int
          END AS duration_minutes,
          CASE
            WHEN c.checked_out_at IS NULL THEN 'INSIDE'
            ELSE 'COMPLETED'
          END::text AS status
        FROM checkins c
        INNER JOIN users u ON u.id = c.student_user_id
        LEFT JOIN seats s ON s.id = c.seat_id
        WHERE c.library_id = $1
          AND ($2::text = '' OR u.full_name ILIKE '%' || $2 || '%' OR COALESCE(s.seat_number, '') ILIKE '%' || $2 || '%')
          AND ($3::date IS NULL OR c.checked_in_at::date >= $3::date)
          AND ($4::date IS NULL OR c.checked_in_at::date <= $4::date)
      )
      SELECT *
      FROM enriched_checkins
      WHERE
        $5::text = 'ALL'
        OR ($5::text = 'INSIDE' AND status = 'INSIDE')
        OR ($5::text = 'COMPLETED' AND status = 'COMPLETED')
        OR ($5::text = 'OVERSTAY' AND status = 'INSIDE' AND COALESCE(duration_minutes, 0) >= 720)
      ORDER BY checked_in_at DESC
      LIMIT 300
      `,
      [libraryId, search, fromDate, toDate, status],
    );

    return result.rows.map((row) => ({
      ...row,
      status: row.status,
    }));
  }

  async listOwnerCheckinsPage(libraryId: string, filters: OwnerCheckinsFilter | undefined, page: number, limit: number): Promise<PageResult<OwnerCheckinRow>> {
    const search = filters?.search?.trim() ?? "";
    const status = filters?.status ?? "ALL";
    const fromDate = filters?.fromDate?.trim() || null;
    const toDate = filters?.toDate?.trim() || null;
    const offset = (page - 1) * limit;

    const query = `
      WITH enriched_checkins AS (
        SELECT
          c.id,
          u.full_name AS student_name,
          s.seat_number,
          c.checked_in_at::text,
          c.checked_out_at::text,
          CASE
            WHEN c.checked_out_at IS NULL THEN FLOOR(EXTRACT(EPOCH FROM (NOW() - c.checked_in_at)) / 60)::int
            ELSE FLOOR(EXTRACT(EPOCH FROM (c.checked_out_at - c.checked_in_at)) / 60)::int
          END AS duration_minutes,
          CASE WHEN c.checked_out_at IS NULL THEN 'INSIDE' ELSE 'COMPLETED' END::text AS status
        FROM checkins c
        INNER JOIN users u ON u.id = c.student_user_id
        LEFT JOIN seats s ON s.id = c.seat_id
        WHERE c.library_id = $1
          AND ($2::text = '' OR u.full_name ILIKE '%' || $2 || '%' OR COALESCE(s.seat_number, '') ILIKE '%' || $2 || '%')
          AND ($3::date IS NULL OR c.checked_in_at::date >= $3::date)
          AND ($4::date IS NULL OR c.checked_in_at::date <= $4::date)
      ),
      filtered_checkins AS (
        SELECT *
        FROM enriched_checkins
        WHERE
          $5::text = 'ALL'
          OR ($5::text = 'INSIDE' AND status = 'INSIDE')
          OR ($5::text = 'COMPLETED' AND status = 'COMPLETED')
          OR ($5::text = 'OVERSTAY' AND status = 'INSIDE' AND COALESCE(duration_minutes, 0) >= 720)
      )
    `;

    const [rowsResult, countResult] = await Promise.all([
      this.pool.query<OwnerCheckinRow>(
        `
        ${query}
        SELECT *
        FROM filtered_checkins
        ORDER BY checked_in_at DESC
        LIMIT $6 OFFSET $7
        `,
        [libraryId, search, fromDate, toDate, status, limit, offset],
      ),
      this.pool.query<{ count: string }>(
        `
        ${query}
        SELECT COUNT(*)::text AS count
        FROM filtered_checkins
        `,
        [libraryId, search, fromDate, toDate, status],
      ),
    ]);

    return {
      rows: rowsResult.rows,
      total: Number(countResult.rows[0]?.count ?? "0"),
      page,
      limit,
    };
  }

  async getOwnerCheckinSummary(libraryId: string) {
    const result = await this.pool.query<{
      currently_inside: string;
      today_checkins: string;
      overstay: string;
      latest_day: string | null;
    }>(
      `
      SELECT
        COUNT(*) FILTER (WHERE checked_out_at IS NULL)::text AS currently_inside,
        COUNT(*) FILTER (WHERE checked_in_at::date = CURRENT_DATE)::text AS today_checkins,
        COUNT(*) FILTER (
          WHERE checked_out_at IS NULL
            AND EXTRACT(EPOCH FROM (NOW() - checked_in_at)) / 60 >= 720
        )::text AS overstay,
        MAX(checked_in_at::date)::text AS latest_day
      FROM checkins
      WHERE library_id = $1
      `,
      [libraryId],
    );

    return result.rows[0] ?? {
      currently_inside: "0",
      today_checkins: "0",
      overstay: "0",
      latest_day: null,
    };
  }

  async getStudentLibrarySummary(libraryId: string, studentUserId: string) {
    const [assignment, librarySettings, notifications] = await Promise.all([
      this.pool.query<{
        assignment_id: string;
        seat_number: string | null;
        plan_name: string;
        father_name: string | null;
        duration_months: number;
        next_due_date: string | null;
        ends_at: string;
        payment_status: string;
      }>(
        `
        SELECT
          sa.id AS assignment_id,
          s.seat_number,
          sa.plan_name,
          sa.father_name,
          sa.duration_months,
          sa.next_due_date::text,
          sa.ends_at::date::text,
          sa.payment_status::text
        FROM student_assignments sa
        LEFT JOIN seats s ON s.id = sa.seat_id
        WHERE sa.library_id = $1
          AND sa.student_user_id = $2
          AND sa.status = 'ACTIVE'
        ORDER BY sa.updated_at DESC
        LIMIT 1
        `,
        [libraryId, studentUserId],
      ),
      this.pool.query<{
        library_name: string;
        wifi_name: string | null;
        wifi_password: string | null;
        notice_message: string | null;
      }>(
        `
        SELECT
          l.name AS library_name,
          ls.wifi_name,
          ls.wifi_password,
          ls.notice_message
        FROM libraries l
        LEFT JOIN library_settings ls ON ls.library_id = l.id
        WHERE l.id = $1
        LIMIT 1
        `,
        [libraryId],
      ),
      this.pool.query<{
        id: string;
        type: string;
        title: string;
        message: string;
        created_at: string;
      }>(
        `
        SELECT id, type::text, title, message, created_at::text
        FROM notifications
        WHERE library_id = $1 AND recipient_user_id = $2
        ORDER BY created_at DESC
        LIMIT 3
        `,
        [libraryId, studentUserId],
      ),
    ]);

    const [payments, checkins] = await Promise.all([
      this.listStudentPayments(libraryId, studentUserId),
      this.pool.query<{ checked_day: string; checked_in_at: string; checked_out_at: string | null }>(
        `
        SELECT
          checked_in_at::date::text AS checked_day,
          checked_in_at::text,
          checked_out_at::text
        FROM checkins
        WHERE library_id = $1 AND student_user_id = $2
        ORDER BY checked_in_at DESC
        LIMIT 60
        `,
        [libraryId, studentUserId],
      ),
    ]);

    const uniqueDays = Array.from(new Set(checkins.rows.map((row) => row.checked_day)));
    const currentMonth = new Date();
    const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
    const monthlyDays = uniqueDays.filter((day) => day.startsWith(monthKey));
    const missedDays = Math.max(0, currentMonth.getDate() - monthlyDays.length);
    const focusCalendar = uniqueDays.slice(0, 35).map((day) => {
      const dayRows = checkins.rows.filter((row) => row.checked_day === day);
      const minutes = dayRows.reduce((acc, row) => {
        if (!row.checked_out_at) {
          return acc;
        }
        const start = new Date(row.checked_in_at).getTime();
        const end = new Date(row.checked_out_at).getTime();
        return acc + Math.max(0, Math.round((end - start) / 60000));
      }, 0);

      return {
        date: day,
        sessions: dayRows.length,
        minutes,
      };
    });
    let streakDays = 0;
    for (let index = 0; index < uniqueDays.length; index += 1) {
      if (index === 0) {
        streakDays = 1;
        continue;
      }
      const previous = new Date(uniqueDays[index - 1]);
      const current = new Date(uniqueDays[index]);
      const diffDays = Math.round((previous.getTime() - current.getTime()) / 86400000);
      if (diffDays === 1) {
        streakDays += 1;
      } else {
        break;
      }
    }

    return {
      assignment: assignment.rows[0] ?? null,
      library: librarySettings.rows[0] ?? null,
      notifications: notifications.rows,
      dueTotal: payments
        .filter((payment) => payment.status === "DUE" || payment.status === "PENDING")
        .reduce((acc, payment) => acc + Number(payment.amount), 0),
      latestPaymentDate: payments[0]?.paid_at ?? payments[0]?.created_at ?? null,
      upcomingDueDate: payments.find((payment) => payment.status !== "PAID")?.due_date ?? null,
      focusProgress: {
        regularDays: uniqueDays.length,
        streakDays,
        monthlyPresence: monthlyDays.length,
        missedDays,
        attendanceScore: Math.max(0, Math.min(100, Math.round((monthlyDays.length / Math.max(1, currentMonth.getDate())) * 100))),
        currentlyInside: checkins.rows.some((row) => row.checked_out_at === null),
      },
      focusCalendar,
    };
  }

  async listDueRecoveryTargets(libraryId: string) {
    const result = await this.pool.query<DueRecoveryTargetRow>(
      `
      SELECT
        sa.student_user_id,
        u.full_name AS student_name,
        u.phone AS student_phone,
        s.seat_number,
        COALESCE((
          SELECT SUM(p.amount)
          FROM payments p
          WHERE p.library_id = sa.library_id
            AND p.student_user_id = sa.student_user_id
            AND p.status IN ('DUE', 'PENDING')
        ), 0)::text AS due_amount,
        sa.next_due_date::text
      FROM student_assignments sa
      INNER JOIN users u ON u.id = sa.student_user_id
      LEFT JOIN seats s ON s.id = sa.seat_id
      WHERE sa.library_id = $1
        AND sa.status = 'ACTIVE'
        AND sa.payment_status IN ('DUE', 'PENDING')
      ORDER BY sa.next_due_date ASC NULLS LAST, u.full_name ASC
      `,
      [libraryId],
    );

    return result.rows;
  }

  async upsertStudentFocusGoals(client: PoolClient, input: {
    studentUserId: string;
    dailyTargetMinutes: number;
    weeklyTargetHours: number;
  }) {
    const result = await client.query<StudentFocusGoalRow>(
      `
      INSERT INTO student_focus_goals (student_user_id, daily_target_minutes, weekly_target_hours, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (student_user_id)
      DO UPDATE SET
        daily_target_minutes = EXCLUDED.daily_target_minutes,
        weekly_target_hours = EXCLUDED.weekly_target_hours,
        updated_at = NOW()
      RETURNING daily_target_minutes, weekly_target_hours
      `,
      [input.studentUserId, input.dailyTargetMinutes, input.weeklyTargetHours],
    );

    return result.rows[0];
  }

  async getStudentFocusGoals(client: PoolClient, studentUserId: string) {
    const result = await client.query<StudentFocusGoalRow>(
      `
      SELECT daily_target_minutes, weekly_target_hours
      FROM student_focus_goals
      WHERE student_user_id = $1
      LIMIT 1
      `,
      [studentUserId],
    );

    return result.rows[0] ?? null;
  }

  async listStudentFocusSubjects(client: PoolClient, studentUserId: string) {
    const result = await client.query<StudentFocusSubjectRow>(
      `
      SELECT id, subject_name, topic_name, target_minutes, is_active, created_at::text
      FROM student_focus_subjects
      WHERE student_user_id = $1
      ORDER BY is_active DESC, created_at DESC
      `,
      [studentUserId],
    );

    return result.rows;
  }

  async createStudentFocusSubject(client: PoolClient, input: {
    studentUserId: string;
    subjectName: string;
    topicName?: string | null;
    targetMinutes: number;
  }) {
    const result = await client.query<StudentFocusSubjectRow>(
      `
      INSERT INTO student_focus_subjects (student_user_id, subject_name, topic_name, target_minutes)
      VALUES ($1, $2, $3, $4)
      RETURNING id, subject_name, topic_name, target_minutes, is_active, created_at::text
      `,
      [input.studentUserId, input.subjectName, input.topicName ?? null, input.targetMinutes],
    );

    return result.rows[0];
  }

  async createStudentFocusSession(client: PoolClient, input: {
    studentUserId: string;
    subjectId?: string | null;
    topicTitle?: string | null;
    durationMinutes: number;
    sessionType: "POMODORO" | "MANUAL" | "FOCUS_MODE";
  }) {
    const result = await client.query<StudentFocusSessionRow>(
      `
      INSERT INTO student_focus_sessions (student_user_id, subject_id, topic_title, duration_minutes, session_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, subject_id, topic_title, duration_minutes, session_type, completed_at::text
      `,
      [input.studentUserId, input.subjectId ?? null, input.topicTitle ?? null, input.durationMinutes, input.sessionType],
    );

    return result.rows[0];
  }

  async listStudentFocusSessions(client: PoolClient, studentUserId: string) {
    const result = await client.query<StudentFocusSessionRow>(
      `
      SELECT id, subject_id, topic_title, duration_minutes, session_type, completed_at::text
      FROM student_focus_sessions
      WHERE student_user_id = $1
      ORDER BY completed_at DESC
      LIMIT 30
      `,
      [studentUserId],
    );

    return result.rows;
  }

  async findRecipientIds(client: PoolClient, input: {
    libraryId: string;
    audience: "ALL_STUDENTS" | "DUE_STUDENTS" | "EXPIRING_STUDENTS";
  }) {
    const base = `
      SELECT DISTINCT sa.student_user_id
      FROM student_assignments sa
      WHERE sa.library_id = $1
        AND sa.status = 'ACTIVE'
    `;

    let query = base;
    if (input.audience === "DUE_STUDENTS") {
      query += ` AND sa.payment_status IN ('DUE', 'PENDING')`;
    }
    if (input.audience === "EXPIRING_STUDENTS") {
      query += ` AND sa.ends_at <= NOW() + INTERVAL '3 days'`;
    }

    const result = await client.query<{ student_user_id: string }>(query, [input.libraryId]);
    return result.rows.map((row) => row.student_user_id);
  }

  async insertNotifications(client: PoolClient, input: {
    libraryId: string;
    senderUserId: string;
    recipientIds: string[];
    type: "PAYMENT_REMINDER" | "EXPIRY_ALERT" | "GENERAL";
    title: string;
    message: string;
  }) {
    for (const recipientId of input.recipientIds) {
      await client.query(
        `
        INSERT INTO notifications (
          library_id, sender_user_id, recipient_user_id, type, title, message, delivered_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `,
        [
          input.libraryId,
          input.senderUserId,
          recipientId,
          input.type,
          input.title,
          input.message,
        ],
      );
    }
  }

  async listSeats(libraryId: string) {
    const result = await this.pool.query<OwnerSeatRow>(
      `
      SELECT
        s.id,
        s.floor_id,
        lf.name AS floor_name,
        s.label AS section_name,
        s.seat_number,
        s.row_no,
        s.col_no,
        s.pos_x,
        s.pos_y,
        s.status::text,
        s.reserved_until::text,
        sa.id AS assignment_id,
        u.full_name AS student_name,
        u.id AS student_user_id,
        sa.plan_name,
        sa.payment_status::text,
        sa.ends_at::date::text,
        (
          SELECT c.checked_in_at::text
          FROM checkins c
          WHERE c.library_id = s.library_id
            AND c.seat_id = s.id
          ORDER BY c.checked_in_at DESC
          LIMIT 1
        ) AS last_check_in_at
      FROM seats s
      LEFT JOIN library_floors lf ON lf.id = s.floor_id
      LEFT JOIN student_assignments sa
        ON sa.seat_id = s.id
       AND sa.library_id = s.library_id
       AND sa.status = 'ACTIVE'
      LEFT JOIN users u ON u.id = sa.student_user_id
      WHERE s.library_id = $1
      ORDER BY COALESCE(lf.floor_number, 0), s.pos_y, s.pos_x, s.row_no, s.col_no, s.seat_number
      `,
      [libraryId],
    );

    return result.rows;
  }

  async listFloors(libraryId: string) {
    const result = await this.pool.query<OwnerFloorRow>(
      `
      SELECT id, name, floor_number, layout_columns, layout_rows, layout_meta
      FROM library_floors
      WHERE library_id = $1
      ORDER BY floor_number, name
      `,
      [libraryId],
    );

    return result.rows;
  }

  async findFloorByNumber(client: PoolClient, libraryId: string, floorNumber: number) {
    const result = await client.query<OwnerFloorRow>(
      `
      SELECT id, name, floor_number, layout_columns, layout_rows, layout_meta
      FROM library_floors
      WHERE library_id = $1 AND floor_number = $2
      LIMIT 1
      `,
      [libraryId, floorNumber],
    );

    return result.rows[0] ?? null;
  }

  async createFloor(client: PoolClient, input: {
    libraryId: string;
    name: string;
    floorNumber: number;
    layoutColumns: number;
    layoutRows: number;
    layoutMeta?: { aisleCells?: string[]; sectionColors?: Record<string, string> } | null;
  }) {
    const result = await client.query<OwnerFloorRow>(
      `
      INSERT INTO library_floors (library_id, name, floor_number, layout_columns, layout_rows, layout_meta)
      VALUES ($1, $2, $3, $4, $5, COALESCE($6::jsonb, '{}'::jsonb))
      RETURNING id, name, floor_number, layout_columns, layout_rows, layout_meta
      `,
      [input.libraryId, input.name, input.floorNumber, input.layoutColumns, input.layoutRows, input.layoutMeta ? JSON.stringify(input.layoutMeta) : null],
    );

    return result.rows[0];
  }

  async updateFloor(client: PoolClient, input: {
    libraryId: string;
    floorId: string;
    name?: string | null;
    layoutColumns?: number | null;
    layoutRows?: number | null;
    layoutMeta?: { aisleCells?: string[]; sectionColors?: Record<string, string> } | null;
  }) {
    const result = await client.query<OwnerFloorRow>(
      `
      UPDATE library_floors
      SET
        name = COALESCE($3, name),
        layout_columns = COALESCE($4, layout_columns),
        layout_rows = COALESCE($5, layout_rows),
        layout_meta = COALESCE($6::jsonb, layout_meta)
      WHERE library_id = $1
        AND id = $2
      RETURNING id, name, floor_number, layout_columns, layout_rows, layout_meta
      `,
      [
        input.libraryId,
        input.floorId,
        input.name ?? null,
        input.layoutColumns ?? null,
        input.layoutRows ?? null,
        input.layoutMeta ? JSON.stringify(input.layoutMeta) : null,
      ],
    );

    return result.rows[0] ?? null;
  }

  async createSeat(client: PoolClient, input: {
    libraryId: string;
    floorId: string | null;
    seatNumber: string;
    sectionName: string | null;
    rowNo: number;
    colNo: number;
  }) {
    const result = await client.query<{ id: string; seat_number: string }>(
      `
      INSERT INTO seats (library_id, floor_id, seat_number, label, row_no, col_no, pos_x, pos_y, status)
      VALUES ($1, $2, $3, $4, $5, $6, $6, $5, 'AVAILABLE')
      RETURNING id, seat_number
      `,
      [input.libraryId, input.floorId, input.seatNumber, input.sectionName, input.rowNo, input.colNo],
    );

    return result.rows[0];
  }

  async updateSeat(client: PoolClient, input: {
    seatId: string;
    seatCode?: string | null;
    sectionName?: string | null;
    status?: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "DISABLED";
    reservedUntil?: string | null;
    posX?: number | null;
    posY?: number | null;
  }) {
    await client.query(
      `
      UPDATE seats
      SET
        seat_number = COALESCE($2, seat_number),
        label = COALESCE($3, label),
        status = COALESCE($4::seat_status, status),
        reserved_until = $5,
        pos_x = COALESCE($6, pos_x),
        pos_y = COALESCE($7, pos_y),
        updated_at = NOW()
      WHERE id = $1
      `,
      [
        input.seatId,
        input.seatCode ?? null,
        input.sectionName ?? null,
        input.status ?? null,
        input.reservedUntil ?? null,
        input.posX ?? null,
        input.posY ?? null,
      ],
    );
  }

  async clearAssignmentSeat(client: PoolClient, assignmentId: string) {
    await client.query(
      `
      UPDATE student_assignments
      SET seat_id = NULL, updated_at = NOW()
      WHERE id = $1
      `,
      [assignmentId],
    );
  }

  async findSeatById(client: PoolClient, libraryId: string, seatId: string) {
    const result = await client.query<{
      id: string;
      seat_number: string;
      status: string;
      label: string | null;
      reserved_until: string | null;
      pos_x: number;
      pos_y: number;
    }>(
      `
      SELECT id, seat_number, status::text, label, reserved_until::text, pos_x, pos_y
      FROM seats
      WHERE library_id = $1 AND id = $2
      LIMIT 1
      `,
      [libraryId, seatId],
    );

    return result.rows[0] ?? null;
  }

  async findActiveAssignmentBySeatId(client: PoolClient, libraryId: string, seatId: string) {
    const result = await client.query<{ id: string; student_user_id: string }>(
      `
      SELECT id, student_user_id
      FROM student_assignments
      WHERE library_id = $1 AND seat_id = $2 AND status = 'ACTIVE'
      LIMIT 1
      `,
      [libraryId, seatId],
    );

    return result.rows[0] ?? null;
  }

  async refreshLibrarySeatCounts(client: PoolClient, libraryId: string) {
    await client.query(
      `
      UPDATE libraries
      SET
        total_seats = seat_totals.total_count,
        available_seats = seat_totals.available_count,
        updated_at = NOW()
      FROM (
        SELECT
          library_id,
          COUNT(*)::int AS total_count,
          COUNT(*) FILTER (WHERE status = 'AVAILABLE')::int AS available_count
        FROM seats
        WHERE library_id = $1
        GROUP BY library_id
      ) AS seat_totals
      WHERE libraries.id = seat_totals.library_id
      `,
      [libraryId],
    );
  }

  async listAdminLibraries() {
    const result = await this.pool.query<{
      id: string;
      name: string;
      slug: string;
      city: string;
      status: string;
      total_seats: number;
      available_seats: number;
      owner_name: string;
      owner_email: string | null;
      plan_name: string | null;
      subscription_status: string | null;
      current_period_end: string | null;
    }>(
      `
      SELECT
        l.id,
        l.name,
        l.slug,
        l.city,
        l.status::text,
        l.total_seats,
        l.available_seats,
        u.full_name AS owner_name,
        u.email AS owner_email,
        s.plan_name,
        s.status::text AS subscription_status,
        s.current_period_end::date::text
      FROM libraries l
      INNER JOIN users u ON u.id = l.owner_user_id
      LEFT JOIN subscriptions s ON s.library_id = l.id
      ORDER BY l.created_at DESC
      `,
    );

    return result.rows;
  }

  async getAdminDashboard() {
    const [metrics, watchlist, recentPayments] = await Promise.all([
      this.pool.query<{
        mrr: string;
        active_libraries: string;
        overdue_renewals: string;
        failed_payments: string;
      }>(
        `
        SELECT
          COALESCE(SUM(CASE WHEN pp.status = 'PAID' AND pp.created_at >= date_trunc('month', NOW()) THEN pp.amount ELSE 0 END), 0)::text AS mrr,
          COUNT(*) FILTER (WHERE l.status = 'ACTIVE')::text AS active_libraries,
          COUNT(*) FILTER (WHERE s.status IN ('PAST_DUE', 'EXPIRED') OR (s.current_period_end::date <= CURRENT_DATE + 3))::text AS overdue_renewals,
          COALESCE((
            SELECT COUNT(*)::text
            FROM platform_payments
            WHERE status = 'FAILED' AND created_at >= date_trunc('month', NOW())
          ), '0') AS failed_payments
        FROM libraries l
        LEFT JOIN subscriptions s ON s.library_id = l.id
        LEFT JOIN platform_payments pp ON pp.library_id = l.id
        `,
      ),
      this.pool.query(
        `
        SELECT
          l.id,
          l.name,
          l.city,
          u.full_name AS owner_name,
          COALESCE(s.plan_name, 'No Plan') AS plan_name,
          COALESCE(s.status::text, 'INACTIVE') AS subscription_status
        FROM libraries l
        INNER JOIN users u ON u.id = l.owner_user_id
        LEFT JOIN subscriptions s ON s.library_id = l.id
        ORDER BY
          CASE
            WHEN s.status IN ('PAST_DUE', 'EXPIRED') THEN 0
            WHEN s.current_period_end::date <= CURRENT_DATE + 3 THEN 1
            ELSE 2
          END,
          l.updated_at DESC
        LIMIT 6
        `,
      ),
      this.pool.query(
        `
        SELECT
          pp.id,
          l.name AS library_name,
          pp.amount::text,
          pp.currency,
          pp.status::text,
          COALESCE(pp.razorpay_payment_id, pp.razorpay_order_id, '-') AS reference_no,
          pp.paid_at::text,
          pp.created_at::text
        FROM platform_payments pp
        INNER JOIN libraries l ON l.id = pp.library_id
        ORDER BY pp.created_at DESC
        LIMIT 10
        `,
      ),
    ]);

    return {
      metrics: metrics.rows[0],
      watchlist: watchlist.rows,
      recentPayments: recentPayments.rows,
    };
  }

  async listAdminPlanSummaries() {
    const result = await this.pool.query<{
      plan_code: string;
      plan_name: string;
      amount: string;
      tenants: string;
      active_tenants: string;
      past_due_tenants: string;
    }>(
      `
      SELECT
        s.plan_code,
        s.plan_name,
        MAX(s.amount)::text AS amount,
        COUNT(*)::text AS tenants,
        COUNT(*) FILTER (WHERE s.status = 'ACTIVE')::text AS active_tenants,
        COUNT(*) FILTER (WHERE s.status IN ('PAST_DUE', 'EXPIRED'))::text AS past_due_tenants
      FROM subscriptions s
      GROUP BY s.plan_code, s.plan_name
      ORDER BY MAX(s.amount) DESC, s.plan_name
      `,
    );

    return result.rows;
  }

  async listAdminPayments() {
    const result = await this.pool.query<{
      id: string;
      library_name: string;
      amount: string;
      currency: string;
      status: string;
      reference_no: string | null;
      paid_at: string | null;
      created_at: string;
      invoice_url: string | null;
    }>(
      `
      SELECT
        pp.id,
        l.name AS library_name,
        pp.amount::text,
        pp.currency,
        pp.status::text,
        COALESCE(pp.razorpay_payment_id, pp.razorpay_order_id) AS reference_no,
        pp.paid_at::text,
        pp.created_at::text,
        pp.invoice_url
      FROM platform_payments pp
      INNER JOIN libraries l ON l.id = pp.library_id
      ORDER BY pp.created_at DESC
      `,
    );

    return result.rows;
  }

  async getOwnerDashboardSummary(libraryId: string) {
    const [metricsResult, dueStudentsResult, recentPaymentsResult, libraryResult] = await Promise.all([
      this.pool.query<{
        revenue_today: string;
        monthly_revenue: string;
        monthly_expenses: string;
        monthly_profit: string;
        pending_dues: string;
        occupancy_percent: string;
        total_seats: string;
        available_seats: string;
        active_students: string;
        today_checkins: string;
        unpaid_students: string;
        expiring_students: string;
        overstay_students: string;
      }>(
        `
        SELECT
          COALESCE((
            SELECT SUM(amount)
            FROM payments
            WHERE library_id = $1
              AND status = 'PAID'
              AND paid_at::date = CURRENT_DATE
          ), 0)::text AS revenue_today,
          COALESCE((
            SELECT SUM(amount)
            FROM payments
            WHERE library_id = $1
              AND status = 'PAID'
              AND DATE_TRUNC('month', COALESCE(paid_at, created_at)) = DATE_TRUNC('month', NOW())
          ), 0)::text AS monthly_revenue,
          COALESCE((
            SELECT SUM(amount)
            FROM expenses
            WHERE library_id = $1
              AND DATE_TRUNC('month', spent_on::timestamp) = DATE_TRUNC('month', NOW())
          ), 0)::text AS monthly_expenses,
          (
            COALESCE((
              SELECT SUM(amount)
              FROM payments
              WHERE library_id = $1
                AND status = 'PAID'
                AND DATE_TRUNC('month', COALESCE(paid_at, created_at)) = DATE_TRUNC('month', NOW())
            ), 0)
            -
            COALESCE((
              SELECT SUM(amount)
              FROM expenses
              WHERE library_id = $1
                AND DATE_TRUNC('month', spent_on::timestamp) = DATE_TRUNC('month', NOW())
            ), 0)
          )::text AS monthly_profit,
          COALESCE((
            SELECT SUM(amount)
            FROM payments
            WHERE library_id = $1
              AND status IN ('DUE', 'PENDING')
          ), 0)::text AS pending_dues,
          CASE
            WHEN l.total_seats = 0 THEN '0'
            ELSE ROUND((((l.total_seats - l.available_seats)::numeric / l.total_seats::numeric) * 100), 0)::text
          END AS occupancy_percent,
          l.total_seats::text,
          l.available_seats::text,
          (
            SELECT COUNT(*)::text
            FROM student_assignments sa
            WHERE sa.library_id = $1
              AND sa.status = 'ACTIVE'
          ) AS active_students,
          (
            SELECT COUNT(*)::text
            FROM checkins c
            WHERE c.library_id = $1
              AND c.checked_in_at::date = CURRENT_DATE
          ) AS today_checkins,
          (
            SELECT COUNT(*)::text
            FROM student_assignments sa
            WHERE sa.library_id = $1
              AND sa.status = 'ACTIVE'
              AND sa.payment_status IN ('DUE', 'PENDING')
          ) AS unpaid_students,
          (
            SELECT COUNT(*)::text
            FROM student_assignments sa
            WHERE sa.library_id = $1
              AND sa.status = 'ACTIVE'
              AND sa.ends_at <= NOW() + INTERVAL '3 days'
          ) AS expiring_students,
          (
            SELECT COUNT(*)::text
            FROM checkins c
            WHERE c.library_id = $1
              AND c.checked_out_at IS NULL
              AND EXTRACT(EPOCH FROM (NOW() - c.checked_in_at)) / 60 >= 720
          ) AS overstay_students
        FROM libraries l
        WHERE l.id = $1
        LIMIT 1
        `,
        [libraryId],
      ),
      this.pool.query<{
        assignment_id: string;
        student_name: string;
        student_phone: string | null;
        seat_number: string | null;
        ends_at: string;
        payment_status: string;
        due_amount: string;
      }>(
        `
        SELECT
          sa.id AS assignment_id,
          u.full_name AS student_name,
          u.phone AS student_phone,
          s.seat_number,
          sa.ends_at::date::text,
          sa.payment_status::text,
          COALESCE((
            SELECT SUM(p.amount)
            FROM payments p
            WHERE p.library_id = sa.library_id
              AND p.student_user_id = sa.student_user_id
              AND p.status IN ('DUE', 'PENDING')
          ), 0)::text AS due_amount
        FROM student_assignments sa
        INNER JOIN users u ON u.id = sa.student_user_id
        LEFT JOIN seats s ON s.id = sa.seat_id
        WHERE sa.library_id = $1
          AND sa.status = 'ACTIVE'
          AND (
            sa.payment_status IN ('DUE', 'PENDING')
            OR sa.ends_at <= NOW() + INTERVAL '3 days'
          )
        ORDER BY sa.ends_at ASC, u.full_name ASC
        LIMIT 8
        `,
        [libraryId],
      ),
      this.pool.query<{
        id: string;
        student_name: string;
        amount: string;
        method: string;
        status: string;
        paid_at: string | null;
        created_at: string;
      }>(
        `
        SELECT
          p.id,
          u.full_name AS student_name,
          p.amount::text,
          p.method,
          p.status::text,
          p.paid_at::text,
          p.created_at::text
        FROM payments p
        INNER JOIN users u ON u.id = p.student_user_id
        WHERE p.library_id = $1
        ORDER BY COALESCE(p.paid_at, p.created_at) DESC
        LIMIT 8
        `,
        [libraryId],
      ),
      this.pool.query<{
        name: string;
        city: string;
        area: string | null;
        wifi_name: string | null;
        wifi_password: string | null;
        notice_message: string | null;
        plan_name: string | null;
        subscription_status: string | null;
        current_period_end: string | null;
      }>(
        `
        SELECT
          l.name,
          l.city,
          l.area,
          ls.wifi_name,
          ls.wifi_password,
          ls.notice_message,
          s.plan_name,
          s.status::text AS subscription_status,
          s.current_period_end::date::text
        FROM libraries l
        LEFT JOIN library_settings ls ON ls.library_id = l.id
        LEFT JOIN subscriptions s ON s.library_id = l.id
        WHERE l.id = $1
        LIMIT 1
        `,
        [libraryId],
      ),
    ]);

    return {
      metrics: metricsResult.rows[0],
      dueStudents: dueStudentsResult.rows,
      recentPayments: recentPaymentsResult.rows,
      library: libraryResult.rows[0] ?? null,
    };
  }

  async listExpenses(libraryId: string, month?: string | null) {
    const result = await this.pool.query<OwnerExpenseRow>(
      `
      SELECT id, category, title, amount::text, spent_on::text, notes, created_at::text
      FROM expenses
      WHERE library_id = $1
        AND ($2::text IS NULL OR TO_CHAR(spent_on, 'YYYY-MM') = $2)
      ORDER BY spent_on DESC, created_at DESC
      LIMIT 200
      `,
      [libraryId, month ?? null],
    );

    return result.rows;
  }

  async getExpenseSummary(libraryId: string, month?: string | null) {
    const result = await this.pool.query<{
      monthly_expenses: string;
      monthly_revenue: string;
      monthly_profit: string;
    }>(
      `
      SELECT
        COALESCE((
          SELECT SUM(amount)
          FROM expenses
          WHERE library_id = $1
            AND ($2::text IS NULL OR TO_CHAR(spent_on, 'YYYY-MM') = $2)
        ), 0)::text AS monthly_expenses,
        COALESCE((
          SELECT SUM(amount)
          FROM payments
          WHERE library_id = $1
            AND status = 'PAID'
            AND ($2::text IS NULL OR TO_CHAR(COALESCE(paid_at, created_at), 'YYYY-MM') = $2)
        ), 0)::text AS monthly_revenue,
        (
          COALESCE((
            SELECT SUM(amount)
            FROM payments
            WHERE library_id = $1
              AND status = 'PAID'
              AND ($2::text IS NULL OR TO_CHAR(COALESCE(paid_at, created_at), 'YYYY-MM') = $2)
          ), 0)
          -
          COALESCE((
            SELECT SUM(amount)
            FROM expenses
            WHERE library_id = $1
              AND ($2::text IS NULL OR TO_CHAR(spent_on, 'YYYY-MM') = $2)
          ), 0)
        )::text AS monthly_profit
      `,
      [libraryId, month ?? null],
    );

    return result.rows[0];
  }

  async createExpense(client: PoolClient, input: {
    libraryId: string;
    category: string;
    title: string;
    amount: number;
    spentOn: string;
    notes?: string | null;
    createdBy: string;
  }) {
    const result = await client.query<{ id: string }>(
      `
      INSERT INTO expenses (library_id, category, title, amount, spent_on, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
      `,
      [
        input.libraryId,
        input.category,
        input.title,
        input.amount,
        input.spentOn,
        input.notes ?? null,
        input.createdBy,
      ],
    );

    return result.rows[0];
  }

  async getOwnerSettings(libraryId: string) {
    const result = await this.pool.query<{
      library_id: string;
      library_name: string;
      address: string;
      city: string;
      area: string | null;
      wifi_name: string | null;
      wifi_password: string | null;
      notice_message: string | null;
      allow_offline_checkin: boolean;
      qr_key_id: string;
      subscription_plan: string | null;
      subscription_status: string | null;
      renewal_date: string | null;
    }>(
      `
      SELECT
        l.id AS library_id,
        l.name AS library_name,
        l.address,
        l.city,
        l.area,
        ls.wifi_name,
        ls.wifi_password,
        ls.notice_message,
        COALESCE(ls.allow_offline_checkin, TRUE) AS allow_offline_checkin,
        l.active_qr_key_id::text AS qr_key_id,
        s.plan_name AS subscription_plan,
        s.status::text AS subscription_status,
        s.current_period_end::date::text AS renewal_date
      FROM libraries l
      LEFT JOIN library_settings ls ON ls.library_id = l.id
      LEFT JOIN subscriptions s ON s.library_id = l.id
      WHERE l.id = $1
      LIMIT 1
      `,
      [libraryId],
    );

    return result.rows[0] ?? null;
  }

  async upsertOwnerSettings(client: PoolClient, input: {
    libraryId: string;
    libraryName: string;
    address: string;
    city: string;
    area?: string | null;
    wifiName?: string | null;
    wifiPassword?: string | null;
    noticeMessage?: string | null;
    allowOfflineCheckin: boolean;
  }) {
    await client.query(
      `
      UPDATE libraries
      SET
        name = $2,
        address = $3,
        city = $4,
        area = $5,
        updated_at = NOW()
      WHERE id = $1
      `,
      [input.libraryId, input.libraryName, input.address, input.city, input.area ?? null],
    );

    await client.query(
      `
      INSERT INTO library_settings (
        library_id,
        wifi_name,
        wifi_password,
        notice_message,
        allow_offline_checkin,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (library_id)
      DO UPDATE SET
        wifi_name = EXCLUDED.wifi_name,
        wifi_password = EXCLUDED.wifi_password,
        notice_message = EXCLUDED.notice_message,
        allow_offline_checkin = EXCLUDED.allow_offline_checkin,
        updated_at = NOW()
      `,
      [
        input.libraryId,
        input.wifiName ?? null,
        input.wifiPassword ?? null,
        input.noticeMessage ?? null,
        input.allowOfflineCheckin,
      ],
    );
  }

  async regenerateLibraryQr(client: PoolClient, libraryId: string, qrSecret: string) {
    const result = await client.query<{ active_qr_key_id: string }>(
      `
      UPDATE libraries
      SET
        active_qr_key_id = gen_random_uuid(),
        qr_secret_hash = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING active_qr_key_id::text
      `,
      [libraryId, qrSecret],
    );

    return result.rows[0];
  }

  async getLibraryOwnershipContext(libraryId: string, actorUserId: string) {
    const result = await this.pool.query<{ owner_user_id: string; is_head_admin: boolean }>(
      `
      SELECT owner_user_id::text, (owner_user_id = $2) AS is_head_admin
      FROM libraries
      WHERE id = $1
      LIMIT 1
      `,
      [libraryId, actorUserId],
    );

    return result.rows[0] ?? null;
  }

  async listLibraryAdmins(libraryId: string) {
    const result = await this.pool.query<LibraryAdminRow>(
      `
      SELECT
        u.id::text AS user_id,
        u.full_name,
        u.email,
        u.phone,
        (l.owner_user_id = u.id) AS is_head_admin,
        COALESCE(lap.permissions, '[]'::jsonb) AS permissions,
        ulr.created_at::text
      FROM user_library_roles ulr
      INNER JOIN users u ON u.id = ulr.user_id
      INNER JOIN libraries l ON l.id = ulr.library_id
      LEFT JOIN library_admin_permissions lap
        ON lap.library_id = ulr.library_id
       AND lap.user_id = ulr.user_id
      WHERE ulr.library_id = $1
        AND ulr.role = 'LIBRARY_OWNER'
      ORDER BY (l.owner_user_id = u.id) DESC, ulr.created_at ASC
      `,
      [libraryId],
    );

    return result.rows;
  }

  async getOwnerAdminAccess(libraryId: string, userId: string) {
    const result = await this.pool.query<{
      is_head_admin: boolean;
      permissions: string[];
    }>(
      `
      SELECT
        (l.owner_user_id = $2) AS is_head_admin,
        COALESCE(lap.permissions, '[]'::jsonb) AS permissions
      FROM user_library_roles ulr
      INNER JOIN libraries l ON l.id = ulr.library_id
      LEFT JOIN library_admin_permissions lap
        ON lap.library_id = ulr.library_id
       AND lap.user_id = ulr.user_id
      WHERE ulr.library_id = $1
        AND ulr.user_id = $2
        AND ulr.role = 'LIBRARY_OWNER'
      LIMIT 1
      `,
      [libraryId, userId],
    );

    return result.rows[0] ?? null;
  }

  async createOwnerUser(client: PoolClient, input: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
    passwordHash: string;
  }) {
    const result = await client.query<{ id: string }>(
      `
      INSERT INTO users (full_name, email, phone, password_hash, global_role)
      VALUES ($1, $2, $3, $4, 'LIBRARY_OWNER')
      RETURNING id::text
      `,
      [input.fullName, input.email ?? null, input.phone ?? null, input.passwordHash],
    );

    return result.rows[0];
  }

  async ensureOwnerRole(client: PoolClient, userId: string, libraryId: string) {
    await client.query(
      `
      INSERT INTO user_library_roles (user_id, library_id, role)
      VALUES ($1, $2, 'LIBRARY_OWNER')
      ON CONFLICT (user_id, library_id, role) DO NOTHING
      `,
      [userId, libraryId],
    );
  }

  async deleteOwnerRole(client: PoolClient, userId: string, libraryId: string) {
    await client.query(
      `
      DELETE FROM library_admin_permissions
      WHERE user_id = $1
        AND library_id = $2
      `,
      [userId, libraryId],
    );
    await client.query(
      `
      DELETE FROM user_library_roles
      WHERE user_id = $1
        AND library_id = $2
        AND role = 'LIBRARY_OWNER'
      `,
      [userId, libraryId],
    );
  }

  async upsertOwnerAdminPermissions(client: PoolClient, input: {
    libraryId: string;
    userId: string;
    permissions: string[];
  }) {
    await client.query(
      `
      INSERT INTO library_admin_permissions (library_id, user_id, permissions, updated_at)
      VALUES ($1, $2, $3::jsonb, NOW())
      ON CONFLICT (library_id, user_id)
      DO UPDATE SET
        permissions = EXCLUDED.permissions,
        updated_at = NOW()
      `,
      [input.libraryId, input.userId, JSON.stringify(input.permissions)],
    );
  }

  async listAuditLogs(libraryId: string, page: number, limit: number): Promise<PageResult<AuditLogRow>> {
    const offset = (page - 1) * limit;
    const [rowsResult, countResult] = await Promise.all([
      this.pool.query<AuditLogRow>(
        `
        SELECT
          al.id::text,
          u.full_name AS actor_name,
          al.action,
          al.entity_type,
          al.metadata,
          al.created_at::text
        FROM audit_logs al
        LEFT JOIN users u ON u.id = al.actor_user_id
        WHERE al.library_id = $1
        ORDER BY al.created_at DESC
        LIMIT $2 OFFSET $3
        `,
        [libraryId, limit, offset],
      ),
      this.pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM audit_logs WHERE library_id = $1`,
        [libraryId],
      ),
    ]);

    return {
      rows: rowsResult.rows,
      total: Number(countResult.rows[0]?.count ?? "0"),
      page,
      limit,
    };
  }

  async createJoinRequest(client: PoolClient, input: {
    libraryId: string;
    studentUserId: string;
    requestedVia: string;
    requestQrKeyId?: string | null;
    seatPreference?: string | null;
    message?: string | null;
  }) {
    const result = await client.query<{ id: string }>(
      `
      INSERT INTO library_join_requests (
        library_id, student_user_id, requested_via, request_qr_key_id, seat_preference, message
      )
      VALUES ($1, $2, $3, $4::uuid, $5, $6)
      ON CONFLICT (library_id, student_user_id) WHERE status = 'PENDING'
      DO UPDATE SET
        seat_preference = EXCLUDED.seat_preference,
        message = EXCLUDED.message,
        request_qr_key_id = EXCLUDED.request_qr_key_id,
        updated_at = NOW()
      RETURNING id::text
      `,
      [
        input.libraryId,
        input.studentUserId,
        input.requestedVia,
        input.requestQrKeyId ?? null,
        input.seatPreference ?? null,
        input.message ?? null,
      ],
    );

    return result.rows[0];
  }

  async findLibraryById(client: PoolClient, libraryId: string) {
    const result = await client.query<{ id: string; name: string; city: string; area: string | null }>(
      `
      SELECT id::text, name, city, area
      FROM libraries
      WHERE id = $1
      LIMIT 1
      `,
      [libraryId],
    );

    return result.rows[0] ?? null;
  }

  async searchActiveLibrariesForJoin(query: string) {
    const normalized = `%${query.trim().toLowerCase()}%`;
    const result = await this.pool.query<{
      library_id: string;
      library_name: string;
      city: string;
      area: string | null;
      subdomain: string | null;
    }>(
      `
      SELECT
        l.id::text AS library_id,
        l.name AS library_name,
        l.city,
        l.area,
        l.subdomain
      FROM libraries l
      WHERE l.is_active = TRUE
        AND (
          LOWER(l.name) LIKE $1
          OR LOWER(l.city) LIKE $1
          OR COALESCE(LOWER(l.area), '') LIKE $1
          OR COALESCE(LOWER(l.subdomain), '') LIKE $1
        )
      ORDER BY l.name ASC
      LIMIT 12
      `,
      [normalized],
    );

    return result.rows;
  }

  async listJoinRequests(libraryId: string) {
    const result = await this.pool.query<JoinRequestRow>(
      `
      SELECT
        ljr.id::text,
        u.id::text AS student_user_id,
        u.full_name AS student_name,
        u.student_code,
        u.email AS student_email,
        u.phone AS student_phone,
        ljr.seat_preference,
        ljr.message,
        ljr.requested_via,
        ljr.status,
        ljr.created_at::text,
        ljr.reviewed_at::text,
        ljr.linked_assignment_id::text,
        COALESCE(ljr.metadata->>'reason', '') AS review_reason
      FROM library_join_requests ljr
      INNER JOIN users u ON u.id = ljr.student_user_id
      WHERE ljr.library_id = $1
      ORDER BY CASE ljr.status WHEN 'PENDING' THEN 0 ELSE 1 END, ljr.created_at DESC
      `,
      [libraryId],
    );

    return result.rows;
  }

  async findJoinRequest(client: PoolClient, libraryId: string, requestId: string) {
    const result = await client.query<{
      id: string;
      student_user_id: string;
      status: string;
    }>(
      `
      SELECT id::text, student_user_id::text, status
      FROM library_join_requests
      WHERE library_id = $1
        AND id = $2
      LIMIT 1
      `,
      [libraryId, requestId],
    );

    return result.rows[0] ?? null;
  }

  async listStudentJoinRequests(studentUserId: string) {
    const result = await this.pool.query<JoinRequestRow & { library_name: string }>(
      `
      SELECT
        ljr.id::text,
        u.id::text AS student_user_id,
        u.full_name AS student_name,
        u.student_code,
        u.email AS student_email,
        u.phone AS student_phone,
        ljr.seat_preference,
        ljr.message,
        ljr.requested_via,
        ljr.status,
        ljr.created_at::text,
        ljr.reviewed_at::text,
        ljr.linked_assignment_id::text,
        COALESCE(ljr.metadata->>'reason', '') AS review_reason,
        l.name AS library_name
      FROM library_join_requests ljr
      INNER JOIN users u ON u.id = ljr.student_user_id
      INNER JOIN libraries l ON l.id = ljr.library_id
      WHERE ljr.student_user_id = $1
      ORDER BY ljr.created_at DESC
      `,
      [studentUserId],
    );

    return result.rows;
  }

  async updateJoinRequestStatus(client: PoolClient, input: {
    libraryId: string;
    requestId: string;
    status: "APPROVED" | "REJECTED" | "CANCELLED";
    reviewedBy: string;
    linkedAssignmentId?: string | null;
    reason?: string | null;
  }) {
    await client.query(
      `
      UPDATE library_join_requests
      SET
        status = $3,
        reviewed_by = $4,
        reviewed_at = NOW(),
        linked_assignment_id = COALESCE($5, linked_assignment_id),
        metadata = metadata || jsonb_build_object('reason', $6),
        updated_at = NOW()
      WHERE library_id = $1
        AND id = $2
      `,
      [input.libraryId, input.requestId, input.status, input.reviewedBy, input.linkedAssignmentId ?? null, input.reason ?? null],
    );
  }

  async findLibraryByQrKey(client: PoolClient, qrKeyId: string) {
      const result = await client.query<{ id: string; name: string; active_qr_key_id: string; city: string; area: string | null; subdomain: string | null }>(
        `
        SELECT id::text, name, active_qr_key_id::text, city, area, subdomain
        FROM libraries
        WHERE active_qr_key_id = $1::uuid
        LIMIT 1
        `,
        [qrKeyId],
    );

    return result.rows[0] ?? null;
  }

  async exitStudentLibrary(client: PoolClient, studentUserId: string, libraryId: string) {
    await client.query(
      `
      UPDATE student_assignments
      SET status = 'CANCELLED', updated_at = NOW()
      WHERE student_user_id = $1
        AND library_id = $2
        AND status = 'ACTIVE'
      `,
      [studentUserId, libraryId],
    );

    await client.query(
      `
      UPDATE student_library_mapping
      SET is_active = FALSE, left_at = NOW(), updated_at = NOW()
      WHERE student_user_id = $1
        AND library_id = $2
      `,
      [studentUserId, libraryId],
    );
  }

  async reserveSeatForRejoin(client: PoolClient, input: {
    libraryId: string;
    seatNumber: string;
  }) {
    const result = await client.query<{ id: string; seat_number: string; reserved_until: string }>(
      `
      UPDATE seats
      SET
        status = 'RESERVED',
        reserved_until = NOW() + INTERVAL '30 minutes',
        updated_at = NOW()
      WHERE library_id = $1
        AND seat_number = $2
        AND status = 'AVAILABLE'
      RETURNING id::text, seat_number, reserved_until::text
      `,
      [input.libraryId, input.seatNumber],
    );

    return result.rows[0] ?? null;
  }
}
