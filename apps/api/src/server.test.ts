import { once } from "node:events";
import http from "node:http";
import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const { createServer } = await import("./server");

test("health endpoint reports ok", async () => {
  const app = createServer();
  const server = http.createServer(app);
  server.listen(0);
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to resolve server address.");
  }

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    const json = (await response.json()) as { ok: boolean };

    assert.equal(response.status, 200);
    assert.equal(json.ok, true);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("ready endpoint reports dependency check status", async () => {
  const app = createServer();
  const server = http.createServer(app);
  server.listen(0);
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to resolve server address.");
  }

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/ready`);
    const json = (await response.json()) as {
      ok: boolean;
      checks: { database: { ok: boolean; detail?: string } };
    };

    assert.equal(typeof json.ok, "boolean");
    assert.equal(typeof json.checks.database.ok, "boolean");
    assert.ok(response.status === 200 || response.status === 503);
    assert.equal(response.status === 200, json.ok);
  } finally {
    server.close();
    await once(server, "close");
  }
});
