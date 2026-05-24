import { comparePassword, hashPassword, signAccessToken } from "../lib/auth";
import { requireDb } from "../lib/db";
import { AppError } from "../lib/errors";
import { AuthRepository } from "../repositories/auth.repository";
import { OwnerOperationsRepository } from "../repositories/owner-operations.repository";
import crypto from "node:crypto";
import type { user_role } from "../types/generated";

function repository() {
  return new AuthRepository(requireDb());
}

function ownerRepository() {
  return new OwnerOperationsRepository(requireDb());
}

function buildStudentCode(fullName: string) {
  const prefix = fullName
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, "S");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}${suffix}`;
}

export async function loginUser(input: { login: string; password: string }) {
  const user = await repository().findUserByLogin(input.login);
  if (!user) {
    throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  }

  const passwordValid = await comparePassword(input.password, user.password_hash);
  if (!passwordValid) {
    throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  }

  const roles = await repository().getUserLibraryRoles(user.id);
  const libraryIds = [...new Set(roles.map((role) => role.library_id))];
  const effectiveRole = user.global_role === "SUPER_ADMIN"
    ? ("SUPER_ADMIN" as user_role)
    : (roles[0]?.role ?? user.global_role);

  const token = signAccessToken({
    userId: user.id,
    role: effectiveRole,
    libraryIds,
    sessionVersion: user.session_version,
  });

  return {
    accessToken: token,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      studentCode: user.student_code,
      role: effectiveRole,
      libraryIds,
    },
  };
}

export async function getAuthenticatedUser(userId: string) {
  const user = await repository().findUserById(userId);
  if (!user) {
    throw new AppError(401, "Account not found", "ACCOUNT_NOT_FOUND");
  }

  const roles = await repository().getUserLibraryRoles(user.id);
  const libraryIds = [...new Set(roles.map((role) => role.library_id))];
  const effectiveRole = user.global_role === "SUPER_ADMIN"
    ? ("SUPER_ADMIN" as user_role)
    : (roles[0]?.role ?? user.global_role);

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    studentCode: user.student_code,
    role: effectiveRole,
    libraryIds,
    sessionVersion: user.session_version,
  };
}

export async function registerStudentUser(input: {
  fullName: string;
  email?: string;
  phone?: string;
  password: string;
}) {
  const db = requireDb();
  const repo = ownerRepository();
  const client = await db.connect();

  try {
    const existing = await repo.findStudentByEmailOrPhone(client, input.email, input.phone);
    if (existing) {
      throw new AppError(409, "Student already exists with this email or phone", "STUDENT_ALREADY_EXISTS");
    }

    const passwordHash = await hashPassword(input.password);
    const created = await repo.createStudent(client, {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      studentCode: buildStudentCode(input.fullName),
      passwordHash,
    });

    return getAuthenticatedUser(created.id);
  } finally {
    client.release();
  }
}
