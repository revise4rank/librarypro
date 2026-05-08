import { comparePassword, hashPassword, signAccessToken } from "../lib/auth";
import { env } from "../config/env";
import { requireDb } from "../lib/db";
import { AppError } from "../lib/errors";
import { AuthRepository, type UserRow } from "../repositories/auth.repository";
import { OwnerOperationsRepository } from "../repositories/owner-operations.repository";
import crypto from "node:crypto";
import nodemailer from "nodemailer";
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

function buildLibrarySlug(libraryName: string) {
  const base = libraryName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "library";
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}

const ROLE_PRIORITY: user_role[] = ["LIBRARY_OWNER", "STUDENT"];

function resolveEffectiveRole(globalRole: user_role, libraryRoles: Array<{ role: user_role }>) {
  if (globalRole === "SUPER_ADMIN") {
    return "SUPER_ADMIN" as user_role;
  }

  const roleSet = new Set(libraryRoles.map((item) => item.role));
  const prioritizedRole = ROLE_PRIORITY.find((role) => roleSet.has(role));
  return prioritizedRole ?? globalRole;
}

async function buildAuthenticatedSession(user: UserRow) {
  const roles = await repository().getUserLibraryRoles(user.id);
  const libraryIds = [...new Set(roles.map((role) => role.library_id))];
  const effectiveRole = resolveEffectiveRole(user.global_role, roles);

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

export async function loginUser(input: { login: string; password: string }) {
  const user = await repository().findUserByLogin(input.login);
  if (!user) {
    throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  }

  const passwordValid = await comparePassword(input.password, user.password_hash);
  if (!passwordValid) {
    throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  }

  return buildAuthenticatedSession(user);
}

export async function getAuthenticatedUser(userId: string) {
  const user = await repository().findUserById(userId);
  if (!user) {
    throw new AppError(401, "Account not found", "ACCOUNT_NOT_FOUND");
  }

  const roles = await repository().getUserLibraryRoles(user.id);
  const libraryIds = [...new Set(roles.map((role) => role.library_id))];
  const effectiveRole = resolveEffectiveRole(user.global_role, roles);

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

export async function registerOwnerUser(input: {
  fullName: string;
  libraryName: string;
  email?: string;
  phone?: string;
  city?: string;
  password: string;
}) {
  const db = requireDb();
  const repo = ownerRepository();
  const client = await db.connect();
  let createdUserId: string | null = null;

  try {
    await client.query("BEGIN");

    const existing = await repo.findStudentByEmailOrPhone(client, input.email, input.phone);
    if (existing) {
      throw new AppError(409, "Account already exists with this email or phone", "USER_ALREADY_EXISTS");
    }

    const passwordHash = await hashPassword(input.password);
    const owner = await repo.createOwnerUser(client, {
      fullName: input.fullName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      passwordHash,
    });

    const library = await repo.createLibraryForOwner(client, {
      ownerUserId: owner.id,
      name: input.libraryName,
      slug: buildLibrarySlug(input.libraryName),
      city: input.city || null,
      qrSecretHash: crypto.randomBytes(32).toString("hex"),
    });

    await repo.ensureOwnerRole(client, owner.id, library.id);
    await repo.createStarterSubscription(client, library.id);

    await client.query("COMMIT");
    createdUserId = owner.id;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  if (!createdUserId) {
    throw new AppError(500, "Owner account could not be created", "OWNER_REGISTER_FAILED");
  }

  return getAuthenticatedUser(createdUserId);
}

export async function updateAuthenticatedUserProfile(input: {
  userId: string;
  fullName: string;
  email?: string;
  phone?: string;
}) {
  const user = await repository().updateUserProfile({
    userId: input.userId,
    fullName: input.fullName,
    email: input.email || null,
    phone: input.phone || null,
  });

  if (!user) {
    throw new AppError(404, "Account not found", "ACCOUNT_NOT_FOUND");
  }

  return getAuthenticatedUser(user.id);
}

export async function changeAuthenticatedUserPassword(input: {
  userId: string;
  currentPassword: string;
  nextPassword: string;
}) {
  const user = await repository().findUserById(input.userId);
  if (!user) {
    throw new AppError(404, "Account not found", "ACCOUNT_NOT_FOUND");
  }

  const passwordValid = await comparePassword(input.currentPassword, user.password_hash);
  if (!passwordValid) {
    throw new AppError(401, "Current password is incorrect", "INVALID_CREDENTIALS");
  }

  const nextPasswordHash = await hashPassword(input.nextPassword);
  await repository().updatePassword({
    userId: input.userId,
    passwordHash: nextPasswordHash,
  });

  return { success: true };
}

type GoogleOAuthRole = "LIBRARY_OWNER" | "STUDENT";

type GoogleOAuthState = {
  kind: "google_oauth_state";
  role: GoogleOAuthRole;
  next: string;
  library?: string;
  nonce: string;
  exp: number;
};

type GoogleOAuthTicket = {
  kind: "google_oauth_ticket";
  role: GoogleOAuthRole;
  next: string;
  email: string;
  fullName: string;
  picture?: string;
  exp: number;
};

type PasswordResetTicket = {
  kind: "password_reset";
  userId: string;
  sessionVersion: number;
  exp: number;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: GoogleOAuthState | GoogleOAuthTicket | PasswordResetTicket) {
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", env.jwtSecret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyPayload<T extends GoogleOAuthState | GoogleOAuthTicket | PasswordResetTicket>(token: string, kind: T["kind"]) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    throw new AppError(400, "Invalid Google sign-in ticket", "GOOGLE_OAUTH_TICKET_INVALID");
  }

  const expected = crypto.createHmac("sha256", env.jwtSecret).update(encoded).digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new AppError(400, "Invalid Google sign-in ticket", "GOOGLE_OAUTH_TICKET_INVALID");
  }

  const payload = JSON.parse(base64UrlDecode(encoded)) as T;
  if (payload.kind !== kind || payload.exp < Date.now()) {
    throw new AppError(400, "Google sign-in ticket has expired", "GOOGLE_OAUTH_TICKET_EXPIRED");
  }

  return payload;
}

function getPasswordResetUrl(token: string) {
  const url = new URL("/reset-password", env.webAppUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

function isSmtpConfigured() {
  return Boolean(env.smtpHost && env.smtpUser && env.smtpPass && env.reportFromEmail);
}

async function sendPasswordResetEmail(input: { to: string; fullName: string; resetUrl: string }) {
  if (!isSmtpConfigured()) {
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  await transporter.sendMail({
    from: env.reportFromEmail,
    to: input.to,
    subject: "Reset your LibraryPro password",
    text: [
      `Hello ${input.fullName},`,
      "",
      "We received a request to reset your LibraryPro password.",
      `Open this link to set a new password: ${input.resetUrl}`,
      "",
      "This link expires in 30 minutes. If you did not request it, you can ignore this email.",
    ].join("\n"),
  });

  return true;
}

export async function requestPasswordReset(input: { login: string }) {
  const user = await repository().findUserByLogin(input.login);
  if (!user?.email) {
    return { success: true };
  }

  const token = signPayload({
    kind: "password_reset",
    userId: user.id,
    sessionVersion: user.session_version,
    exp: Date.now() + 30 * 60 * 1000,
  });

  await sendPasswordResetEmail({
    to: user.email,
    fullName: user.full_name,
    resetUrl: getPasswordResetUrl(token),
  }).catch(() => undefined);

  return { success: true };
}

export async function resetPasswordWithToken(input: { token: string; password: string }) {
  const payload = verifyPayload<PasswordResetTicket>(input.token, "password_reset");
  const user = await repository().findUserById(payload.userId);
  if (!user || user.session_version !== payload.sessionVersion) {
    throw new AppError(400, "Password reset link is no longer valid", "PASSWORD_RESET_INVALID");
  }

  const passwordHash = await hashPassword(input.password);
  await repository().updatePassword({
    userId: user.id,
    passwordHash,
  });

  return { success: true };
}

function normalizeNextPath(next: string | undefined, role: GoogleOAuthRole) {
  if (next && next.startsWith("/") && !next.startsWith("//") && next.length <= 300) {
    return next;
  }

  return role === "LIBRARY_OWNER" ? "/owner/dashboard" : "/student/dashboard";
}

function getGoogleOAuthRedirectUrl() {
  if (env.googleOAuthRedirectUrl) {
    return env.googleOAuthRedirectUrl;
  }

  const origin = env.apiPublicUrl || `http://127.0.0.1:${env.port}`;
  return `${origin.replace(/\/$/, "")}/v1/auth/google/callback`;
}

function ensureGoogleOAuthConfigured() {
  if (!env.googleOAuthClientId || !env.googleOAuthClientSecret) {
    throw new AppError(503, "Google sign-in is not configured yet", "GOOGLE_OAUTH_NOT_CONFIGURED");
  }
}

export function getGoogleOAuthStatus() {
  return {
    enabled: Boolean(env.googleOAuthClientId && env.googleOAuthClientSecret),
  };
}

export function buildGoogleOAuthStartUrl(input: {
  role: GoogleOAuthRole;
  next?: string;
  library?: string;
}) {
  ensureGoogleOAuthConfigured();
  const state = signPayload({
    kind: "google_oauth_state",
    role: input.role,
    next: normalizeNextPath(input.next, input.role),
    library: input.library || undefined,
    nonce: crypto.randomBytes(16).toString("hex"),
    exp: Date.now() + 10 * 60 * 1000,
  });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.googleOAuthClientId);
  url.searchParams.set("redirect_uri", getGoogleOAuthRedirectUrl());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", state);
  return url.toString();
}

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfoResponse = {
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  picture?: string;
};

export async function createGoogleOAuthTicketFromCallback(input: {
  code?: string;
  state?: string;
  error?: string;
}) {
  ensureGoogleOAuthConfigured();
  if (input.error) {
    throw new AppError(400, "Google sign-in was cancelled", "GOOGLE_OAUTH_CANCELLED");
  }
  if (!input.code || !input.state) {
    throw new AppError(400, "Google sign-in callback is missing required data", "GOOGLE_OAUTH_CALLBACK_INVALID");
  }

  const state = verifyPayload<GoogleOAuthState>(input.state, "google_oauth_state");
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.googleOAuthClientId,
      client_secret: env.googleOAuthClientSecret,
      code: input.code,
      grant_type: "authorization_code",
      redirect_uri: getGoogleOAuthRedirectUrl(),
    }),
  });
  const tokenPayload = (await tokenResponse.json()) as GoogleTokenResponse;

  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw new AppError(400, tokenPayload.error_description ?? "Google sign-in could not be verified", "GOOGLE_OAUTH_TOKEN_FAILED");
  }

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${tokenPayload.access_token}` },
  });
  const profile = (await profileResponse.json()) as GoogleUserInfoResponse;

  if (!profileResponse.ok || !profile.email || profile.email_verified === false) {
    throw new AppError(400, "Google account email could not be verified", "GOOGLE_OAUTH_EMAIL_UNVERIFIED");
  }

  const ticket = signPayload({
    kind: "google_oauth_ticket",
    role: state.role,
    next: state.next,
    email: profile.email,
    fullName: profile.name || profile.given_name || profile.email.split("@")[0],
    picture: profile.picture,
    exp: Date.now() + 10 * 60 * 1000,
  });

  return {
    ticket,
    next: state.next,
  };
}

export async function getGoogleOAuthTicketPreview(ticket: string) {
  const payload = verifyPayload<GoogleOAuthTicket>(ticket, "google_oauth_ticket");
  const existingUser = await repository().findUserByEmail(payload.email);
  const existingSession = existingUser ? await buildAuthenticatedSession(existingUser) : null;
  const existingRole = existingSession?.user.role ?? null;

  return {
    email: payload.email,
    fullName: payload.fullName,
    role: payload.role,
    next: payload.next,
    existingRole,
    requiresProfile: !existingUser,
    requiresLibrary: !existingUser && payload.role === "LIBRARY_OWNER",
  };
}

export async function completeGoogleOAuth(input: {
  ticket: string;
  fullName?: string;
  phone?: string;
  libraryName?: string;
  city?: string;
}) {
  const payload = verifyPayload<GoogleOAuthTicket>(input.ticket, "google_oauth_ticket");
  const existingUser = await repository().findUserByEmail(payload.email);
  if (existingUser) {
    const session = await buildAuthenticatedSession(existingUser);
    if (session.user.role !== payload.role) {
      throw new AppError(409, "This Google account already exists with a different LibraryPro role", "GOOGLE_OAUTH_ROLE_MISMATCH");
    }
    return { ...session, next: payload.next };
  }

  const fullName = input.fullName || payload.fullName;
  if (payload.role === "LIBRARY_OWNER" && !input.libraryName) {
    throw new AppError(400, "Library name is required to finish owner signup", "LIBRARY_NAME_REQUIRED");
  }

  const passwordHash = await hashPassword(crypto.randomBytes(32).toString("base64url"));
  const db = requireDb();
  const repo = ownerRepository();
  const client = await db.connect();
  let createdUserId: string | null = null;

  try {
    await client.query("BEGIN");

    if (payload.role === "STUDENT") {
      const student = await repo.createStudent(client, {
        fullName,
        email: payload.email,
        phone: input.phone || undefined,
        studentCode: buildStudentCode(fullName),
        passwordHash,
      });
      createdUserId = student.id;
    } else {
      const owner = await repo.createOwnerUser(client, {
        fullName,
        email: payload.email,
        phone: input.phone || null,
        passwordHash,
      });
      const library = await repo.createLibraryForOwner(client, {
        ownerUserId: owner.id,
        name: input.libraryName ?? "",
        slug: buildLibrarySlug(input.libraryName ?? ""),
        city: input.city || null,
        qrSecretHash: crypto.randomBytes(32).toString("hex"),
      });
      await repo.ensureOwnerRole(client, owner.id, library.id);
      await repo.createStarterSubscription(client, library.id);
      createdUserId = owner.id;
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  if (!createdUserId) {
    throw new AppError(500, "Google account could not be created", "GOOGLE_OAUTH_CREATE_FAILED");
  }

  const user = await repository().findUserById(createdUserId);
  if (!user) {
    throw new AppError(500, "Google account could not be loaded", "GOOGLE_OAUTH_CREATE_FAILED");
  }

  const session = await buildAuthenticatedSession(user);
  return { ...session, next: payload.next };
}
