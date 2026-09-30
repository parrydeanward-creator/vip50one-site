import { test } from "node:test";
import assert from "node:assert/strict";
import { MARQUEE_STEPS, MOVE_STEPS, OPEN_STEPS, SHOWLY_STEPS, totalShowMs } from "../lib/showcase.ts";
import { claimsAction } from "../lib/ask.ts";

const FILMS = { open: OPEN_STEPS, showly: SHOWLY_STEPS, move: MOVE_STEPS, marquee: MARQUEE_STEPS };

test("each showcase film runs about a minute and ends on a bare outro", () => {
  for (const [name, steps] of Object.entries(FILMS)) {
    const ms = totalShowMs(steps);
    assert.ok(ms >= 50000 && ms <= 85000, `${name} ${ms}`);
    assert.equal(steps.at(-1)!.id, "outro", name);
    assert.equal(new Set(steps.map((s) => s.id)).size, steps.length, `${name} ids unique`);
  }
});

test("every film shows ONE Brain, and every brain scene has a still", () => {
  for (const [name, steps] of Object.entries(FILMS)) {
    const brain = steps.filter((s) => s.device === "brain");
    assert.ok(brain.length >= 1, name);
    for (const s of brain) assert.match(s.image ?? "", /^\/film\/brain-[a-z]+\.png$/, `${name} ${s.id}`);
  }
});

test("honest captions: no claimed actions, and unbuilt links say Coming", () => {
  for (const [name, steps] of Object.entries(FILMS))
    for (const s of steps) assert.ok(!claimsAction(`${s.title} ${s.line}`), `${name} ${s.id}`);
  // visitors reaching ONE MOVE waits on the event contract; Instagram waits on Meta
  assert.ok(OPEN_STEPS.find((s) => s.id === "flow")!.coming);
  assert.ok(MOVE_STEPS.find((s) => s.id === "flow")!.coming);
  assert.ok(MARQUEE_STEPS.find((s) => s.id === "social")!.coming);
});

test("Showly answers are Yes / Maybe / No, never loves", () => {
  for (const s of SHOWLY_STEPS) assert.ok(!/\blove/i.test(`${s.title} ${s.line}`), s.id);
});

test("nothing posts on the agent's behalf without their say-so", () => {
  const posting = MARQUEE_STEPS.find((s) => s.id === "posting")!;
  assert.match(posting.line, /off until you turn it on/);
  assert.match(posting.line, /never posted late/);
});

test("open house visitors never go into the VIP-50 on their own", () => {
  assert.match(OPEN_STEPS.find((s) => s.id === "flow")!.line, /Never into your VIP-50/);
  assert.match(MOVE_STEPS.find((s) => s.id === "flow")!.line, /Never into your VIP-50/);
});
