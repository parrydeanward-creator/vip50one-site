import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";
import { DEMO_NTS_NODE, EMPTY_LINE, NTS_NODE, COMING, countOf, demoNewToSort, fromNewLeads, normAddress, readNewToSort, sortPerson, sourceTitle, waitingOldestFirst, whereLine, withNewToSort, withoutPerson } from "../lib/newToSort.ts";
import { inBrainPage } from "../lib/moveMenu.ts";
import { demoGraph } from "../lib/graph/demo.ts";

const move: GraphNode = { id: "move", type: "product", label: "ONE MOVE", parentId: "one", product: "move", importance: 1 };
const bare = (): { nodes: GraphNode[]; edges: GraphEdge[] } => ({ nodes: [move], edges: [] });

test("one house, one group: city, state and zip after the unit do not matter", () => {
  assert.equal(normAddress("450 E 100 S #20, Salt Lake City"), normAddress("450 E 100 S #20, Salt Lake, UT 84111"));
  assert.equal(normAddress("450 e 100 s  # 20, SLC"), "450 e 100 s #20");
  assert.equal(normAddress("12 Elm Way, Unit 4, Sandy, UT"), "12 elm way unit 4");
  assert.notEqual(normAddress("450 E 100 S #20, SLC"), normAddress("450 E 100 S #21, SLC"));
});

test("the walker's two rows for 450 E 100 S #20 are one source of 3 people", () => {
  const p = (id: string) => ({ contact_id: id, first_name: id });
  const d = readNewToSort({ sources: [
    { key: "a", kind: "open_house", label: "450 E 100 S #20, Salt Lake City", date: "2026-10-03", people: [p("x"), p("y")] },
    { key: "b", kind: "open_house", label: "450 E 100 S #20, Salt Lake, UT 84111", date: "2026-10-03", people: [p("z"), p("x")] },
    { key: "c", kind: "website", label: "Website", people: [p("w")] },
    { key: "d", kind: "nonsense", people: [p("q")] },
  ] })!;
  assert.equal(d.sources.length, 2);
  const oh = d.sources[0];
  assert.equal(oh.people.length, 3);
  assert.equal(sourceTitle(oh), "450 E 100 S #20 · Sat 3 Oct");
  assert.equal(countOf(d), 4);
  assert.equal(readNewToSort({}), null);
});

test("an undated sign-in joins its house; every lead says where it came from", () => {
  const d = readNewToSort([
    { kind: "open_house", label: "9 Oak St, Draper", date: "2026-10-10", people: [{ contact_id: "a", first_name: "Ann" }] },
    { kind: "open_house", label: "9 OAK ST., Draper, UT 84020", people: [{ contact_id: "b", first_name: "Bo" }] },
  ])!;
  assert.equal(d.sources.length, 1);
  for (const { person, source } of waitingOldestFirst(d)) assert.ok(whereLine(person, source).length > 0);
  assert.match(whereLine(d.sources[0].people[0], d.sources[0]), /Signed in at 9 Oak St/);
});

test("the side panel lists everyone oldest first; a sorted face leaves and the count drops", () => {
  const d = demoNewToSort();
  assert.equal(countOf(d), 3);
  assert.equal(d.sources.length, 1); // Saturday's two spellings of 1482 Maple Ridge Dr
  assert.deepEqual(waitingOldestFirst(d).map((x) => x.person.firstName), ["Kim", "Sam", "Jordan"]);
  const after = withoutPerson(d, "mv-n1");
  assert.equal(countOf(after), 2);
  assert.equal(countOf(withoutPerson(withoutPerson(after, "mv-n2"), "mv-n3")), 0);
});

test("the orb is always on ONE MOVE: yellow with the count, a green ring and the empty line when no one waits", () => {
  const on = withNewToSort(bare(), demoNewToSort()).nodes.find((n) => n.id === NTS_NODE)!;
  assert.equal(on.parentId, "move");
  assert.equal(on.status, "attention");
  assert.equal(on.needCount, 3);
  const empty = withNewToSort(bare(), { sources: [], fromMove: true }).nodes.find((n) => n.id === NTS_NODE)!;
  assert.equal(empty.status, "healthy");
  assert.equal(empty.summary, EMPTY_LINE);
  assert.equal(empty.needCount, undefined);
  assert.equal(withNewToSort({ nodes: [{ ...move, locked: true }], edges: [] }, demoNewToSort()).nodes.length, 1);
  // its menu row opens the same view
  assert.equal(inBrainPage(NTS_NODE)?.label, "New to Sort");
  // the example agent keeps its own orb id, now on ONE MOVE with the count
  const demo = withNewToSort(demoGraph("complete"), demoNewToSort());
  assert.equal(demo.nodes.filter((n) => n.label === "New to Sort").length, 1);
  assert.equal(demo.nodes.find((n) => n.id === DEMO_NTS_NODE)!.needCount, 3);
});

test("until ONE MOVE's route answers: today's unreached leads from the four sources only", () => {
  const more = { firstName: null, nameMissing: false, today: true, attempts: 0, lastAttempt: null, followUpOn: null };
  const d = fromNewLeads({ today: "2026-10-17", count: 3, untouched: 2, people: [
    { ...more, id: "1", name: "Ann Lee", source: "Website Property Valuation", at: "2026-10-17T15:00:00Z", touched: false },
    { ...more, id: "2", name: "Raj Patel", source: "Zillow", at: "2026-10-17T14:00:00Z", touched: false },
    { ...more, id: "3", name: "Cy Do", source: "Open house", at: "2026-10-17T13:00:00Z", touched: true },
  ] })!;
  assert.equal(d.fromMove, false);
  assert.deepEqual(d.sources.map((s) => s.kind), ["website"]);
  assert.equal(fromNewLeads(null), null);
});

test("sorting: ONE MOVE's route first; Hot/Warm/Cold fall back to the Hot/Warm/Cold add; the rest say they are coming", async () => {
  const p = demoNewToSort().sources[0].people[0];
  const calls: string[] = [];
  const ok = (async (u: string) => (calls.push(String(u)), new Response("{}", { status: 200 }))) as typeof fetch;
  assert.deepEqual(await sortPerson(p, "warm", ok), { ok: true, line: "Kim is Warm now." });
  assert.match(calls[0], /new-to-sort\/sort$/);
  calls.length = 0;
  const missing = (async (u: string) => (calls.push(String(u)), new Response("{}", { status: String(u).endsWith("/sort") ? 404 : 200 }))) as typeof fetch;
  assert.equal((await sortPerson(p, "cold", missing)).ok, true);
  assert.match(calls[1], /hwc\/add$/);
  assert.deepEqual(await sortPerson(p, "vip100", missing), { ok: false, line: COMING });
  const down = (async () => { throw new TypeError("no CORS"); }) as typeof fetch;
  assert.deepEqual(await sortPerson(p, "not_for_me", down), { ok: false, line: COMING });
  assert.equal((await sortPerson(p, "not_for_me", ok)).line, "Kim is archived. Nothing was deleted.");
});

test("source words: open_house, open-house and open house are all an open house", async () => {
  const { kindOfSource } = await import("../lib/newToSort.ts");
  for (const s of ["open_house", "Open-House", "open house", "OpenHouse"]) assert.equal(kindOfSource(s), "open_house", s);
  assert.equal(kindOfSource("Zillow"), null);
});

test("ONE MOVE's live route shape {count, sources}; a 409 shows MASTER's own words", async () => {
  const d = readNewToSort({ count: 1, sources: [{ key: "k", kind: "tour", label: "Tours", date: null, people: [{ contact_id: "c1", first_name: "Lia", name: "Lia Moss", where_plain: "On Thursday's tour", said: null, rating: null, phone: null, email: null, at: "2026-10-16T10:00:00Z", suggest: { class: "hot", line: "Pulse suggests Hot: said Yes to 2 homes." } }] }] })!;
  assert.equal(countOf(d), 1);
  assert.deepEqual(d.sources[0].people[0].suggest, { cls: "hot", line: "Pulse suggests Hot: said Yes to 2 homes." });
  const conflict = (async () => new Response(JSON.stringify({ ok: false, error: "Lia is already in your VIP-50." }), { status: 409 })) as typeof fetch;
  assert.deepEqual(await sortPerson(d.sources[0].people[0], "hot", conflict), { ok: false, line: "Lia is already in your VIP-50." });
});
