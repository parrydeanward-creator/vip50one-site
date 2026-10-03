import { test } from "node:test";
import assert from "node:assert/strict";
import { liveGraph, OPEN_NEW_EVENT, type SummaryEnvelope, type SummaryItem } from "../lib/live.ts";

// REMINDERS.md: MASTER sends its automatic reminders with their own kind.
const book: SummaryItem = { id: "go:task:1bf4", kind: "book_open_house", title: "Set Up Open House", detail: "Overdue since Sep 21", urgency: "alert", due: "2026-09-21", why: ["This task was due Sep 21 and is not done."], link: "https://move.vip50one.com/tasks" };
const attract: SummaryItem = { id: "go:task:aa01", kind: "agent_attraction", title: "Agent Attraction 1", urgency: "alert", due: "2026-10-01", why: ["Due Oct 1."], link: "https://move.vip50one.com/tasks" };
const follow: SummaryItem = { id: "go:task:ff01", kind: "follow_up", title: "Call Brian Irby", urgency: "alert", due: "2026-10-02", why: ["Due Oct 2."], link: "https://move.vip50one.com/contacts/x" };
const MASTER: SummaryEnvelope = { v: 1, product: "go", found: true, stats: [], items: [book, attract, follow] };
const opts = (pkg: "complete" | "relationship") => ({ pkg, firstName: "P", reachable: true, today: "2026-10-03" });

test("Complete: the open house reminder sits under ONE OPEN and opens ONE Open", () => {
  const g = liveGraph(MASTER, opts("complete"), {});
  const group = g.nodes.find((n) => n.parentId === "open" && n.label === "Book your next open house");
  assert.ok(group);
  const node = g.nodes.find((n) => n.parentId === group!.id);
  assert.equal(node?.label, "Set Up Open House");
  assert.equal(node?.href, OPEN_NEW_EVENT);
});

test("follow-ups no longer include the reminders", () => {
  const g = liveGraph(MASTER, opts("complete"), {});
  const fu = g.nodes.filter((n) => n.parentId === "move-followups").map((n) => n.label);
  assert.deepEqual(fu, ["Call Brian Irby"]);
  const at = g.nodes.filter((n) => n.parentId === "move-attraction").map((n) => n.label);
  assert.deepEqual(at, ["Agent Attraction 1"]);
});

test("Relationship (no ONE Open): the reminder stays in ONE MOVE, with its own group", () => {
  const g = liveGraph(MASTER, opts("relationship"), {});
  assert.ok(!g.nodes.some((n) => n.parentId === "open" && n.label === "Book your next open house"));
  const node = g.nodes.find((n) => n.parentId === "move-book-oh");
  assert.equal(node?.label, "Set Up Open House");
  assert.equal(node?.href, "https://move.vip50one.com/tasks");
});
