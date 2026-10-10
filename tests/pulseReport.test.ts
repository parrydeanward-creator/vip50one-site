import { test } from "node:test";
import assert from "node:assert/strict";
import { demoPulseReport, heldTotal, readPulseReport, reportLine, unseen } from "../lib/pulseReport.ts";
import { review } from "../lib/review.ts";

test("pulse report: checked; totals from the workers; held with ONE MOVE's words", () => {
  const p = readPulseReport({
    summary: "This week Pulse sent 2 messages for you.",
    workers: [{ worker: "birthdays", sent: 2, drafts: 1, held: 1 }, { worker: "nurture", sent: 0, drafts: 2 }],
    held: [{ reason: "quiet_hours", words: "Quiet hours", count: 1 }, { reason: "x", words: "Nothing", count: 0 }],
    autopilot: [{ contact: "Jane", worker: "Birthdays", what: "Happy birthday", at: "2026-10-08T15:00:00Z" }],
    handbacks: [{ id: "h1", contact: "Mike", about: "Wants a showing", at: "2026-10-08T16:00:00Z", seen: false }, { id: "", at: "x" }],
    touches: { words: "Your own touches: 9." },
  })!;
  assert.deepEqual([p.sent, p.drafts, heldTotal(p), p.handbacks.length, unseen(p)], [2, 3, 1, 1, 1]);
  assert.equal(reportLine(p), "2 sent, 3 waiting, 1 held back, 1 handed back");
  assert.equal(readPulseReport({ workers: [] }), null, "no summary: not an answer");
});

test("review: the Pulse card pulses yellow only while a hand-back is unopened, and asks for the brokerage address", () => {
  const r = review({ today: "2026-10-09", week: null, roster: null, commitments: null, goals: [], pulse: demoPulseReport("2026-10-09") });
  const c = r.cards.find((x) => x.key === "pulse")!;
  assert.deepEqual([c.big, c.level], ["0", "today"]);
  assert.ok(r.next.some((n) => n.startsWith("Answer what Pulse handed back: Mike Torres")));
  assert.ok(r.next.some((n) => n.includes("brokerage address")));
  const seen = demoPulseReport("2026-10-09");
  seen.handbacks = seen.handbacks.map((h) => ({ ...h, seen: true }));
  assert.equal(review({ today: "2026-10-09", week: null, roster: null, commitments: null, goals: [], pulse: seen }).cards.find((x) => x.key === "pulse")!.level, null);
});
