import { NextRequest, NextResponse } from "next/server";

const DEFAULT_UPSTREAM_ORIGIN = "https://librarypro-api.onrender.com";
const ACCESS_COOKIE_NAME = "lp_access";
const CSRF_COOKIE_NAME = "lp_csrf";
const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 15;
const UPSTREAM_TIMEOUT_MS = 12_000;

type UpstreamLoginResponse = {
  success: boolean;
  data?: {
    csrfToken?: string;
    user?: {
      id: string;
      fullName: string;
      email?: string | null;
      phone?: string | null;
      role: string;
      libraryIds: string[];
    };
  };
  error?: {
    code?: string;
    message?: string;
  };
};

function getUpstreamSetCookies(response: Response) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const rawSetCookie = response.headers.get("set-cookie");
  return (
    headers.getSetCookie?.() ??
    (rawSetCookie
      ? rawSetCookie
          .split(/,(?=[^;,\s]+=)/)
          .map((cookie) => cookie.trim())
          .filter(Boolean)
      : [])
  );
}

function readCookieValue(cookies: string[], name: string) {
  for (const cookie of cookies) {
    const match = cookie.match(new RegExp(`${name}=([^;]+)`));
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

function isSecure(request: NextRequest) {
  return request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
}

function getUpstreamOrigin() {
  const configured =
    process.env.API_PROXY_TARGET ??
    process.env.NEXT_PUBLIC_API_URL ??
    DEFAULT_UPSTREAM_ORIGIN;

  const normalized = configured.replace(/\/$/, "");
  return normalized.endsWith("/v1") ? normalized.slice(0, -3) : normalized;
}

function getUpstreamLoginUrl() {
  return `${getUpstreamOrigin()}/v1/auth/login`;
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.text();
  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetchWithTimeout(getUpstreamLoginUrl(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "AUTH_UPSTREAM_UNAVAILABLE",
          message: "Login service is not reachable. Please try again in a moment.",
        },
      },
      { status: 503 },
    );
  }

  let payload: UpstreamLoginResponse;
  try {
    payload = (await upstreamResponse.json()) as UpstreamLoginResponse;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "AUTH_UPSTREAM_INVALID_RESPONSE",
          message: "Login service returned an unexpected response.",
        },
      },
      { status: 502 },
    );
  }
  const response = NextResponse.json(payload, { status: upstreamResponse.status });

  if (!upstreamResponse.ok || !payload.success) {
    return response;
  }

  const upstreamCookies = getUpstreamSetCookies(upstreamResponse);
  const accessToken = readCookieValue(upstreamCookies, ACCESS_COOKIE_NAME);
  const csrfToken = readCookieValue(upstreamCookies, CSRF_COOKIE_NAME) ?? payload.data?.csrfToken ?? null;
  const secure = isSecure(request);

  if (accessToken) {
    response.cookies.set({
      name: ACCESS_COOKIE_NAME,
      value: accessToken,
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
    });
  }

  if (csrfToken) {
    response.cookies.set({
      name: CSRF_COOKIE_NAME,
      value: csrfToken,
      httpOnly: false,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
    });
  }

  return response;
}
