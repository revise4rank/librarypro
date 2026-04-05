"use client";

const PRODUCTION_API_ORIGIN = "https://librarypro-api.onrender.com";

function getDefaultApiOrigin() {
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (hostname === "localhost") {
      return `${protocol}//localhost:4000`;
    }
    if (hostname === "127.0.0.1") {
      return `${protocol}//127.0.0.1:4000`;
    }

    return PRODUCTION_API_ORIGIN;
  }

  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || PRODUCTION_API_ORIGIN;
}

export const API_URL = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || getDefaultApiOrigin();
  return raw.endsWith("/v1") ? raw : `${raw}/v1`;
})();

export type SessionUser = {
  id: string;
  fullName: string;
  studentCode?: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
  libraryIds: string[];
};

export type SessionState = {
  user: SessionUser;
  csrfToken?: string;
  accessToken?: string;
};

const SESSION_KEY = "nextlib_session";
const COOKIE_ROLE = "lp_role";
const COOKIE_SESSION = "lp_session";
const LEGACY_COOKIE_TOKEN = "lp_token";

function getPrimaryStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return window.sessionStorage;
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
  const raw = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || getDefaultApiOrigin();
  return raw.endsWith("/v1") ? raw.slice(0, -3) : raw;
}

export function saveSession(session: SessionState) {
  const payload = JSON.stringify({
    user: session.user,
    csrfToken: session.csrfToken,
    accessToken: session.accessToken,
  } satisfies SessionState);
  const storage = getPrimaryStorage();
  const secondaryStorage = getSecondaryStorage();
  storage?.setItem(SESSION_KEY, payload);
  secondaryStorage?.setItem(SESSION_KEY, payload);
  setCookie(COOKIE_ROLE, session.user.role);
  setCookie(COOKIE_SESSION, "1");
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
    const session = readSession();
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: session?.accessToken
        ? {
            Authorization: `Bearer ${session.accessToken}`,
          }
        : undefined,
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
      accessToken: undefined,
    } satisfies SessionState;

    saveSession(hydrated);
    return hydrated;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit, auth = true): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  const method = (init?.method ?? "GET").toUpperCase();
  if (!(init?.body instanceof FormData)) {
    headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
  }

  if (auth) {
    const session = readSession();
    const csrfToken = session?.csrfToken ?? readCookie("lp_csrf");
    if (session?.accessToken) {
      headers.set("Authorization", `Bearer ${session.accessToken}`);
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    throw new Error("Network issue aaya. Server chal raha ho to page refresh karke dobara try karo.");
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
    if (auth) {
      if (response.status === 402 && typeof window !== "undefined") {
        const next = `${window.location.pathname}${window.location.search}`;
        if (!window.location.pathname.startsWith("/owner/billing")) {
          window.location.href = `/owner/billing?next=${encodeURIComponent(next)}`;
        }
      }

      if (response.status === 401 || response.status === 403) {
        clearSession();
      }
    }
    throw new Error(json?.error?.message ?? "Request failed");
  }

  return json as T;
}

export function dashboardPathForRole(role: string) {
  if (role === "LIBRARY_OWNER") return "/owner/dashboard";
  if (role === "SUPER_ADMIN") return "/superadmin/dashboard";
  return "/student/dashboard";
}
