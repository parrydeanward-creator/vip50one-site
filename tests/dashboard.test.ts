import { test } from "node:test";
import assert from "node:assert/strict";
import { demoData } from "../lib/demo.ts";
import { cleanCards, describeDay, rulesNote } from "../lib/note.ts";
import { includes } from "../lib/products.ts";
import { TODAY_MAX, rankToday } from "../lib/rank.ts";
import type { DashboardData, Item } from "../lib/types.ts";

const NOW = new Date("2026-09-30T15:00:00Z");

function item(over: Partial<Item>): Item {
  return {
    id: Math.random().toString(36).slice(2),
    product: "move",
    kind: "other",
    title: "x",
    urgency: "soon",
    action: { label: "Open", href: "#" },
    ...over,
  };
}

function withItems(items: Item[], pkg: DashboardData["agent"]["package"] = "complete"): DashboardData {
  const d = demoData({ pkg, now: NOW });
  d.products = d.products.map((p) => ({ ...p, items: items.filter((i) => i.product === p.product) }));
  return d;
}

test("packages: Relationship is GO and MOVE only; Complete and Elite have all five", () => {
  assert.equal(includes("relationship", "go"), true);
  assert.equal(includes("relationship", "move"), true);
  for (const p of ["marquee", "open", "showly"] as const) {
    assert.equal(includes("relationship", p), false);
    assert.equal(includes("complete", p), true);
    assert.equal(includes("elite", p), true);
  }
});

test("today: alerts first, then overdue, then people before paperwork", () => {
  const today = demoData({ now: NOW }).today;
  const d = withItems([
    item({ id: "approval", product: "marquee", kind: "approval", urgency: "today", due: today }),
    item({ id: "touch", product: "go", kind: "vip_touch", urgency: "today", due: today }),
    item({ id: "overdue", product: "move", kind: "follow_up", urgency: "today", due: "2026-09-01" }),
    item({ id: "safety", product: "open", kind: "safety", urgency: "alert" }),
    item({ id: "later", product: "showly", kind: "reaction", urgency: "soon", due: "2026-12-01" }),
  ]);
  assert.deepEqual(
    rankToday(d).map((i) => i.id),
    ["safety", "overdue", "touch", "approval", "later"],
  );
});

test("today: an overdue 'soon' item moves up to today", () => {
  const d = withItems([
    item({ id: "today", product: "move", kind: "follow_up", urgency: "today", due: demoData({ now: NOW }).today }),
    item({ id: "old", product: "go", kind: "birthday", urgency: "soon", due: "2026-09-01" }),
  ]);
  assert.deepEqual(rankToday(d).map((i) => i.id), ["old", "today"]);
});

test("today: never shows items from products outside the package or that did not answer", () => {
  const rel = demoData({ pkg: "relationship", now: NOW });
  assert.ok(rankToday(rel).every((i) => i.product === "go" || i.product === "move"));

  const offline = demoData({ offline: true, now: NOW });
  assert.ok(rankToday(offline).every((i) => i.product !== "showly"));
});

test("today: at most seven items", () => {
  const many = Array.from({ length: 20 }, (_, n) => item({ id: `i${n}`, product: "move" }));
  assert.equal(rankToday(withItems(many)).length, TODAY_MAX);
});

test("rules note: names the top three items and says nothing when there is nothing", () => {
  const d = demoData({ now: NOW });
  const ranked = rankToday(d);
  const n = rulesNote(d, ranked);
  assert.equal(n.source, "rules");
  assert.match(n.opening, /Sarah/);
  assert.match(n.note, /^Three things first\./);
  for (const i of ranked.slice(0, 3)) assert.ok(n.note.includes(i.title));

  const empty = rulesNote(d, []);
  assert.match(empty.note, /Nothing is waiting on you/);
});

test("AI card lines are kept only for products the agent has and that answered", () => {
  const d = demoData({ pkg: "relationship", offline: true, now: NOW });
  const cards = cleanCards(d, [
    { product: "go", line: "Start with Jen." },
    { product: "marquee", line: "Approve the posts." },
    { product: "showly", line: "Look at the Millers." },
    { product: "move", line: "   " },
  ]);
  assert.deepEqual(cards, { go: "Start with Jen." });
});

test("the AI is given only included, reachable products", () => {
  const d = demoData({ pkg: "relationship", now: NOW });
  const text = describeDay(d, rankToday(d));
  assert.ok(text.includes("GO (go)"));
  assert.ok(text.includes("MOVE (move)"));
  assert.ok(!text.includes("Marquee"));
  assert.ok(!text.includes("Showly"));
});
