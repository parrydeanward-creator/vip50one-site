import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { WINS_NODE, demoWins, groupOf, inGroup, newSince, readWins, total, winsLine, winsUrl, withWinsNode } from "../lib/wins.ts";

const today = "2026-10-08";

test("readWins: checked, newest first, unknown kinds dropped", () => {
  const w = readWins({
    wins: [
      { kind: "closing", at: "2026-09-30T00:00:00Z", title: "Closed 1482 Maple Ridge Dr", detail: "Buyer side · $455,000", contact_id: "c1", amount: 455000 },
      { kind: "five_star", at: "2026-10-05", title: "Jane Smith" },
      { kind: "thank_you", at: "2026-10-06", title: "Not a kind yet" },
      { kind: "badge", at: "not a date", title: "Streak" },
      { kind: "referral", at: "2026-10-01", title: "" },
      { kind: "week_100", at: "2026-09-28", title: "Week of Sep 28: 112", amount: -5 },
    ],
    counts: { closing: 3, referral: 6, five_star: 0, week_100: 4, badge: 2, goal_reached: 0 },
  })!;
  assert.deepEqual(w.wins.map((x) => x.kind), ["five_star", "closing", "week_100"]);
  assert.equal(w.wins[1].at, "2026-09-30");
  assert.equal(w.wins[1].contactId, "c1");
  assert.equal(w.wins[2].amount, null);
  // MASTER's counts win over the list (the list is capped at 200)
  assert.equal(w.counts.referral, 6);
  assert.equal(w.counts.five_star, 0);
  assert.equal(total(w), 15);
  assert.equal(readWins({ counts: {} }), null);
  assert.equal(readWins(null), null);
});

test("readWins: counts from the list when MASTER sends none; a referral that closed sits with referrals but is not a second referral", () => {
  const w = readWins({
    wins: [
      { kind: "referral", at: "2026-09-01", title: "Jane Smith sent you Tom Lee" },
      { kind: "referral_closed", at: "2026-10-01", title: "Tom Lee closed" },
    ],
  })!;
  assert.equal(groupOf("referral_closed"), "referral");
  assert.equal(w.counts.referral, 1);
  assert.equal(inGroup(w, "referral").length, 2);
});

test("newSince: only wins after the last look; nothing new before a first look", () => {
  const w = demoWins(today);
  assert.equal(newSince(w, null).length, 0);
  const fresh = newSince(w, "2026-10-05");
  assert.ok(fresh.length >= 2);
  assert.ok(fresh.every((x) => x.at > "2026-10-05"));
});

test("winsLine and winsUrl", () => {
  assert.equal(winsLine(readWins({ wins: [] })!), "Your wins will gather here");
  assert.match(winsLine(demoWins(today)), /^\d+ wins this year$/);
  assert.equal(winsUrl(), "https://move.vip50one.com/api/brain/wins?days=365");
  assert.equal(winsUrl(90, "a b"), "https://move.vip50one.com/api/brain/wins?days=90&agent=a%20b");
});

const base = () => ({
  nodes: [{ id: "one", type: "root", label: "ONE" } as unknown as GraphNode, { id: "go", type: "product", label: "ONE YOU", product: "go" } as unknown as GraphNode],
  edges: [] as GraphEdge[],
});

test("withWinsNode: gold glow when new, never a pulse; none when locked or not loaded", () => {
  const w = demoWins(today);
  const g = withWinsNode(base(), w, 2);
  const n = g.nodes.find((x) => x.id === WINS_NODE)!;
  assert.equal(n.status, "healthy");
  assert.equal(n.celebrate, true);
  assert.equal(n.secondaryLabel, "2 new since you last looked");
  const quiet = withWinsNode(g, w, 0).nodes.find((x) => x.id === WINS_NODE)!;
  assert.equal(quiet.celebrate, false);
  assert.equal(withWinsNode(g, w, 0).nodes.filter((x) => x.id === WINS_NODE).length, 1);
  assert.equal(withWinsNode(base(), null, 0).nodes.some((x) => x.id === WINS_NODE), false);
  const locked = base();
  (locked.nodes[1] as GraphNode & { locked?: boolean }).locked = true;
  assert.equal(withWinsNode(locked, w, 1).nodes.some((x) => x.id === WINS_NODE), false);
});
