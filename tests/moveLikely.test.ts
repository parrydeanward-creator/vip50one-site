import { test } from "node:test";
import assert from "node:assert/strict";
import { EXAMPLE_PAST_CLIENT, LIKELY_NODE, MLS_MISSING, WAITING_FEED, emptyMoveLikely, likelyReason, pastClientLine, readPastClients, levelLine, demoMoveLikely, levelWord, notedLine, readMoveLikely, withMoveLikelyNode, withoutPerson } from "../lib/moveLikely.ts";

const g = { nodes: [{ id: "move", type: "product", label: "ONE MOVE", parentId: null, product: "move", importance: 1 }], edges: [] } as never;
const node = (m: ReturnType<typeof demoMoveLikely> | null) => (withMoveLikelyNode(g, m) as { nodes: { id: string; status?: string; secondaryLabel?: string }[] }).nodes.find((n) => n.id === LIKELY_NODE);

test("readMoveLikely keeps good people, sorts High, Medium, no history, and refuses a wrong shape", () => {
  assert.equal(readMoveLikely({}), null);
  const m = readMoveLikely({ ready: true, people: [{ contact_id: "a", name: "Ann", level: "medium" }, { contact_id: "b", name: "Bo", level: "high" }, { contact_id: "c", name: "Cy", level: "weird" }, { name: "no id" }], low_count: 3.4 })!;
  assert.deepEqual(m.people.map((p) => p.contactId), ["b", "a", "c"]);
  assert.equal(m.people[2].level, null);
  assert.equal(m.people[0].label, "Suggested");
  assert.equal(m.lowCount, 3);
});

test("no MLS history is never shown as Low", () => {
  assert.equal(levelWord(null), "No MLS history yet");
  assert.equal(levelWord("high"), "High");
});

test("the agent's own notes show beside the level, in plain words", () => {
  const m = demoMoveLikely();
  assert.equal(notedLine(m.people.find((p) => p.contactId === "r6")!), "you noted: kids left home");
  assert.equal(notedLine(m.people.find((p) => p.contactId === "r9")!), null);
});

test("the orb: a gold opportunity when someone is High, never a pulse; not ready says why", () => {
  const n = node(demoMoveLikely())!;
  assert.equal(n.status, "opportunity");
  assert.equal(n.secondaryLabel, "2 high · 1 medium · past clients");
  assert.equal(node({ ...demoMoveLikely(), ready: false })!.status, undefined);
  // Rewritten 17 Oct: Likely to move is one of Opportunities' four parts and always there (Parry, 17 Oct), so no answer
  // from ONE MOVE no longer means no orb; it shows its one honest reason instead.
  assert.equal(node(null)!.secondaryLabel, "Waiting for the UtahRealEstate.com feed");
  assert.equal(node(null)!.status, undefined);
  const after = withoutPerson(withoutPerson(demoMoveLikely(), "r6"), "r9");
  assert.equal(node(after)!.status, undefined);
});

test("as built: the whole label line, ONE MOVE's words for notes, not_linked", () => {
  const m = readMoveLikely({ ready: false, not_linked: true, people: [
    { contact_id: "a", name: "Ann", level: "high", label: "High · Suggested", you_noted: [{ event: "baby", words: "New baby", at: "2026-10-01" }] },
    { contact_id: "b", name: "Bo", level: "medium", label: "Suggested" },
    { contact_id: "c", name: "Cy", level: null, label: "No MLS history yet" },
  ] })!;
  assert.equal(m.notLinked, true);
  assert.deepEqual(m.people.map(levelLine), ["High · Suggested", "Medium · Suggested", "No MLS history yet"]);
  assert.equal(notedLine(m.people[0]), "you noted: new baby");
});

test("one honest reason, never both: the missing MLS member id, else the UtahRealEstate.com feed", () => {
  assert.equal(likelyReason(true, null), MLS_MISSING);
  assert.equal(likelyReason(false, null), WAITING_FEED);
  assert.equal(likelyReason(null, null), WAITING_FEED);
  // ONE Property says the MLS link is not set and the profile is not read yet: the member id is the reason
  assert.equal(likelyReason(null, { ...emptyMoveLikely(), notLinked: true }), MLS_MISSING);
  // the member id is set: the feed, even if ONE Property has not linked it yet
  assert.equal(likelyReason(false, { ...emptyMoveLikely(), notLinked: true }), WAITING_FEED);
  const missing = (withMoveLikelyNode(g, null, { mlsMissing: true }) as { nodes: { id: string; secondaryLabel?: string; summary?: string }[] }).nodes.find((n) => n.id === LIKELY_NODE)!;
  assert.equal(missing.secondaryLabel, "Add your MLS member id");
  assert.ok(!/UtahRealEstate/.test(missing.summary!));
  const waiting = (withMoveLikelyNode(g, null, { mlsMissing: false }) as { nodes: { id: string; summary?: string }[] }).nodes.find((n) => n.id === LIKELY_NODE)!;
  assert.ok(/UtahRealEstate\.com feed/.test(waiting.summary!) && !/member id/.test(waiting.summary!));
});

test("past clients 5+ years from ONE MOVE's coming route; until then one clearly labelled example", () => {
  assert.equal(readPastClients({}), null);
  const l = readPastClients({ people: [
    { contact_id: "a", first_name: "Ann", years: 6.7, closed_on: "2020-02-01" },
    { contact_id: "b", first_name: "Bo", years: 11, closed_on: "2015-05-01" },
    { contact_id: "c", first_name: "Cy", years: 3 },
    { contact_id: "a", first_name: "Dup", years: 9 },
  ] })!;
  assert.deepEqual(l.map((p) => [p.firstName, p.years]), [["Bo", 11], ["Ann", 6]]);
  assert.equal(pastClientLine(EXAMPLE_PAST_CLIENT), "Example: bought 7 years ago");
  assert.equal(pastClientLine(l[0]), "Bought 11 years ago");
  const n = (withMoveLikelyNode(g, null, { pastClients: l }) as { nodes: { id: string; secondaryLabel?: string }[] }).nodes.find((x) => x.id === LIKELY_NODE)!;
  assert.equal(n.secondaryLabel, "2 past clients 5+ years");
});

test("ONE MOVE's likely-to-move route (vip50-web-crm#293): its reason wins, its people, the Call them body", async () => {
  const { readPastClientsAnswer, callBody, callUrl, CALL_ADDED } = await import("../lib/moveLikely.ts");
  assert.equal(readPastClientsAnswer({ reason: "no_mls_id" }), null);
  const none = readPastClientsAnswer({ reason: "no_mls_id", people: [] })!;
  assert.deepEqual(none, { reason: "no_mls_id", people: [] });
  assert.equal(readPastClientsAnswer({ reason: "odd", people: [] })!.reason, null);
  const many = readPastClientsAnswer({ reason: "waiting_feed", people: Array.from({ length: 20 }, (_, k) => ({ contact_id: `c${k}`, first_name: `P${k}`, years: 5 + k, closed_on: null })) })!;
  assert.equal(many.people.length, 15);
  assert.equal(many.people[0].years, 24); // oldest purchase first
  // the route's word wins over the profile read; without it the profile decides as before
  assert.equal(likelyReason(false, null, "no_mls_id"), MLS_MISSING);
  assert.equal(likelyReason(true, null, "waiting_feed"), WAITING_FEED);
  assert.equal(likelyReason(true, null, null), MLS_MISSING);
  const n = (withMoveLikelyNode(g, null, { mlsMissing: false, routeReason: "no_mls_id" }) as { nodes: { id: string; secondaryLabel?: string }[] }).nodes.find((x) => x.id === LIKELY_NODE)!;
  assert.equal(n.secondaryLabel, "Add your MLS member id");
  assert.equal(WAITING_FEED.short, "Waiting for the UtahRealEstate.com feed");
  assert.equal(callUrl, "https://move.vip50one.com/api/brain/likely-to-move/call");
  assert.deepEqual(callBody("c1"), { contact_id: "c1" });
  assert.equal(CALL_ADDED, "Added to today's tasks");
});
