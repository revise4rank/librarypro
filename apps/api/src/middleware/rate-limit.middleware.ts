import rateLimit from "express-rate-limit";

export const apiRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.method === "GET" &&
    (req.path.startsWith("/v1/public/") || req.path === "/v1/offers" || req.path === "/v1/offers/categories"),
});

export const publicReadRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120_000,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
