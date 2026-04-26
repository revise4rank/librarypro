import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_LOGOUT_URL = "https://librarypro-api.onrender.com/v1/auth/logout";
const ACCESS_COOKIE_NAME = "lp_access";
const CSRF_COOKIE_NAME = "lp_csrf";

function isSecure(request: NextRequest) {
  return request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const csrfToken = request.headers.get("x-csrf-token");
  const cookieHeader = request.headers.get("cookie");

  const upstreamResponse = await fetch(UPSTREAM_LOGOUT_URL, {
    method: "POST",
    headers: {
      ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    cache: "no-store",
  });

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
