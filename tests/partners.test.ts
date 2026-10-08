import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { MAX_PARTNERS, PARTNERS_NODE, demoPartners, nudgedToday, partnerLine, readPartners, waiting, withPartnersNode } from "../lib/partners.ts";

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
});

test("withPartnersNode: one orb under ONE YOU, yellow when an invite or today's nudge waits", () => {
  const base: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [{ id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 1 }], edges: [] };
  const s = demoPartners(today);
  const g = withPartnersNode(withPartnersNode(base, s, today), s, today);
  const n = g.nodes.filter((x) => x.id === PARTNERS_NODE);
  assert.equal(n.length, 1);
  assert.equal(n[0].status, "attention");
  assert.equal(n[0].secondaryLabel, "2 waiting for you");
  const calm = withPartnersNode(base, { ...s, invitesIn: [], nudges: [] }, today).nodes.find((x) => x.id === PARTNERS_NODE)!;
  assert.equal(calm.status, "healthy");
  assert.equal(calm.secondaryLabel, "2 accountability partners");
  assert.equal(withPartnersNode(base, null, today).nodes.length, 1);
});
