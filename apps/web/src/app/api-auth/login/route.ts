import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_LOGIN_URL = "https://librarypro-api.onrender.com/v1/auth/login";
const ACCESS_COOKIE_NAME = "lp_access";
const CSRF_COOKIE_NAME = "lp_csrf";
const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 15;

type UpstreamLoginResponse = {
  success: boolean;
  data?: {
    accessToken?: string;
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

  const accessToken = payload.data?.accessToken;
  const csrfToken = payload.data?.csrfToken;
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
