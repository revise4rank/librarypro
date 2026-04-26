import rateLimit from "express-rate-limit";
import { createClient, type RedisClientType } from "redis";
import { RedisStore } from "rate-limit-redis";
import { env } from "../config/env";

let redisClient: RedisClientType | null = null;

function getRedisStore(prefix: string) {
  if (!env.redisUrl) {
    return undefined;
  }

  if (!redisClient) {
    redisClient = createClient({ url: env.redisUrl });
    redisClient.on("error", (error) => {
      console.error("Rate limit Redis client error", error);
    });
    void redisClient.connect().catch((error) => {
      console.error("Rate limit Redis connection failed", error);
    });
  }

  return new RedisStore({
    prefix,
    sendCommand: (...args: string[]) => redisClient!.sendCommand(args),
  });
}

export const apiRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: getRedisStore("rl:api:"),
  skip: (req) =>
    req.method === "GET" &&
    (req.path.startsWith("/v1/public/") || req.path === "/v1/offers" || req.path === "/v1/offers/categories"),
});

export const publicReadRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 2_000,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: getRedisStore("rl:public:"),
});

export const authRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: getRedisStore("rl:auth:"),
});
