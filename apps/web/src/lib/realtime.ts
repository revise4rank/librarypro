"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getRealtimeSocket() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!socket) {
    const configuredTarget = process.env.NEXT_PUBLIC_WS_URL?.replace(/^ws/, "http");
    if (!configuredTarget) {
      return null;
    }

    socket = io(configuredTarget, {
      transports: ["polling"],
      withCredentials: true,
      auth: {},
    });
  }

  return socket;
}
