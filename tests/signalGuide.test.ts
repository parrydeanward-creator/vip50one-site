import { test } from "node:test";
import assert from "node:assert/strict";
import { GUIDE } from "../lib/signalGuide.ts";

test("every signal the Brain draws has a step, in the agent's order", () => {
  const demos = GUIDE.map((s) => s.demo);
  for (const d of ["breathe", "pulse-red", "pulse-yellow", "green", "count", "celebrate", "opportunity", "ping", "signal", "heartbeat", "arc", "locked"] as const) {
    assert.ok(demos.includes(d), `missing ${d}`);
  }
  assert.equal(new Set(demos).size, demos.length, "one step per signal");
  assert.equal(GUIDE[0].demo, "breathe", "starts with Pulse");
  assert.deepEqual(GUIDE.slice(1, 5).map((s) => s.demo), ["pulse-red", "pulse-yellow", "green", "count"], "then what needs you");
});

test("the colours match the rule: red right now, yellow today, green all good", () => {
  const by = Object.fromEntries(GUIDE.map((s) => [s.demo, s]));
  assert.match(by["pulse-red"].title, /red: right now/);
  assert.match(by["pulse-yellow"].title, /yellow: today/);
  assert.match(by.green.title, /green ring: all good/);
});

test("plain words, short enough for a phone", () => {
  for (const s of GUIDE) {
    assert.ok(s.title.length <= 48, s.title);
    assert.ok(s.line.length <= 320, s.title);
  }
});
