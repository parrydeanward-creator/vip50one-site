import { test } from "node:test";
import assert from "node:assert/strict";
import { dueIn } from "../lib/live.ts";

const ID = "11111111-1111-4111-8111-111111111111";

test("Touch Audit pulses only for touches due today or overdue, with who (Parry, 5 Oct)", () => {
  const soon = { id: "go:untouched:2026-10", kind: "vip_touch", title: "38 VIP-50s not fully touched this month", urgency: "soon", why: [] };
  assert.equal(dueIn([soon] as never), undefined, "'not fully touched this month' alone never pulses");
  const today = { id: "go:task:x", kind: "vip_touch", title: "Video text Sarah", urgency: "today", contact_id: ID, why: [] };
  const late = { ...today, urgency: "alert", title: "Call Tom" };
  assert.deepEqual(dueIn([soon, today, late] as never), [
    { id: ID, title: "Video text Sarah", level: "today" },
    { id: ID, title: "Call Tom", level: "now" },
  ]);
  assert.equal(dueIn([{ ...today, contact_id: "nope" }] as never), undefined, "no real person, nothing to point at");
});

test("Hot/Warm/Cold pulses until today's three boxes are ticked (Parry, 5 Oct)", async () => {
  const { hwcToday } = await import("../lib/live.ts");
  const box = (key: string, done: boolean) => ({ key, label: key, done, points: 1 });
  assert.deepEqual(hwcToday([box("hot_contact", true), box("warm_contact", false), box("cold_contact", false), box("call", false)]), { left: 2 });
  assert.deepEqual(hwcToday([box("hot_contact", true), box("warm_contact", true), box("cold_contact", true)]), { left: 0 });
  assert.equal(hwcToday([box("call", false)]), null, "no Hot/Warm/Cold boxes sent: no pulse");
  assert.equal(hwcToday(null), null);
});
