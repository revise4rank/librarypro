import { NextRequest, NextResponse } from "next/server";

const DEFAULT_UPSTREAM_ORIGIN = "https://librarypro-api.onrender.com";
const ACCESS_COOKIE_NAME = "lp_access";
const CSRF_COOKIE_NAME = "lp_csrf";
const UPSTREAM_TIMEOUT_MS = 8_000;

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

function getUpstreamLogoutUrl() {
  return `${getUpstreamOrigin()}/v1/auth/logout`;
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
  const csrfToken = request.headers.get("x-csrf-token");
  const cookieHeader = request.headers.get("cookie");

  let response = NextResponse.json({ success: true });
  try {
    const upstreamResponse = await fetchWithTimeout(getUpstreamLogoutUrl(), {
      method: "POST",
      headers: {
        ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      cache: "no-store",
    });

    const text = await upstreamResponse.text();
    response = new NextResponse(text, {
      status: upstreamResponse.status,
      headers: {
        "content-type": upstreamResponse.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    response = NextResponse.json({ success: true });
  }

  const secure = isSecure(request);
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
  response.cookies.set({
    name: CSRF_COOKIE_NAME,
    value: "",
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });

  return response;
}
