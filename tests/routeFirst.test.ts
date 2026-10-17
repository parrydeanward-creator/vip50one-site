import { test } from "node:test";
import assert from "node:assert/strict";
import { readRoute } from "../lib/routeFirst.ts";

const answer = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;
const read = (j: unknown) => ((j as { people?: unknown[] }).people ? (j as { people: unknown[] }).people.length : null);

test("ONE MOVE's route first: the fallback only when the route is not there (404, 405 or no answer)", async () => {
  assert.deepEqual(await readRoute("u", read, answer(200, { people: [1, 2] })), { kind: "data", data: 2 });
  assert.deepEqual(await readRoute("u", read, answer(404, {})), { kind: "missing" });
  assert.deepEqual(await readRoute("u", read, answer(405, {})), { kind: "missing" });
  const down = (async () => { throw new TypeError("no CORS"); }) as typeof fetch;
  assert.deepEqual(await readRoute("u", read, down), { kind: "missing" });
  // signed out, a 500 or a wrong shape: keep what the orb had, never a list built another way
  assert.deepEqual(await readRoute("u", read, answer(401, {})), { kind: "error" });
  assert.deepEqual(await readRoute("u", read, answer(500, {})), { kind: "error" });
  assert.deepEqual(await readRoute("u", read, answer(200, { nope: 1 })), { kind: "error" });
});
