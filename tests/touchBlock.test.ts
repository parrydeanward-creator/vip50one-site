import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDay, readDay, type Block } from "../lib/schedule.ts";
import { contactHref, demoDayAnswer, demoTouchBlocks, panelRows, readTouchItems, tickBody, touchBlocks, touchTitle } from "../lib/touchBlock.ts";
import { slide } from "../lib/assist.ts";

// Parry, 22 Oct: "there are 2 power hours on the daily clock calendar ... when the user clicks on power hour it should
// populate all those auto touches (tasks) and populate them in the side bar with the persons name and make it clickable
// so when clicked it will open the contacts full page ... and then click all the boxes when accomplished."
// ONE MOVE's GET /api/brain/day (vip50-web-crm#371) carries the one Power Hour and its follow-up, with their items.

const WHAT = ["Call", "Call", "Call", "Video text", "Social media touch", "Handwritten note", "Text for their birthday", "Call", "Card for their anniversary"];
const KIND = ["call", "call", "call", "text", "text", "note", "text", "call", "note"];
const items9 = WHAT.map((what, k) => ({
  task_id: k < 6 ? `00000000-0000-4000-8000-0000000000a${k}` : null,
  ref: k < 6 ? `go:task:00000000-0000-4000-8000-0000000000a${k}` : k === 6 ? "special:c7:birthday" : k === 8 ? "card:c9:anniversary" : `go:task:x${k}`,
  contact_id: k === 7 ? null : `00000000-0000-4000-8000-00000000c00${k}`,
  name: ["Jen Alvarez", "Amy Chen", "Dave Kim", "Mark Miller", "Jane Parker", "Lena Brooks", "Owen Hart", "A walk-in", "Priya Shah"][k],
  kind: KIND[k],
  what,
  done: k < 3,
}));
const liveDay = (items = items9) => ({
  date: "2026-10-22",
  hours: { start: "08:00", end: "17:30" },
  busy: [{ start: "10:00", end: "11:00", title: "Listing appointment", source: "listing_appointment" }],
  blocks: [
    { id: "ph1", start: "08:30", end: "09:30", kind: "power_hour", title: `Power Hour: ${items.filter((i) => i.done).length} of ${items.length} done`, refs: items.map((i) => i.ref), why: "Your VIP touches for today.", done: false, follow_up: false, items },
    { id: "fu1", start: "11:15", end: "11:45", kind: "custom", title: `Finish your VIP touches (${items.filter((i) => !i.done).length} left)`, refs: items.filter((i) => !i.done).map((i) => i.ref), why: "", done: false, follow_up: true, items: items.filter((i) => !i.done) },
    { id: "t1", start: "13:00", end: "13:30", kind: "tasks", title: "Write the CMA", refs: ["move:cma"], why: "", done: false },
  ],
  approved_at: null,
});

test("22 Oct: ONE MOVE's day is read with its touches: one Power Hour of 9 (3 done) and its follow-up", () => {
  const d = readDay(liveDay())!;
  const t = touchBlocks(d.blocks);
  assert.equal(t.filter((b) => b.kind === "power_hour").length, 1, "exactly one Power Hour");
  assert.deepEqual(t.map((b) => b.title), ["Power Hour: 3 of 9 done", "Finish your VIP touches (6 left)"]);
  assert.equal(t[0].items!.length, 9);
  assert.equal(t[1].followUp, true);
  assert.equal(readTouchItems([{ ref: "" }, null, { ref: "go:task:a", kind: "fax", name: "Al" }])!.length, 1, "bad rows dropped, never guessed");
});

test("22 Oct: the day drawn has exactly one Power Hour; the Brain plans none of its touches again", () => {
  const d = readDay(liveDay())!;
  const touch = touchBlocks(d.blocks);
  const vip = (ref: string) => ({ ref, product: "go" as const, kind: "call" as const, title: ref, contactId: null, link: null, minutes: 10, done: false, urgency: "today" as const, vip: true });
  const out = buildDay({ hours: d.hours, busy: d.busy, items: [vip("go:task:00000000-0000-4000-8000-0000000000a3"), vip("special:c7:birthday"), { ...vip("move:cma"), vip: undefined, kind: "other" as const, minutes: 30 }], touch });
  assert.equal(out.blocks.filter((b) => b.kind === "power_hour").length, 1);
  assert.equal(out.blocks.filter((b) => /^Power Hour/.test(b.title)).length, 1, "and nothing else named a Power Hour");
  assert.deepEqual(out.blocks.filter((b) => !b.items).flatMap((b) => b.refs), ["move:cma"]);
  // a Power Hour the Brain once built and saved (no items) is never drawn, nor a second one
  const stale: Block = { id: "b:power_hour:x", start: "14:00", end: "15:00", kind: "power_hour", title: "Power Hour: 6 calls", refs: ["go:task:z"], why: "", done: false };
  const twice = { ...touch[0], id: "ph2", start: "15:00", end: "16:00" };
  assert.equal(touchBlocks([stale, ...d.blocks, twice]).filter((b) => b.kind === "power_hour").length, 1);
  assert.equal(touchBlocks([stale, ...d.blocks, twice])[0].id, "ph1");
});

test("22 Oct: the panel lists all 9 by name, each name opening the contact's full page in the Brain", () => {
  const [ph] = touchBlocks(readDay(liveDay())!.blocks);
  const rows = panelRows(ph);
  assert.equal(rows.length, 9);
  assert.deepEqual(rows.slice(0, 3).map((r) => [r.name, r.what, r.done]), [["Jen Alvarez", "Call", true], ["Amy Chen", "Call", true], ["Dave Kim", "Call", true]]);
  assert.equal(rows[0].href, "/dashboard/contacts/00000000-0000-4000-8000-00000000c000");
  assert.equal(rows[7].href, null, "no contact: the name is plain");
  assert.equal(contactHref(null), null);
  assert.deepEqual(rows.map((r) => r.what).slice(6), ["Text for their birthday", "Call", "Card for their anniversary"]);
});

test("22 Oct: a tick sends the task (or the special day's ref), and the answered day updates the panel and the title at once", () => {
  const [ph] = touchBlocks(readDay(liveDay())!.blocks);
  assert.deepEqual(tickBody(ph.items![3], true), { task_id: "00000000-0000-4000-8000-0000000000a3", done: true });
  assert.deepEqual(tickBody(ph.items![6], true), { ref: "special:c7:birthday", done: true });
  // while the tick is on the way it already shows done
  const pending = touchBlocks(readDay(liveDay())!.blocks, (r) => (r === ph.items![3].ref ? true : undefined));
  assert.equal(pending[0].title, "Power Hour: 4 of 9 done");
  assert.equal(pending[1].title, "Finish your VIP touches (5 left)");
  // ONE MOVE answers with the whole day, recounted
  const answered = liveDay(items9.map((i, k) => (k === 3 ? { ...i, done: true } : i)));
  const after = touchBlocks(readDay(answered)!.blocks);
  assert.equal(after[0].title, "Power Hour: 4 of 9 done");
  assert.equal(panelRows(after[0])[3].done, true);
  assert.equal(after[1].items!.length, 5);
  const all = touchBlocks(readDay(liveDay(items9.map((i) => ({ ...i, done: true }))))!.blocks);
  assert.equal(all[0].done, true, "all ticked: the block is done");
  assert.equal(touchTitle({ kind: "custom", title: "Finish your VIP touches (1 left)", followUp: true }, []), "Finish your VIP touches (0 left)");
});

test("22 Oct: the Power Hour never slides; what is left is the follow-up's", () => {
  const t = touchBlocks(readDay(liveDay())!.blocks);
  assert.equal(slide(t, [], { start: "08:00", end: "17:30" }, "12:00").note, null);
});

test("22 Oct: the example agent has exactly one Power Hour, made in ONE MOVE's shape and read by the same reader", async () => {
  const { demoGraph } = await import("../lib/graph/demo.ts");
  const today = demoGraph("complete").today!;
  const raw = demoDayAnswer("2026-10-22", today, "09:00") as { blocks: { kind: string; items: unknown[] }[] };
  assert.equal(raw.blocks.length, 1);
  assert.equal(raw.blocks[0].kind, "power_hour");
  const blocks = demoTouchBlocks(readDay, "2026-10-22", today, "09:00");
  assert.equal(touchBlocks(blocks).filter((b) => b.kind === "power_hour").length, 1);
  const rows = panelRows(blocks[0]);
  assert.ok(rows.length >= 6);
  assert.equal(rows[0].kind, "call", "calls first");
  assert.ok(rows.some((r) => r.name === "Jen Alvarez" && r.href === "/dashboard/contacts/00000000-0000-4000-8000-000000000001"));
  assert.deepEqual([blocks[0].start, blocks[0].end], ["09:00", "10:00"]);
});
