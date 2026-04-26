import { NextRequest, NextResponse } from "next/server";

const DEFAULT_UPSTREAM_ORIGIN = "https://librarypro-api.onrender.com";
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function getUpstreamOrigin() {
  const configured =
    process.env.API_PROXY_TARGET ??
    process.env.NEXT_PUBLIC_API_URL ??
    DEFAULT_UPSTREAM_ORIGIN;

  const normalized = configured.replace(/\/$/, "");
  return normalized.endsWith("/v1") ? normalized.slice(0, -3) : normalized;
}

function buildUpstreamUrl(pathSegments: string[], search: string) {
  const joinedPath = pathSegments.join("/");
  return `${getUpstreamOrigin()}/${joinedPath}${search}`;
}

function buildUpstreamHeaders(request: NextRequest) {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      return;
    }

    if (key.toLowerCase() === "origin") {
      return;
    }

    headers.set(key, value);
  });

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    headers.set("x-forwarded-for", forwardedFor);
  }

  return headers;
}

function buildClientHeaders(upstreamResponse: Response) {
  const headers = new Headers();

  upstreamResponse.headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (normalized === "content-encoding") {
      return;
    }
    if (normalized === "content-length") {
      return;
    }
    if (normalized.startsWith("access-control-allow-")) {
      return;
    }
    if (normalized === "set-cookie") {
      return;
    }

    headers.set(key, value);
  });

  const responseHeaders = upstreamResponse.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const rawSetCookie = upstreamResponse.headers.get("set-cookie");
  const setCookies =
    responseHeaders.getSetCookie?.() ??
    (rawSetCookie
      ? rawSetCookie.split(/,(?=[^;,\s]+=)/).map((cookie) => cookie.trim()).filter(Boolean)
      : []);
  if (setCookies.length > 0) {
    for (const cookie of setCookies) {
      const normalizedCookie = cookie
        .replace(/;\s*Domain=[^;]+/gi, "")
        .replace(/;\s*domain=[^;]+/gi, "");
      headers.append("set-cookie", normalizedCookie);
    }
  }

  return headers;
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const targetUrl = buildUpstreamUrl(path, request.nextUrl.search);
  const method = request.method.toUpperCase();
  const upstreamHeaders = buildUpstreamHeaders(request);

  const init: RequestInit = {
    method,
    headers: upstreamHeaders,
    redirect: "manual",
    cache: "no-store",
  };

  if (!["GET", "HEAD"].includes(method)) {
    init.body = await request.arrayBuffer();
    if (!upstreamHeaders.has("content-type") && request.headers.get("content-type")) {
      upstreamHeaders.set("content-type", request.headers.get("content-type") ?? "application/octet-stream");
    }
  }

  const upstreamResponse = await fetch(targetUrl, init);
  const body = method === "HEAD" ? null : await upstreamResponse.arrayBuffer();

  return new NextResponse(body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: buildClientHeaders(upstreamResponse),
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function OPTIONS(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}

export async function HEAD(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context);
}
