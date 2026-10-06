import { test } from "node:test";
import assert from "node:assert/strict";
import { askItems } from "../lib/ask.ts";
import { bearerOf } from "../lib/bearer.ts";
import { indexGraph } from "../lib/graph/model.ts";

const req = (h: string | null) => ({ headers: { get: (n: string) => (n.toLowerCase() === "authorization" ? h : null) } });

test("one Pulse for ONE GO: a bearer token is read, anything else is ignored", () => {
  const jwt = "eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJlLXNpZ25hdHVyZQ";
  assert.equal(bearerOf(req(`Bearer ${jwt}`)), jwt);
  assert.equal(bearerOf(req(null)), undefined, "a browser with a cookie sends none");
  assert.equal(bearerOf(req("Basic abc")), undefined);
  assert.equal(bearerOf(req("Bearer short")), undefined);
  assert.equal(bearerOf(req(`Bearer ${jwt} extra`)), undefined);
});

test("§3m items: what the phone can open for each result, only real nodes", () => {
  const ix = indexGraph({
    rootId: "one",
    edges: [],
    nodes: [
      { id: "one", type: "core", label: "ONE", parentId: null, product: "one", importance: 1 },
      { id: "live:go:task:11111111-1111-4111-8111-111111111111", type: "person", label: "Sarah Mitchell", parentId: "one", product: "move", importance: 1, contactId: "22222222-2222-4222-8222-222222222222", href: "https://move.vip50one.com/contacts?id=2" },
      { id: "move", type: "product", label: "ONE MOVE", parentId: "one", product: "move", importance: 1, href: "javascript:alert(1)" },
    ],
  });
  const items = askItems(ix, {
    question: "who should I call",
    answer: "Call Sarah.",
    source: "rules",
    results: [
      { id: "live:go:task:11111111-1111-4111-8111-111111111111", reasons: ["Follow-up 3 days late.", "On your VIP-50.", "Birthday soon.", "extra"] },
      { id: "move", reasons: [] },
      { id: "made-up", reasons: ["x"] },
    ],
  });
  assert.equal(items.length, 2, "an id that is not in the graph is dropped");
  assert.deepEqual(items[0], { title: "Sarah Mitchell", reasons: ["Follow-up 3 days late.", "On your VIP-50.", "Birthday soon."], ref: "go:task:11111111-1111-4111-8111-111111111111", contact_id: "22222222-2222-4222-8222-222222222222", link: "https://move.vip50one.com/contacts/22222222-2222-4222-8222-222222222222" }, "a person links to their own contact (Parry, 6 Oct), not the item's general page");
  assert.deepEqual(items[1], { title: "ONE MOVE", reasons: [], ref: null, contact_id: null, link: null }, "only https links");
});
