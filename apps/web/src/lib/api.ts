"use client";

const PRODUCTION_API_ORIGIN = "https://api.booklib.in";
const CLIENT_PROXY_ORIGIN = "/api-proxy";
const CLIENT_AUTH_LOGIN_PATH = "/api-auth/login";
const CLIENT_AUTH_LOGOUT_PATH = "/api-auth/logout";

function getDefaultApiOrigin() {
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (hostname === "localhost") {
      return `${protocol}//localhost:4000`;
    }
    if (hostname === "127.0.0.1") {
      return `${protocol}//127.0.0.1:4000`;
    }

    return CLIENT_PROXY_ORIGIN;
  }

  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || PRODUCTION_API_ORIGIN;
}

export const API_URL = (() => {
  const raw =
    typeof window !== "undefined"
      ? getDefaultApiOrigin()
      : process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || getDefaultApiOrigin();
  return raw.endsWith("/v1") ? raw : `${raw}/v1`;
})();

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function isPlanAccessError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === "PLAN_FEATURE_REQUIRED";
}

export function displayApiError(error: unknown, fallback: string) {
  if (isPlanAccessError(error)) {
    return `${error.message} Open Billing to compare plans and upgrade.`;
  }
  return error instanceof Error ? error.message : fallback;
}

export type SessionUser = {
  id: string;
  fullName: string;
  studentCode?: string | null;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  role: string;
  libraryIds: string[];
};

export type SessionState = {
  user: SessionUser;
  csrfToken?: string;
};

const SESSION_KEY = "booklib_session";
const COOKIE_ROLE = "lp_role";
const COOKIE_SESSION = "lp_session";
const LEGACY_COOKIE_TOKEN = "lp_token";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 10;

function getPrimaryStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getSecondaryStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, maxAgeSeconds?: number) {
  if (typeof document === "undefined") return;
  const maxAgePart = typeof maxAgeSeconds === "number" ? `; Max-Age=${maxAgeSeconds}` : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/${maxAgePart}; SameSite=Lax`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  for (const cookie of document.cookie.split(";")) {
    const [rawKey, ...rawValue] = cookie.trim().split("=");
    if (rawKey !== name) {
      continue;
    }
    return decodeURIComponent(rawValue.join("="));
  }

  return null;
}

export function getApiBaseUrl() {
  const raw =
    typeof window !== "undefined"
      ? getDefaultApiOrigin()
      : process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || getDefaultApiOrigin();
  return raw.endsWith("/v1") ? raw.slice(0, -3) : raw;
}

export function getAuthHeaders(method = "GET", initHeaders?: HeadersInit) {
  const headers = new Headers(initHeaders ?? {});
  const normalizedMethod = method.toUpperCase();
  const session = readSession();
  const csrfToken = readCookie("lp_csrf") ?? session?.csrfToken;

  if (!["GET", "HEAD", "OPTIONS"].includes(normalizedMethod) && csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  return headers;
}

function updateStoredCsrfToken(csrfToken?: string | null) {
  if (!csrfToken) return;
  const session = readSession();
  if (!session?.user || session.csrfToken === csrfToken) return;
  saveSession({ user: session.user, csrfToken });
}

export function saveSession(session: SessionState) {
  const payload = JSON.stringify({
    user: session.user,
    csrfToken: session.csrfToken,
  } satisfies SessionState);
  const storage = getPrimaryStorage();
  const secondaryStorage = getSecondaryStorage();
  storage?.setItem(SESSION_KEY, payload);
  secondaryStorage?.setItem(SESSION_KEY, payload);
  setCookie(COOKIE_ROLE, session.user.role, SESSION_MAX_AGE_SECONDS);
  setCookie(COOKIE_SESSION, "1", SESSION_MAX_AGE_SECONDS);
  clearCookie(LEGACY_COOKIE_TOKEN);
}

export function clearSession() {
  getPrimaryStorage()?.removeItem(SESSION_KEY);
  getSecondaryStorage()?.removeItem(SESSION_KEY);
  clearCookie(COOKIE_ROLE);
  clearCookie(COOKIE_SESSION);
  clearCookie(LEGACY_COOKIE_TOKEN);
}

export function clearClientSession() {
  clearSession();
}

export async function logoutSession() {
  try {
    await fetch(CLIENT_AUTH_LOGOUT_PATH, {
      method: "POST",
      headers: getAuthHeaders("POST"),
      credentials: "include",
    });
  } catch {
    // Best-effort server logout. Client cleanup still happens below.
  } finally {
    clearSession();
  }
}

export function readSession(): SessionState | null {
  const storage = getPrimaryStorage();
  const secondaryStorage = getSecondaryStorage();
  const raw = storage?.getItem(SESSION_KEY) ?? secondaryStorage?.getItem(SESSION_KEY) ?? null;
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as SessionState;
    if (storage && storage.getItem(SESSION_KEY) !== raw) {
      storage.setItem(SESSION_KEY, raw);
    }
    return session;
  } catch {
    return null;
  }
}

async function refreshCsrfTokenFromServer() {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    return false;
  }

  const json = await response.json().catch(() => null);
  const data = json?.data;
  const csrfToken = data?.csrfToken ?? readCookie("lp_csrf") ?? undefined;
  if (!data?.id || !csrfToken) {
    updateStoredCsrfToken(csrfToken);
    return Boolean(csrfToken);
  }

  saveSession({
    user: {
      id: data.id,
      fullName: data.fullName,
      studentCode: "studentCode" in data ? data.studentCode : undefined,
      email: data.email,
      phone: data.phone,
      role: data.role,
      libraryIds: data.libraryIds,
    },
    csrfToken,
  });
  return true;
}

export async function hydrateSessionFromServer() {
  const existing = readSession();
  if (existing?.user) {
    return existing;
  }

  try {
    const result = await apiFetch<{
      success: boolean;
      data: SessionUser & { sessionVersion: number; csrfToken?: string };
    }>("/auth/me", undefined, false);

    const hydrated = {
      user: {
        id: result.data.id,
        fullName: result.data.fullName,
        studentCode: "studentCode" in result.data ? result.data.studentCode : undefined,
        email: result.data.email,
        phone: result.data.phone,
        role: result.data.role,
        libraryIds: result.data.libraryIds,
      },
      csrfToken: result.data.csrfToken ?? readCookie("lp_csrf") ?? undefined,
    } satisfies SessionState;

    saveSession(hydrated);
    return hydrated;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit, auth = true, retryOnCsrf = true): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = getAuthHeaders(method, init?.headers);
  if (!(init?.body instanceof FormData)) {
    headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
  }

  let response: Response;
  try {
    const target = path === "/auth/login" ? CLIENT_AUTH_LOGIN_PATH : `${API_URL}${path}`;
    response = await fetch(target, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    throw new Error("A network issue occurred. If the server is running, refresh the page and try again.");
  }

  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    if (!response.ok) {
      throw new Error(`Server returned non-JSON response (${response.status}). Please refresh and try again.`);
    }
    throw new Error("Unexpected server response. Please refresh and try again.");
  }

  if (!response.ok) {
    const code = typeof json?.error?.code === "string" ? json.error.code : undefined;
    const message = json?.error?.message ?? "Request failed";

    if (auth && response.status === 403 && code === "CSRF_INVALID" && retryOnCsrf) {
      const refreshed = await refreshCsrfTokenFromServer().catch(() => false);
      if (refreshed) {
        return apiFetch<T>(path, init, auth, false);
      }
    }

    if (auth) {
      if (response.status === 402 && typeof window !== "undefined") {
        const next = `${window.location.pathname}${window.location.search}`;
        if (!window.location.pathname.startsWith("/owner/billing")) {
          window.location.href = `/owner/billing?next=${encodeURIComponent(next)}`;
        }
      }

      if (response.status === 401 || (response.status === 403 && code !== "PLAN_FEATURE_REQUIRED" && code !== "CSRF_INVALID")) {
        clearSession();
      }
    }
    throw new ApiError(message, response.status, code);
  }

  if (auth) {
    updateStoredCsrfToken(json?.data?.csrfToken ?? readCookie("lp_csrf"));
  }

  return json as T;
}

export function dashboardPathForRole(role: string) {
  if (role === "LIBRARY_OWNER") return "/owner/dashboard";
  if (role === "SUPER_ADMIN") return "/superadmin/dashboard";
  return "/student/dashboard";
}
