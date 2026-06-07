import type { Request, Response } from "express";
import crypto from "node:crypto";
import { createAuditLog } from "../lib/audit";
import { AppError } from "../lib/errors";
import {
  buildGoogleOAuthStartUrl,
  changeAuthenticatedUserPassword,
  completeGoogleOAuth,
  createGoogleOAuthTicketFromCallback,
  getAuthenticatedUser,
  getGoogleOAuthStatus,
  getGoogleOAuthTicketPreview,
  loginUser,
  registerOwnerUser,
  registerStudentUser,
  requestPasswordReset,
  resetPasswordWithToken,
  updateAuthenticatedUserProfile,
} from "../services/auth.service";
import {
  changePasswordBodySchema,
  forgotPasswordBodySchema,
  googleOAuthCallbackQuerySchema,
  googleOAuthCompleteBodySchema,
  googleOAuthStartQuerySchema,
  googleOAuthStatusQuerySchema,
  googleOAuthTicketQuerySchema,
  loginBodySchema,
  ownerRegisterBodySchema,
  resetPasswordBodySchema,
  studentRegisterBodySchema,
  updateMeBodySchema,
} from "../validators/auth.validators";
import { env } from "../config/env";

const ACCESS_COOKIE_NAME = "lp_access";
const CSRF_COOKIE_NAME = "lp_csrf";
const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 10;

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

export async function forgotPasswordController(req: Request, res: Response) {
  const parsed = forgotPasswordBodySchema.parse(req.body);
  await requestPasswordReset(parsed);
  res.json({
    success: true,
    data: {
      message: "If an account exists with an email address, a reset link has been sent.",
    },
  });
}

export async function resetPasswordController(req: Request, res: Response) {
  const parsed = resetPasswordBodySchema.parse(req.body);
  await resetPasswordWithToken(parsed);
  clearAccessCookie(req, res);
  clearCsrfCookie(req, res);
  res.json({ success: true });
}

export async function studentRegisterController(req: Request, res: Response) {
  const parsed = studentRegisterBodySchema.parse(req.body);
  const user = await registerStudentUser({
    fullName: parsed.fullName,
    dateOfBirth: parsed.dateOfBirth || undefined,
    gender: parsed.gender || undefined,
    email: parsed.email || undefined,
    phone: parsed.phone || undefined,
    password: parsed.password,
    referralCode: parsed.referralCode || undefined,
  });

  const result = await loginUser({
    login: parsed.email || parsed.phone || user.studentCode || "",
    password: parsed.password,
  });

  setAccessCookie(req, res, result.accessToken);
  const csrfToken = ensureCsrfToken(req, res);
  res.status(201).json({ success: true, data: { user: result.user, csrfToken } });
}

export async function googleOAuthStatusController(req: Request, res: Response) {
  googleOAuthStatusQuerySchema.parse(req.query);
  res.json({ success: true, data: await getGoogleOAuthStatus() });
}

export async function googleOAuthStartController(req: Request, res: Response) {
  const parsed = googleOAuthStartQuerySchema.parse(req.query);
  const url = await buildGoogleOAuthStartUrl({
    role: parsed.role,
    next: parsed.next || undefined,
    library: parsed.library || undefined,
  });
  res.redirect(url);
}

export async function googleOAuthCallbackController(req: Request, res: Response) {
  try {
    const parsed = googleOAuthCallbackQuerySchema.parse(req.query);
    const result = await createGoogleOAuthTicketFromCallback(parsed);
    const target = new URL("/auth/google/complete", env.webAppUrl);
    target.searchParams.set("ticket", result.ticket);
    res.redirect(target.toString());
  } catch (error) {
    const target = new URL("/auth/google/complete", env.webAppUrl);
    target.searchParams.set("error", error instanceof Error ? error.message : "Google sign-in failed");
    res.redirect(target.toString());
  }
}

export async function googleOAuthTicketController(req: Request, res: Response) {
  const parsed = googleOAuthTicketQuerySchema.parse(req.query);
  const data = await getGoogleOAuthTicketPreview(parsed.ticket);
  res.json({ success: true, data });
}

export async function googleOAuthCompleteController(req: Request, res: Response) {
  const parsed = googleOAuthCompleteBodySchema.parse(req.body);
  const result = await completeGoogleOAuth({
    ticket: parsed.ticket,
    fullName: parsed.fullName || undefined,
    phone: parsed.phone || undefined,
    libraryName: parsed.libraryName || undefined,
    city: parsed.city || undefined,
  });

  await createAuditLog({
    actorUserId: result.user.id,
    libraryId: result.user.libraryIds[0] ?? null,
    action: "auth.google_oauth",
    entityType: "user",
    entityId: result.user.id,
    metadata: { role: result.user.role },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
  });

  setAccessCookie(req, res, result.accessToken);
  const csrfToken = ensureCsrfToken(req, res);
  res.json({ success: true, data: { user: result.user, csrfToken, next: result.next } });
}

export async function ownerRegisterController(req: Request, res: Response) {
  const parsed = ownerRegisterBodySchema.parse(req.body);
  const user = await registerOwnerUser({
    fullName: parsed.fullName,
    libraryName: parsed.libraryName,
    email: parsed.email || undefined,
    phone: parsed.phone || undefined,
    city: parsed.city || undefined,
    password: parsed.password,
    referralCode: parsed.referralCode || undefined,
  });

  const result = await loginUser({
    login: parsed.email || parsed.phone || user.email || user.phone || "",
    password: parsed.password,
  });

  await createAuditLog({
    actorUserId: result.user.id,
    libraryId: result.user.libraryIds[0] ?? null,
    action: "auth.owner_register",
    entityType: "user",
    entityId: result.user.id,
    metadata: { role: result.user.role, libraryName: parsed.libraryName },
    ipAddress: req.ip,
    userAgent: req.header("user-agent") ?? null,
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
    dateOfBirth: parsed.dateOfBirth || undefined,
    gender: parsed.gender || undefined,
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
