import { test } from "node:test";
import assert from "node:assert/strict";
import { GUIDES, STEPS_VERSION, clock, itemKey, readAgents, readCalls, saveBody, stepDone, totalItems } from "../lib/reviewCalls.ts";

test("the copied guide has both calls, version 1", () => {
  assert.equal(STEPS_VERSION, 1);
  assert.equal(GUIDES.site.title, "Website review call");
  assert.ok(GUIDES.soi.steps.length >= 5);
  assert.equal(totalItems("site"), GUIDES.site.steps.reduce((n, s) => n + s.items.length, 0));
});

test("ticks, step counts and the save body match ONE MOVE's shape", () => {
  const ticks = new Set([itemKey(0, 0), itemKey(0, 1), itemKey(2, 3), "junk"]);
  assert.equal(stepDone("site", 0, ticks), 2);
  const b = saveBody("agent-1", "site", ticks, { 0: "  went well ", 3: "   " }, 125.6);
  assert.deepEqual(b.ticks, ["0.0", "0.1", "2.3"]);
  assert.deepEqual(b.notes, { "0": "went well" });
  assert.equal(b.duration_sec, 126);
  assert.equal(clock(65), "1:05");
  assert.equal(clock(3725), "1:02:05");
});

test("readers check shapes", () => {
  assert.deepEqual(readAgents({ agents: [{ user_id: "u1", name: "Jen", addons: ["site_build", 3] }, { name: "no id" }] }), [{ id: "u1", name: "Jen", plan: null, addons: ["site_build"] }]);
  assert.equal(readAgents({}), null);
  const c = readCalls({ calls: [
    { id: "c1", kind: "site", created_at: "2026-10-07T10:00:00Z", ticked: [1, 2], unticked: [3], duration_sec: 600, notes: { Open: "ok", Empty: " " } },
    { id: "c2", kind: "soi", created_at: "2026-10-08T10:00:00Z", ticked: [], unticked: [] },
    { id: "c3", kind: "bad", created_at: "2026-10-08T10:00:00Z" },
  ] })!;
  assert.deepEqual(c.map((x) => x.id), ["c2", "c1"]);
  assert.equal(c[1].ticked, 2);
  assert.equal(c[1].total, 3);
  assert.deepEqual(c[1].notes, { Open: "ok" });
});
