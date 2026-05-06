import { NextRequest, NextResponse } from "next/server";

const DEFAULT_UPSTREAM_ORIGIN = "https://api.booklib.in";
const ACCESS_COOKIE_NAME = "lp_access";
const CSRF_COOKIE_NAME = "lp_csrf";

function getUpstreamOrigin() {
  const configured =
    process.env.API_PROXY_TARGET ??
    process.env.NEXT_PUBLIC_API_URL ??
    DEFAULT_UPSTREAM_ORIGIN;

  const normalized = configured.replace(/\/$/, "");
  return normalized.endsWith("/v1") ? normalized.slice(0, -3) : normalized;
}

function isSecure(request: NextRequest) {
  return request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const csrfToken = request.headers.get("x-csrf-token");
  const cookieHeader = request.headers.get("cookie");

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(`${getUpstreamOrigin()}/v1/auth/logout`, {
      method: "POST",
      headers: {
        ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    upstreamResponse = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const text = await upstreamResponse.text();
  const response = new NextResponse(text, {
    status: upstreamResponse.status,
    headers: {
      "content-type": upstreamResponse.headers.get("content-type") ?? "application/json",
    },
  });

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
