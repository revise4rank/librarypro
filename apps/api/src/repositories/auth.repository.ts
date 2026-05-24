import type { Pool } from "pg";
import type { user_role } from "../types/generated";

type UserRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  student_code: string | null;
  password_hash: string;
  global_role: user_role;
  session_version: number;
};

type SessionSnapshotRow = {
  id: string;
  session_version: number;
  is_active: boolean;
};

export class AuthRepository {
  constructor(private readonly pool: Pool) {}

  async findUserByLogin(login: string) {
    const result = await this.pool.query<UserRow>(
      `
      SELECT id, full_name, email, phone, student_code, password_hash, global_role, session_version
      FROM users
      WHERE email = $1 OR phone = $1 OR student_code = $1
      LIMIT 1
      `,
      [login],
    );

    return result.rows[0] ?? null;
  }

  async getUserLibraryRoles(userId: string) {
    const result = await this.pool.query<{ library_id: string; role: user_role }>(
      `
      SELECT library_id, role
      FROM user_library_roles
      WHERE user_id = $1
      `,
      [userId],
    );

    return result.rows;
  }

  async getSessionSnapshot(userId: string) {
    const result = await this.pool.query<SessionSnapshotRow>(
      `
      SELECT id, session_version, is_active
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId],
    );

    return result.rows[0] ?? null;
  }

  async findUserById(userId: string) {
    const result = await this.pool.query<UserRow>(
      `
      SELECT id, full_name, email, phone, student_code, password_hash, global_role, session_version
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId],
    );

    return result.rows[0] ?? null;
  }
}
