import { test } from "node:test";
import assert from "node:assert/strict";
import { COMING, LIVE, PROMISE, packageLine, todayLine } from "../lib/pulseIntro.ts";

test("the card says what Pulse does now and what is coming", () => {
  assert.ok(LIVE.length >= 6 && COMING.length >= 4);
  assert.equal(LIVE[0].title, "Follow the pulse");
  assert.match(PROMISE, /unless you chose it/, "the never-sends-for-you rule is on the card");
});

test("package line: Complete names all five, Relationship names two, anything else says nothing", () => {
  assert.match(packageLine("complete"), /ONE GO, ONE MOVE, Marquee, ONE Open and Showly/);
  assert.match(packageLine("relationship"), /ONE GO and ONE MOVE\. Marquee, ONE Open and Showly join it with ONE Complete/);
  assert.equal(packageLine("elite-x"), "");
  assert.equal(packageLine(undefined), "");
});

test("today line from what needs the agent", () => {
  assert.equal(todayLine(undefined), "Nothing needs you right now. Pulse is watching.");
  assert.equal(todayLine({ count: 1, level: "today" }), "1 thing needs you today. Follow the pulse.");
  assert.equal(todayLine({ count: 7, level: "now" }), "7 things need you, some overdue. Follow the pulse.");
});
