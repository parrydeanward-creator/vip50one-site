import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { MAX_PARTNERS, PARTNERS_NODE, demoPartners, nudgedToday, partnerLine, readPartners, waiting, unseenNudges, withAllSeen } from "../lib/partners.ts";

const today = "2026-10-08";

test("readPartners: checked, at most 3, preset nudges only, newest first", () => {
  const s = readPartners({
    partners: [
      { pair_id: "a", user_id: "u1", first_name: "Jen", week: { score: 108, minimum: 100 }, last4: [96, 104, 112, 101, 99], streak: 3, ticked_today: true },
      { pair_id: "b", user_id: "u2", first_name: "Marcus", week: { score: null }, last4: [], streak: 0 },
      { pair_id: "c", user_id: "u3", first_name: "Amy" },
      { pair_id: "d", user_id: "u4", first_name: "Dave" },
      { pair_id: "e", first_name: "No user" },
    ],
    invites_in: [{ pair_id: "x", first_name: "Lisa" }, { pair_id: "y" }],
    invites_out: [{ pair_id: "z", first_name: "Tom", expires_at: "2026-10-20T00:00:00Z" }],
    nudges: [
      { from_first_name: "Jen", kind: "proud", sent_at: "2026-10-07T10:00:00Z" },
      { from_first_name: "Jen", kind: "both_100", sent_at: "2026-10-08T14:00:00Z" },
      { from_first_name: "Jen", kind: "write_anything", sent_at: "2026-10-08T15:00:00Z" },
    ],
  })!;
  assert.equal(s.partners.length, MAX_PARTNERS);
  assert.deepEqual(s.partners[0].last4, [104, 112, 101, 99]); // the last 4 only
  assert.equal(s.partners[1].score, null);
  assert.equal(s.partners[1].minimum, 100);
  assert.deepEqual(s.invitesIn, [{ pairId: "x", name: "Lisa" }]);
  assert.equal(s.invitesOut[0].expires, "2026-10-20");
  assert.deepEqual(s.nudges.map((n) => n.kind), ["both_100", "proud"]); // free text refused
  assert.equal(readPartners({ partners: "no" }), null);
});

test("lines, one nudge a day, and what is waiting", () => {
  const s = demoPartners(today);
  assert.equal(partnerLine(s.partners[0]), "108 this week: at 100");
  assert.equal(partnerLine(s.partners[1]), "54 this week: 46 to 100");
  assert.equal(partnerLine({ ...s.partners[1], score: null }), "No score yet this week");
  assert.equal(nudgedToday(s.partners[0], today), false);
  assert.equal(nudgedToday({ ...s.partners[0], lastNudgeFromMe: `${today}T09:00:00Z` }, today), true);
  assert.equal(nudgedToday({ ...s.partners[0], lastNudgeFromMe: "2026-10-07T23:00:00Z" }, today), false);
  assert.equal(waiting(s, today), 2); // Dave's invite and Jen's nudge today
  assert.equal(waiting(s, "2026-10-09"), 1);
  assert.equal(waiting(withAllSeen(s), today), 1); // a seen nudge no longer waits (§3s.4 v1.67)
  assert.equal(unseenNudges(withAllSeen(s)), 0);
});

test("seen_at from ONE MOVE marks a nudge seen", () => {
  const s = readPartners({ partners: [], nudges: [{ from_first_name: "Jen", kind: "proud", sent_at: `${today}T10:00:00Z`, seen_at: `${today}T11:00:00Z` }, { from_first_name: "Jen", kind: "got_this", sent_at: `${today}T12:00:00Z`, seen_at: null }] })!;
  assert.deepEqual(s.nudges.map((n) => n.seen), [false, true]);
  assert.equal(waiting(s, today), 1);
});

test("Partners has no ONE YOU orb (Parry, 16 Oct): it is a Scoreboard section, under the Leaderboard", async () => {
  // Rewritten: this asserted the Partners orb under ONE YOU, which Parry moved into the Scoreboard on 16 Oct.
  const m = (await import("../lib/partners.ts")) as Record<string, unknown>;
  assert.equal(m.withPartnersNode, undefined);
  const { withoutRetired, SCOREBOARD_SECTIONS } = await import("../lib/oneYou.ts");
  const base: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [{ id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 1 }, { id: PARTNERS_NODE, type: "feature", label: "Partners", parentId: "go", product: "go", importance: 1 }], edges: [{ id: "x", source: "go", target: PARTNERS_NODE, relationshipType: "belongs_to", strength: 1 }] };
  assert.equal(withoutRetired(base).nodes.some((x) => x.id === PARTNERS_NODE), false);
  assert.equal(SCOREBOARD_SECTIONS.indexOf("Your partners"), SCOREBOARD_SECTIONS.indexOf("Leaderboard") + 1);
  // what the section still reads: an invite and today's nudge wait
  assert.equal(waiting(demoPartners(today), today), 2);
});
