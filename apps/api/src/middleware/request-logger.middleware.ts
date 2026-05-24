import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();
  const requestId = randomUUID();
  const traceParent = req.header("traceparent") ?? null;
  const traceId = traceParent?.split("-")[1] ?? null;
  res.setHeader("x-request-id", requestId);
  if (traceId) {
    res.setHeader("x-trace-id", traceId);
  }

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const auth = (req as Request & { auth?: { userId: string; role: string } }).auth;
    const tenant = (req as Request & { tenant?: { libraryId: string; slug: string } }).tenant;

    console.info(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "info",
        msg: "request.completed",
        requestId,
        traceId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
        userId: auth?.userId ?? null,
        role: auth?.role ?? null,
        libraryId: tenant?.libraryId ?? null,
        tenantSlug: tenant?.slug ?? null,
      }),
    );
  });
  next();
}
