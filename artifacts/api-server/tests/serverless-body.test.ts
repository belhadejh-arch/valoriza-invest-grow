import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import serverless from "serverless-http";
import { createJsonBodyParser } from "../../../.migration-backup/backend/src/json-body.js";

const credentials = {
  email: "admin@example.invalid",
  password: "  test-password-أ123  ",
};

function application(preparsed?: unknown) {
  const app = express();
  if (preparsed !== undefined) {
    app.use((request, _response, next) => {
      request.body = preparsed;
      next();
    });
  }
  app.use(createJsonBodyParser());
  app.post("/api/auth/login", (request, response) => {
    response.json({ received: request.body });
  });
  app.use((error: { status?: number }, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    response.status(error.status ?? 500).json({ error: "INVALID_JSON" });
  });
  return app;
}

async function invoke(body: string, options: { base64?: boolean; preparsed?: unknown } = {}) {
  const result = await serverless(application(options.preparsed))({
    httpMethod: "POST",
    path: "/api/auth/login",
    headers: { "content-type": "application/json" },
    body: options.base64 ? Buffer.from(body).toString("base64") : body,
    isBase64Encoded: options.base64 ?? false,
    requestContext: { identity: { sourceIp: "127.0.0.1" } },
  }, {} as never);
  return { status: result.statusCode, body: JSON.parse(result.body) };
}

test("Netlify raw JSON reaches the login handler without changing credentials", async () => {
  const result = await invoke(JSON.stringify(credentials));
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.received, credentials);
});

test("Netlify base64 JSON preserves password spaces and Unicode", async () => {
  const result = await invoke(JSON.stringify(credentials), { base64: true });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.received, credentials);
});

test("Vercel's already-parsed request body is preserved", async () => {
  const result = await invoke("", { preparsed: credentials });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.received, credentials);
});

test("malformed Netlify JSON is rejected rather than treated as credentials", async () => {
  const result = await invoke('{"email":');
  assert.equal(result.status, 400);
  assert.equal(result.body.error, "INVALID_JSON");
});

test("ordinary HTTP JSON is parsed using the same middleware", async () => {
  const server = application().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).received, credentials);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
