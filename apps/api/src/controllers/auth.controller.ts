import type { Request, Response } from "express";
import crypto from "node:crypto";
import { createAuditLog } from "../lib/audit";
import { AppError } from "../lib/errors";
import { changeAuthenticatedUserPassword, getAuthenticatedUser, loginUser, registerStudentUser, updateAuthenticatedUserProfile } from "../services/auth.service";
import { changePasswordBodySchema, loginBodySchema, studentRegisterBodySchema, updateMeBodySchema } from "../validators/auth.validators";

const ACCESS_COOKIE_NAME = "lp_access";
const CSRF_COOKIE_NAME = "lp_csrf";
const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 15;

function getCookieDomain(hostname: string) {
  const normalizedHost = hostname.toLowerCase().split(":")[0];
  if (
    normalizedHost === "localhost" ||
    normalizedHost === "127.0.0.1" ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(normalizedHost)
  ) {
    return undefined;
  }

  const parts = normalizedHost.split(".");
  if (parts.length < 2) {
    return undefined;
  }

  return `.${parts.slice(-2).join(".")}`;
}

function setAccessCookie(req: Request, res: Response, token: string) {
  const secure = req.secure || req.header("x-forwarded-proto") === "https";
  const domain = getCookieDomain(req.hostname);
  const cookieParts = [
    `${ACCESS_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${ACCESS_COOKIE_MAX_AGE_SECONDS}`,
  ];

  if (secure) {
    cookieParts.push("Secure");
  }

  if (domain) {
    cookieParts.push(`Domain=${domain}`);
  }

  res.append("Set-Cookie", cookieParts.join("; "));
}

function setCsrfCookie(req: Request, res: Response, csrfToken: string) {
  const secure = req.secure || req.header("x-forwarded-proto") === "https";
  const domain = getCookieDomain(req.hostname);
  const cookieParts = [
    `${CSRF_COOKIE_NAME}=${encodeURIComponent(csrfToken)}`,
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${ACCESS_COOKIE_MAX_AGE_SECONDS}`,
  ];

  if (secure) {
    cookieParts.push("Secure");
  }

  if (domain) {
    cookieParts.push(`Domain=${domain}`);
  }

  res.append("Set-Cookie", cookieParts.join("; "));
}

function clearAccessCookie(req: Request, res: Response) {
  const secure = req.secure || req.header("x-forwarded-proto") === "https";
  const domain = getCookieDomain(req.hostname);
  const cookieParts = [
    `${ACCESS_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];

  if (secure) {
    cookieParts.push("Secure");
  }

  if (domain) {
    cookieParts.push(`Domain=${domain}`);
  }

  res.append("Set-Cookie", cookieParts.join("; "));
}

function clearCsrfCookie(req: Request, res: Response) {
  const secure = req.secure || req.header("x-forwarded-proto") === "https";
  const domain = getCookieDomain(req.hostname);
  const cookieParts = [
    `${CSRF_COOKIE_NAME}=`,
    "Path=/",
    "SameSite=Lax",
    "Max-Age=0",
  ];

  if (secure) {
    cookieParts.push("Secure");
  }

  if (domain) {
    cookieParts.push(`Domain=${domain}`);
  }

  res.append("Set-Cookie", cookieParts.join("; "));
}

function ensureCsrfToken(req: Request, res: Response) {
  const token = crypto.randomBytes(24).toString("hex");
  setCsrfCookie(req, res, token);
  return token;
}

export async function loginController(req: Request, res: Response) {
  const parsed = loginBodySchema.parse(req.body);
  const result = await loginUser(parsed);

  await createAuditLog({
    actorUserId: result.user.id,
    libraryId: result.user.libraryIds[0] ?? null,
    action: "auth.login",
    entityType: "user",
    entityId: result.user.id,
    metadata: { role: result.user.role },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });

  setAccessCookie(req, res, result.accessToken);
  const csrfToken = ensureCsrfToken(req, res);
  res.json({ success: true, data: { user: result.user, csrfToken } });
}

export async function studentRegisterController(req: Request, res: Response) {
  const parsed = studentRegisterBodySchema.parse(req.body);
  const user = await registerStudentUser({
    fullName: parsed.fullName,
    email: parsed.email || undefined,
    phone: parsed.phone || undefined,
    password: parsed.password,
  });

  const result = await loginUser({
    login: parsed.email || parsed.phone || user.studentCode || "",
    password: parsed.password,
  });

  setAccessCookie(req, res, result.accessToken);
  const csrfToken = ensureCsrfToken(req, res);
  res.status(201).json({ success: true, data: { user: result.user, csrfToken } });
}

export async function logoutController(req: Request, res: Response) {
  if (req.auth?.userId) {
    await createAuditLog({
      actorUserId: req.auth.userId,
      libraryId: req.auth.libraryIds[0] ?? null,
      action: "auth.logout",
      entityType: "user",
      entityId: req.auth.userId,
      metadata: { role: req.auth.role },
      ipAddress: req.ip,
      userAgent: req.header("user-agent") ?? null,
    });
  }

  clearAccessCookie(req, res);
  clearCsrfCookie(req, res);
  res.json({ success: true });
}

export async function meController(req: Request, res: Response) {
  if (!req.auth) {
    throw new AppError(401, "Authentication required", "UNAUTHENTICATED");
  }

  const user = await getAuthenticatedUser(req.auth.userId);
  const csrfToken = ensureCsrfToken(req, res);
  res.json({ success: true, data: { ...user, csrfToken } });
}

export async function updateMeController(req: Request, res: Response) {
  if (!req.auth) {
    throw new AppError(401, "Authentication required", "UNAUTHENTICATED");
  }

  const parsed = updateMeBodySchema.parse(req.body);
  const user = await updateAuthenticatedUserProfile({
    userId: req.auth.userId,
    fullName: parsed.fullName,
    email: parsed.email || undefined,
    phone: parsed.phone || undefined,
  });
  const csrfToken = ensureCsrfToken(req, res);
  res.json({ success: true, data: { ...user, csrfToken } });
}

export async function changePasswordController(req: Request, res: Response) {
  if (!req.auth) {
    throw new AppError(401, "Authentication required", "UNAUTHENTICATED");
  }

  const parsed = changePasswordBodySchema.parse(req.body);
  await changeAuthenticatedUserPassword({
    userId: req.auth.userId,
    currentPassword: parsed.currentPassword,
    nextPassword: parsed.nextPassword,
  });

  clearAccessCookie(req, res);
  clearCsrfCookie(req, res);
  res.json({ success: true });
}
