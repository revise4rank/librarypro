"use client";

import { io, type Socket } from "socket.io-client";
import { getApiBaseUrl, readSession } from "./api";

let socket: Socket | null = null;

export function getRealtimeSocket() {
  if (typeof window === "undefined") {
    return null;
  }
  const session = readSession();

  if (!socket) {
    const target = process.env.NEXT_PUBLIC_WS_URL?.replace(/^ws/, "http") || getApiBaseUrl();
    socket = io(target, {
      transports: ["websocket"],
      withCredentials: true,
      auth: {},
    });
  }

  return socket;
}
