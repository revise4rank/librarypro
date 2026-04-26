"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;
const PRODUCTION_API_ORIGIN = "https://librarypro-api.onrender.com";

export function getRealtimeSocket() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!socket) {
    const target =
      process.env.NEXT_PUBLIC_WS_URL?.replace(/^ws/, "http") ||
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/v1$/, "").replace(/\/$/, "") ||
      PRODUCTION_API_ORIGIN;
    socket = io(target, {
      transports: ["websocket"],
      withCredentials: true,
      auth: {},
    });
  }

  return socket;
}
