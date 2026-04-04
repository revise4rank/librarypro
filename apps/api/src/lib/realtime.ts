import type { Server as HttpServer } from "node:http";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { Server } from "socket.io";
import { env } from "../config/env";
import { verifyAccessToken } from "./auth";

type RealtimeEventName =
  | "notification.created"
  | "seat.updated"
  | "payment.updated"
  | "student.updated";

let io: Server | null = null;

function readCookie(headerValue: string | string[] | undefined, name: string) {
  const rawHeader = Array.isArray(headerValue) ? headerValue.join(";") : headerValue;
  if (!rawHeader) {
    return null;
  }

  for (const cookie of rawHeader.split(";")) {
    const [rawKey, ...rawValue] = cookie.trim().split("=");
    if (rawKey !== name) {
      continue;
    }

    return decodeURIComponent(rawValue.join("="));
  }

  return null;
}

export async function initializeRealtimeServer(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }

        try {
          const parsed = new URL(origin);
          const host = parsed.hostname.toLowerCase();
          const webAppHost = env.webAppUrl.replace(/^https?:\/\//, "").split(":")[0].toLowerCase();
          if (
            host === webAppHost ||
            host === env.baseDomain.toLowerCase() ||
            host.endsWith(`.${env.baseDomain.toLowerCase()}`) ||
            host === "localhost" ||
            host === "127.0.0.1"
          ) {
            return callback(null, true);
          }
        } catch {
          // Fall through to reject below.
        }

        return callback(new Error("Origin not allowed"));
      },
      credentials: true,
    },
  });

  if (env.redisUrl) {
    const pubClient = createClient({ url: env.redisUrl });
    const subClient = pubClient.duplicate();
    await pubClient.connect();
    await subClient.connect();
    io.adapter(createAdapter(pubClient, subClient));
    console.info("Realtime adapter: Redis");
  } else {
    console.info("Realtime adapter: in-memory");
  }

  io.use((socket, next) => {
    try {
      const raw =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization ||
        readCookie(socket.handshake.headers.cookie, "lp_access");
      if (!raw || typeof raw !== "string") {
        return next(new Error("Authentication required"));
      }

      const token = raw.startsWith("Bearer ") ? raw.slice(7) : raw;
      const auth = verifyAccessToken(token);
      socket.data.auth = auth;
      return next();
    } catch {
      return next(new Error("Invalid socket token"));
    }
  });

  io.on("connection", (socket) => {
    const auth = socket.data.auth as {
      userId: string;
      role: string;
      libraryIds: string[];
    };

    socket.join(`user:${auth.userId}`);
    socket.join(`role:${auth.role}`);
    for (const libraryId of auth.libraryIds) {
      socket.join(`library:${libraryId}`);
    }

    socket.emit("realtime.ready", {
      userId: auth.userId,
      role: auth.role,
      libraryIds: auth.libraryIds,
      connectedAt: new Date().toISOString(),
    });
  });

  return io;
}

function getIo() {
  return io;
}

export function emitLibraryEvent(libraryId: string, event: RealtimeEventName, payload: Record<string, unknown>) {
  getIo()?.to(`library:${libraryId}`).emit(event, payload);
}

export function emitUserEvent(userId: string, event: RealtimeEventName, payload: Record<string, unknown>) {
  getIo()?.to(`user:${userId}`).emit(event, payload);
}
