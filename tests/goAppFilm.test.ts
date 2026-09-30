import { test } from "node:test";
import assert from "node:assert/strict";
import { GO_MS, GO_STEPS, GO_TASKS } from "../lib/goAppFilm.ts";
import { claimsAction } from "../lib/ask.ts";

test("the ONE GO app film runs about a minute", () => {
  assert.ok(GO_MS >= 50000 && GO_MS <= 80000, String(GO_MS));
});

test("calls and texts made from the app check themselves off; the rest are ticked by the agent", () => {
  const called = GO_STEPS.find((s) => s.id === "called")!;
  assert.deepEqual(called.done, ["jen"]);
  for (const id of called.done) assert.ok(GO_TASKS.find((t) => t.id === id)!.auto, id);
  const manual = GO_STEPS.find((s) => s.id === "ticks")!.done.filter((id) => !GO_TASKS.find((t) => t.id === id)!.auto);
  assert.ok(manual.length > 0);
});

test("the score only climbs, and every task named is real", () => {
  for (let i = 1; i < GO_STEPS.length; i++) assert.ok(GO_STEPS[i].points >= GO_STEPS[i - 1].points, GO_STEPS[i].id);
  const ids = new Set(GO_TASKS.map((t) => t.id));
  for (const s of GO_STEPS) for (const d of s.done) assert.ok(ids.has(d), d);
});

test("honest captions, ending on Part of ONE", () => {
  for (const s of GO_STEPS) assert.ok(!claimsAction(`${s.title} ${s.line}`), s.id);
  assert.match(GO_STEPS.at(-1)!.title, /Part of ONE\.$/);
});
