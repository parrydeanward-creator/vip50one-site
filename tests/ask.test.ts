import { test } from "node:test";
import assert from "node:assert/strict";
import { demoGraph } from "../lib/graph/demo.ts";
import { indexGraph } from "../lib/graph/model.ts";
import { layout } from "../lib/brain/layout.ts";
import { MAX_RESULTS, SUGGESTED, answerSet, candidates, claimsAction, factsFor, intentOf, rulesAnswer, validate } from "../lib/ask.ts";

const ix = indexGraph(demoGraph("complete"));
const ok = new Set(candidates(ix).map((n) => n.id));

test("candidates exclude ONE, the product orbs and locked products", () => {
  assert.ok(!ok.has("one"));
  for (const p of ["go", "move", "marquee", "showly", "open"]) assert.ok(!ok.has(p));
  const rel = indexGraph(demoGraph("relationship"));
  for (const n of candidates(rel)) assert.ok(!["marquee", "showly", "open"].includes(n.product), n.id);
});

test("every suggested question gets an answer with real nodes and a WHY for each", () => {
  for (const q of SUGGESTED) {
    const a = rulesAnswer(q, ix);
    assert.ok(a.answer.length > 0, q);
    assert.ok(a.results.length > 0 && a.results.length <= MAX_RESULTS, q);
    for (const r of a.results) {
      assert.ok(ok.has(r.id), `${q}: ${r.id}`);
      assert.ok(r.reasons.length > 0, `${q}: ${r.id} has no WHY`);
    }
    assert.ok(!claimsAction(a.answer), q);
  }
});

test("intents", () => {
  assert.equal(intentOf("Who should I call today?"), "call");
  assert.equal(intentOf("Which relationships am I neglecting?"), "neglect");
  assert.equal(intentOf("How am I tracking?"), "tracking");
  assert.equal(intentOf("What needs my attention today?"), "attention");
  assert.equal(intentOf("Maple Ridge"), "search");
});

test("who to call: people only, a Call first", () => {
  const a = rulesAnswer("Who should I call today?", ix);
  assert.ok(a.results.every((r) => ix.byId.get(r.id)!.type === "person"));
  assert.equal(a.results[0].id, "p-jen", "ONE's own recommendation and a call: Jen first");
  assert.ok(a.results.find((r) => r.id === "p-amy")!.reasons.length >= 2, "WHY is more than one thin fact");
});

test("WHY for Jen comes from the recommendation written about her", () => {
  assert.ok(factsFor(ix, "p-jen").some((f) => /birthday/i.test(f)));
});

test("search finds a property by name", () => {
  const a = rulesAnswer("What's happening with Maple Ridge?", ix);
  assert.ok(a.results.some((r) => /maple ridge/i.test(ix.byId.get(r.id)!.label)));
});

test("validate keeps only real candidate ids, once, up to the limit", () => {
  const raw = {
    answer: "Call Jen first.",
    results: [
      { id: "p-jen", reasons: ["Birthday tomorrow."] },
      { id: "p-jen", reasons: ["dupe"] },
      { id: "made-up", reasons: ["x"] },
      { id: "one", reasons: ["the core is not an answer"] },
      { id: "p-amy", reasons: [] },
      ...["p-marcus", "p-millers", "p-dave", "p-parkers", "task-rate"].map((id) => ({ id, reasons: ["r"] })),
    ],
  };
  const v = validate(raw, "Who?", ix)!;
  assert.deepEqual(v.results.map((r) => r.id), ["p-jen", "p-amy", "p-marcus", "p-millers", "p-dave", "p-parkers"]);
  assert.ok(v.results[1].reasons.length > 0, "empty reasons are filled from the facts");
});

test("validate throws away an answer that claims ONE acted for the agent", () => {
  for (const answer of ["I've sent Jen a text.", "Your posts have been published.", "ONE scheduled the call for you.", "We booked the showing."]) {
    assert.equal(validate({ answer, results: [] }, "q", ix), null, answer);
  }
  assert.ok(validate({ answer: "Send Jen a text before noon.", results: [] }, "q", ix));
  assert.equal(validate({ answer: "", results: [] }, "q", ix), null);
});

test("answer layout: ONE in the centre, the answer around it, no overlaps", () => {
  const a = rulesAnswer("What needs my attention today?", ix);
  const vs = answerSet(ix, a.results.map((r) => r.id));
  assert.equal(vs.focus.id, "one");
  assert.equal(vs.nodes.filter((v) => v.role === "child").length, a.results.length);
  const placed = layout(vs);
  const f = placed.find((p) => p.role === "focus")!;
  assert.deepEqual([f.x, f.y], [0, 0]);
  for (let i = 0; i < placed.length; i++)
    for (let j = i + 1; j < placed.length; j++) {
      const p = placed[i], q = placed[j];
      assert.ok(Math.hypot(p.x - q.x, p.y - q.y) >= p.r + q.r, `${p.id} overlaps ${q.id}`);
    }
});
