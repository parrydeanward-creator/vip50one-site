import { test } from "node:test";
import assert from "node:assert/strict";
import { UNDO_MS, confirmWords, deleteManyUrl, deleteOneUrl, deleteRequest, dropPeople, failWords, firstOf, heldWords, holdDelete, putBack, readDeleted } from "../lib/deleteContact.ts";
import type { GraphNode } from "../lib/graph/types.ts";

// Delete a contact from the Brain (walker 2026-10-17-0042), on ONE MOVE's routes (vip50-web-crm#286):
// DELETE /api/brain/people/[id] and POST /api/brain/people/delete {ids}, both answering {ok, deleted}.
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

test("the routes are ONE MOVE's, one DELETE or one POST {ids}", () => {
  assert.equal(deleteOneUrl(A), `https://move.vip50one.com/api/brain/people/${A}`);
  assert.equal(deleteManyUrl, "https://move.vip50one.com/api/brain/people/delete");
  const one = deleteRequest([A, A])!;
  assert.equal(one.url, deleteOneUrl(A));
  assert.equal(one.init.method, "DELETE");
  assert.equal(one.init.credentials, "include");
  const many = deleteRequest([A, B, A])!;
  assert.equal(many.url, deleteManyUrl);
  assert.equal(many.init.method, "POST");
  assert.deepEqual(JSON.parse(String(many.init.body)), { ids: [A, B] });
  assert.equal(deleteRequest([]), null);
  assert.equal(deleteRequest(["", " "]), null);
});

test("the words name the person", () => {
  assert.equal(firstOf("Rosa Diaz"), "Rosa");
  assert.equal(firstOf("  "), "this contact");
  assert.equal(firstOf(null), "this contact");
  assert.equal(confirmWords("Rosa"), "Delete Rosa? Their notes, tasks and history go too.");
  assert.equal(confirmWords("x", 3), "Delete 3 contacts? Their notes, tasks and history go too.");
  assert.equal(heldWords("Rosa"), "Deleted Rosa.");
  assert.match(failWords("Rosa"), /^Rosa was not deleted/);
  assert.equal(UNDO_MS, 6000);
});

test("readDeleted: ok only when ONE MOVE says so; a 404 is already gone", () => {
  assert.deepEqual(readDeleted(200, { ok: true, deleted: 1 }), { ok: true, deleted: 1 });
  assert.deepEqual(readDeleted(200, { ok: true }), { ok: true, deleted: 0 });
  assert.deepEqual(readDeleted(404, { ok: false, error: "Not found." }), { ok: true, deleted: 0 });
  assert.deepEqual(readDeleted(200, { ok: false }), { ok: false });
  assert.deepEqual(readDeleted(403, { ok: false, error: "Forbidden." }), { ok: false });
  assert.deepEqual(readDeleted(500, null), { ok: false });
  assert.deepEqual(readDeleted(401, "x"), { ok: false });
});

const node = (id: string, parentId: string | undefined, contactId?: string): GraphNode =>
  ({ id, type: "person", label: id, parentId, product: "move", importance: 0.5, contactId }) as GraphNode;

test("dropPeople takes the person and everything under them off the map; putBack returns them", () => {
  const g = { nodes: [node("move", undefined), node("p1", "move", A), node("p1-k", "p1"), node("t1", "move", A), node("p2", "move", B)] };
  const { graph, removed } = dropPeople(g, (n) => n.contactId === A);
  assert.deepEqual(graph.nodes.map((n) => n.id), ["move", "p2"]);
  assert.deepEqual(removed.map((n) => n.id).sort(), ["p1", "p1-k", "t1"]);
  assert.deepEqual(putBack(graph, removed).nodes.map((n) => n.id).sort(), ["move", "p1", "p1-k", "p2", "t1"]);
  // already back: nothing twice
  const back = putBack(graph, removed);
  assert.equal(putBack(back, removed), back);
  // nothing matched: the same graph
  assert.equal(dropPeople(g, () => false).graph, g);
});

function clock() {
  let next: { f: () => void; ms: number } | null = null;
  let cleared = 0;
  return {
    setTimer: (f: () => void, ms: number) => ((next = { f, ms }), 1),
    clearTimer: () => void cleared++,
    tick: () => next?.f(),
    get ms() { return next?.ms; },
    get cleared() { return cleared; },
  };
}

test("holdDelete: runs after 6 seconds, once; Undo cancels and nothing runs", () => {
  const c = clock();
  let ran = 0;
  const h = holdDelete({ run: () => ran++, setTimer: c.setTimer, clearTimer: c.clearTimer });
  assert.equal(c.ms, 6000);
  assert.equal(h.held(), true);
  c.tick();
  c.tick();
  assert.equal(ran, 1);
  assert.equal(h.undo(), false); // too late: it went
  const c2 = clock();
  let ran2 = 0;
  const u = holdDelete({ run: () => ran2++, setTimer: c2.setTimer, clearTimer: c2.clearTimer });
  assert.equal(u.undo(), true);
  c2.tick();
  assert.equal(ran2, 0);
  assert.equal(u.flush(), false);
  assert.equal(c2.cleared, 1);
});

test("holdDelete: flush sends it now (a second delete, or the page closing)", () => {
  const c = clock();
  let ran = 0;
  const h = holdDelete({ run: () => ran++, setTimer: c.setTimer, clearTimer: c.clearTimer });
  assert.equal(h.flush(), true);
  c.tick();
  assert.equal(ran, 1);
  assert.equal(h.held(), false);
});
