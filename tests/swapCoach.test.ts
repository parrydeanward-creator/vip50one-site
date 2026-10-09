import { test } from "node:test";
import assert from "node:assert/strict";
import { coachLine, swapSuggestions } from "../lib/swapCoach.ts";
import type { VipPerson, VipRoster } from "../lib/vips.ts";

const today = "2026-10-09";
const ago = (k: number) => new Date(Date.parse(`${today}T12:00:00Z`) - k * 86_400_000).toISOString().slice(0, 10);
const p = (id: string, name: string, x: Partial<VipPerson> = {}): VipPerson => ({ id, name, ...x });

const full: VipRoster = {
  cap: 4,
  vip50: [
    p("a", "Al Quiet", { last_touch_on: ago(200), promoted_at: ago(400) }),
    p("b", "Bea Fresh", { last_touch_on: ago(5), promoted_at: ago(400) }),
    p("c", "Cy New", { last_touch_on: null, promoted_at: ago(20) }),
    p("d", "Di Referrer", { last_touch_on: ago(300), promoted_at: ago(400) }),
  ],
  vip100: [
    p("e", "Ed Sender", { last_touch_on: ago(40) }),
    p("f", "Fay Busy", { month_done: 4 }),
    p("g", "Gus Recent", { last_touch_on: ago(10) }),
    p("h", "Hal Nobody", {}),
  ],
};
const referred = new Map([["d", 2], ["e", 1]]);

test("out: quiet 120+ days, settled 90+ days, never a referrer; quietest first", () => {
  const s = swapSuggestions(full, today, referred);
  assert.deepEqual(s.out.map((w) => [w.p.name, w.words]), [["Al Quiet", "No touch in 200 days"]]);
});

test("in: referrers first, then busy this month, then recently in touch; nobody without a reason", () => {
  const s = swapSuggestions(full, today, referred);
  assert.deepEqual(s.into.map((w) => [w.p.name, w.words]), [
    ["Ed Sender", "Sent you 1 referral"],
    ["Fay Busy", "4 touches this month already"],
    ["Gus Recent", "In touch 10 days ago"],
  ]);
});

test("full list: pairs the quietest with the strongest; open spots: no pairs, move straight in", () => {
  const s = swapSuggestions(full, today, referred);
  assert.deepEqual(s.pairs.map((x) => [x.out.p.id, x.into.p.id]), [["a", "e"]]);
  assert.equal(coachLine(s), "1 swap worth a look");
  const room = swapSuggestions({ ...full, cap: 6 }, today, referred);
  assert.equal(room.pairs.length, 0);
  assert.equal(room.open, 2);
  assert.equal(coachLine(room), "2 open spots: 3 worth moving in");
  assert.equal(coachLine(swapSuggestions({ cap: 4, vip50: [], vip100: [] }, today)), null);
});
