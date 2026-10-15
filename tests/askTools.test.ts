import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ASK_TOOLS, addDays, capped, classOf, isTool, likeSafe, nextYearly, notTouched, phoneOf, priceRange, specialDays, toolInput } from "../lib/askTools.ts";
import { QUICK_MODEL, STRONG_MODEL, pickModel } from "../lib/askModel.ts";
import { askItems, checkPeople, type AskAnswer } from "../lib/ask.ts";
import { indexGraph } from "../lib/graph/model.ts";

test("every lookup is read-only and named for the model", () => {
  assert.equal(ASK_TOOLS.length, 8);
  for (const t of ASK_TOOLS) assert.ok(isTool(t.name) && t.description.length > 40);
  assert.equal(isTool("answer"), false);
  const src = readFileSync(new URL("../lib/server/askData.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /\.(insert|update|upsert|delete|rpc)\(/, "no writes and no functions");
  // every read is the agent's own, even for an admin (MASTER lets admins read all contacts)
  const reads = src.match(/\.from\("[a-z_]+"\)/g) ?? [];
  const owned = src.match(/\.eq\("user_id", ctx\.userId\)/g) ?? [];
  assert.ok(reads.length > 0 && owned.length >= reads.length - 1, `${reads.length} reads, ${owned.length} user_id filters`);
});

test("inputs out of range fall back to safe defaults", () => {
  assert.deepEqual(toolInput("contacts_not_touched", { days: 9999, touch_type: "drop table", tier: "x" }), { days: 730, touch_type: "any", tier: "vip" });
  assert.deepEqual(toolInput("special_days", {}), { days_ahead: 7, tier: "vip" });
  assert.equal(likeSafe("Smith%,first_name.eq.x)"), "Smith first name.eq.x");
});

test("special days: this week's birthday and a home anniversary with its years; past ones roll to next year", () => {
  assert.deepEqual(nextYearly("1980-10-17", "2026-10-15"), { on: "2026-10-17", years: 46 });
  assert.equal(nextYearly("1980-01-02", "2026-10-15")?.on, "2027-01-02");
  assert.equal(nextYearly("2000-02-29", "2027-02-01")?.on, "2027-02-28");
  const rows = [
    { id: "a", first_name: "Amy", last_name: "Chen", birthday: "1985-10-16", phone: "(801) 555-1234" },
    { id: "b", first_name: "Bo", home_purchase_date: "2019-10-20" },
    { id: "c", first_name: "Cy", birthday: "1990-11-30" },
  ];
  const p = specialDays(rows, "2026-10-15", 7);
  assert.deepEqual(p.map((x) => x.name), ["Amy Chen", "Bo"]);
  assert.equal(p[0].facts[0], "Birthday tomorrow");
  assert.equal(p[1].facts[0], "Home anniversary (7 years) on 2026-10-20");
  assert.equal(p[0].phone, "8015551234");
});

test("not touched: oldest first, a recent touch of any kind counts, a call ask uses the last call", () => {
  const rows = [
    { id: "a", first_name: "Amy", last_touch_date: "2026-10-10", contact_tier: "vip50" },
    { id: "b", first_name: "Bo", last_touch_date: "2026-01-01" },
    { id: "c", first_name: "Cy", last_touch_date: null },
  ];
  const any = notTouched(rows, new Set(), addDays("2026-10-15", -60), "any", new Map());
  assert.deepEqual(any.map((x) => x.name), ["Cy", "Bo"]);
  const calls = notTouched(rows, new Set(["c"]), "2026-08-16", "call", new Map([["a", "2026-05-01"]]));
  assert.deepEqual(calls.map((x) => [x.name, x.facts[0]]), [["Bo", "No call logged"], ["Amy", "Last call 2026-05-01"]]);
  assert.match(capped("x", Array.from({ length: 30 }, () => calls[0])).summary, /30 in all/);
});

test("small helpers", () => {
  assert.equal(classOf(" Hot "), "hot");
  assert.equal(classOf("Active"), null);
  assert.equal(priceRange(450000, 1200000), "$450k-$1.2M");
  assert.equal(phoneOf({ phone: "555" }), null);
});

test("Haiku for a lookup, Sonnet for reasoning (Parry, 9 Oct)", () => {
  assert.equal(pickModel("Who haven't I called in 60 days?"), QUICK_MODEL);
  assert.equal(pickModel("Whose birthday is this week?"), QUICK_MODEL);
  assert.equal(pickModel("Why am I behind on referrals and what should I do?"), STRONG_MODEL);
  assert.equal(pickModel("How am I tracking?"), STRONG_MODEL);
});

test("people only from Pulse's own lookups, and ONE GO gets them to open", () => {
  const found = new Map([["c1", { name: "Amy Chen", phone: "8015551234", facts: ["Last call 2026-05-01"] }]]);
  const people = checkPeople([{ contact_id: "c1", reasons: [] }, { contact_id: "made-up", reasons: ["x"] }, { contact_id: "c1" }], found);
  assert.equal(people.length, 1);
  assert.deepEqual(people[0].reasons, ["Last call 2026-05-01"]);
  assert.deepEqual(checkPeople([{ contact_id: "c1", reasons: ["I have texted her"] }], found)[0].reasons, ["Last call 2026-05-01"]);
  const a: AskAnswer = { question: "q", answer: "a", results: [], source: "ai", people };
  const items = askItems(indexGraph({ nodes: [], edges: [] } as never), a);
  assert.equal(items[0].contact_id, "c1");
});
