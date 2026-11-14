import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import { request } from "../../scripts/auth-rehearsal.mjs";

test("Auth test transport handles empty logout replies and keeps its response limit", async (t) => {
  const server = createServer((req, res) => {
    if (req.url === "/logout") res.writeHead(204).end();
    else if (req.url === "/large") res.end("x".repeat(65537));
    else res.setHeader("Content-Type", "application/json").end('{"ok":true}');
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = () => `http://127.0.0.1:${server.address().port}`;
  assert.deepEqual(await request(origin, "/logout", { method: "POST" }), {
    status: 204,
    data: null,
  });
  assert.deepEqual(await request(origin, "/user"), {
    status: 200,
    data: { ok: true },
  });
  await assert.rejects(request(origin, "/large"), {
    message: "Auth test response too large",
  });
});
