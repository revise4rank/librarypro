import assert from "node:assert/strict";
import { once } from "node:events";
import http from "node:http";
import test from "node:test";
import express from "express";
import { csrfProtectionMiddleware } from "./csrf.middleware";

function createCsrfTestServer() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.auth = {
      userId: "user-1",
      role: "LIBRARY_OWNER",
      libraryIds: ["library-1"],
      sessionVersion: 1,
    };
    next();
  });
  app.use(csrfProtectionMiddleware);
  app.get("/probe", (_req, res) => {
    res.json({ ok: true });
  });
  app.post("/probe", (_req, res) => {
    res.json({ ok: true });
  });
  return http.createServer(app);
}

test("csrf middleware allows safe requests without csrf header", async () => {
  const server = createCsrfTestServer();
  server.listen(0);
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to resolve server address.");
  }

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/probe`);
    assert.equal(response.status, 200);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("csrf middleware blocks cookie-authenticated mutating requests without csrf header", async () => {
  const server = createCsrfTestServer();
  server.listen(0);
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to resolve server address.");
  }

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/probe`, {
      method: "POST",
      headers: {
        Cookie: "lp_access=test-token; lp_csrf=test-csrf",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hello: "world" }),
    });

    assert.equal(response.status, 403);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("csrf middleware allows cookie-authenticated mutating requests with matching csrf header", async () => {
  const server = createCsrfTestServer();
  server.listen(0);
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to resolve server address.");
  }

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/probe`, {
      method: "POST",
      headers: {
        Cookie: "lp_access=test-token; lp_csrf=test-csrf",
        "X-CSRF-Token": "test-csrf",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hello: "world" }),
    });

    assert.equal(response.status, 200);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("csrf middleware allows bearer-only mutating requests without csrf header", async () => {
  const server = createCsrfTestServer();
  server.listen(0);
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to resolve server address.");
  }

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/probe`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hello: "world" }),
    });

    assert.equal(response.status, 200);
  } finally {
    server.close();
    await once(server, "close");
  }
});
