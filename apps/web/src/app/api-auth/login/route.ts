import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_LOGIN_URL = "https://librarypro-api.onrender.com/v1/auth/login";
const ACCESS_COOKIE_NAME = "lp_access";
const CSRF_COOKIE_NAME = "lp_csrf";
const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 15;

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
  const upstreamResponse = await fetch(UPSTREAM_LOGIN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body,
    cache: "no-store",
  });

  const payload = (await upstreamResponse.json()) as UpstreamLoginResponse;
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
