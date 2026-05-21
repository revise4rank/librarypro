import { NextRequest, NextResponse } from "next/server";

const DEFAULT_UPSTREAM_ORIGIN = "https://api.booklib.in";
const ACCESS_COOKIE_NAME = "lp_access";
const CSRF_COOKIE_NAME = "lp_csrf";
const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 10;

function getCookieDomain(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const normalizedHost = host.toLowerCase().split(":")[0];
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

function getUpstreamOrigin() {
  const configured =
    process.env.API_PROXY_TARGET ??
    process.env.NEXT_PUBLIC_API_URL ??
    DEFAULT_UPSTREAM_ORIGIN;

  const normalized = configured.replace(/\/$/, "");
  return normalized.endsWith("/v1") ? normalized.slice(0, -3) : normalized;
}

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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.text();
  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(`${getUpstreamOrigin()}/v1/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "AUTH_UPSTREAM_UNREACHABLE",
          message: "Login service is not reachable. Please try again in a moment.",
        },
      },
      { status: 503 },
    );
  }

  const payload = (await upstreamResponse.json()) as UpstreamLoginResponse;
  const response = NextResponse.json(payload, { status: upstreamResponse.status });

  if (!upstreamResponse.ok || !payload.success) {
    return response;
  }

  const upstreamCookies = getUpstreamSetCookies(upstreamResponse);
  const accessToken = readCookieValue(upstreamCookies, ACCESS_COOKIE_NAME);
  const csrfToken = readCookieValue(upstreamCookies, CSRF_COOKIE_NAME) ?? payload.data?.csrfToken ?? null;
  const secure = isSecure(request);
  const domain = getCookieDomain(request);

  if (accessToken) {
    response.cookies.set({
      name: ACCESS_COOKIE_NAME,
      value: accessToken,
      httpOnly: true,
      sameSite: "lax",
      secure,
      domain,
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
      domain,
      path: "/",
      maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
    });
  }

  return response;
}
