import { createClient, type RedisClientType } from "redis";
import { env } from "../config/env";

let redisClient: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType | null> | null = null;

const memoryCache = new Map<string, { value: string; expiresAt: number }>();

export async function getRedisClient() {
  if (!env.redisUrl) {
    return null;
  }

  if (redisClient?.isOpen) {
    return redisClient;
  }

  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = (async () => {
    try {
      redisClient = createClient({ url: env.redisUrl });
      redisClient.on("error", (error) => {
        console.warn("Redis cache error", error);
      });
      await redisClient.connect();
      return redisClient;
    } catch (error) {
      console.warn("Redis cache unavailable", error);
      redisClient = null;
      return null;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
}

export async function getCacheJson<T>(key: string) {
  const redis = await getRedisClient();
  if (redis) {
    const cached = await redis.get(key);
    return cached ? (JSON.parse(cached) as T) : null;
  }

  const current = memoryCache.get(key);
  if (!current) {
    return null;
  }
  if (current.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return JSON.parse(current.value) as T;
}

export async function setCacheJson(key: string, value: unknown, ttlMs: number) {
  const serialized = JSON.stringify(value);
  const redis = await getRedisClient();
  if (redis) {
    await redis.setEx(key, Math.max(1, Math.ceil(ttlMs / 1000)), serialized);
    return;
  }

  memoryCache.set(key, {
    value: serialized,
    expiresAt: Date.now() + ttlMs,
  });
}

export async function deleteCacheKeys(keys: string[]) {
  if (keys.length === 0) {
    return;
  }

  const redis = await getRedisClient();
  if (redis) {
    await redis.del(keys).catch(() => undefined);
  }

  for (const key of keys) {
    memoryCache.delete(key);
  }
}

export async function deleteCacheByPrefixes(prefixes: string[]) {
  if (prefixes.length === 0) {
    return;
  }

  const redis = await getRedisClient();
  if (redis) {
    for (const prefix of prefixes) {
      const matches = await redis.keys(`${prefix}*`).catch(() => []);
      if (matches.length > 0) {
        await redis.del(matches).catch(() => undefined);
      }
    }
  }

  for (const key of memoryCache.keys()) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      memoryCache.delete(key);
    }
  }
}

export function getLeaderboardCached<T>(cacheKey: string) {
  const current = memoryCache.get(cacheKey);
  if (!current || current.expiresAt < Date.now()) {
    if (current) {
      memoryCache.delete(cacheKey);
    }
    return null;
  }
  return JSON.parse(current.value) as T;
}

export function setLeaderboardCached(cacheKey: string, value: unknown, ttlMs: number) {
  memoryCache.set(cacheKey, {
    value: JSON.stringify(value),
    expiresAt: Date.now() + ttlMs,
  });
}
