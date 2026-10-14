import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LEDE, LIVE, PROMISE, packageLine, todayLine } from "../lib/pulseIntro.ts";

// Rewritten 14 Oct (audit stage 2, Parry: "i like it...go with it"): Meet Pulse is three lines plus five items, with no
// "Coming next" column, and a plan line that names every product the agent has, Growth included.
test("Meet Pulse: three lines and the five items, in Parry's words; no Coming next", () => {
  assert.deepEqual([...LEDE], ["Pulse is the AI inside ONE.", "It watches your whole business and puts the few things that matter in front of you.", "It suggests and writes. You decide what goes out."]);
  assert.deepEqual(LIVE.map((x) => x.title), ["Follow the pulse", "Morning Pulse", "Ask Pulse", "Written for you", "Plan my day"]);
  assert.match(PROMISE, /unless you chose it/);
  assert.ok(!/Coming next/.test(readFileSync("components/brain/PulseIntro.tsx", "utf8")));
});

test("plan line from MASTER names only what the agent has, Growth included", () => {
  assert.equal(packageLine("complete", true), "Your plan: ONE Complete + ONE Growth. Pulse works across ONE GO, ONE MOVE, Marquee, ONE Open, Showly, and your Growth ads and leads.");
  assert.equal(packageLine("complete"), "Your plan: ONE Complete. Pulse works across ONE GO, ONE MOVE, Marquee, ONE Open and Showly.");
  assert.equal(packageLine("relationship"), "Your plan: ONE Relationship. Pulse works across ONE GO and ONE MOVE.");
  assert.equal(packageLine("elite-x"), "");
  assert.equal(packageLine(undefined), "");
});

test("today line from what needs the agent", () => {
  assert.equal(todayLine(undefined), "Nothing needs you right now. Pulse is watching.");
  assert.equal(todayLine({ count: 1, level: "today" }), "1 thing needs you today.");
  assert.equal(todayLine({ count: 38, level: "now" }), "38 things need you, some overdue.");
});

test("the centre ONE orb opens Meet Pulse, not the film (Parry, 14 Oct)", () => {
  assert.match(readFileSync("components/brain/Brain.tsx", "utf8"), /id === graph\.rootId && state\.focusId === graph\.rootId && !tour\) return setIntro\(true\)/);
});
