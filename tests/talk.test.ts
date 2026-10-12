import { test } from "node:test";
import assert from "node:assert/strict";
import { applyBody, readProposal, savedLine, whenWords } from "../lib/talk.ts";

test("proposal reads fields and follow-up; bad shape keeps the agent's words", () => {
  const p = readProposal({ note: "Talked about the move.", fields: [{ key: "kids", label: "Kids", value: "Ava, Max", was: "Ava" }, { key: "x" }], follow_up: { title: "Send school list", in_days: 3 }, by: "pulse" }, "raw");
  assert.equal(p.fields.length, 1);
  assert.deepEqual(p.followUp, { title: "Send school list", inDays: 3 });
  assert.equal(readProposal(null, "  they bought a boat ").note, "they bought a boat");
  assert.equal(readProposal({ follow_up: { title: "x", in_days: "3" } }, "w").followUp, null);
});

test("apply sends only what is kept", () => {
  const p = readProposal({ note: "n", fields: [{ key: "a", value: "1" }, { key: "b", value: "2" }], follow_up: { title: "t", in_days: 1 } }, "");
  assert.deepEqual(applyBody("c1", p, { note: false, fields: new Set(["b"]), followUp: true }), { contact_id: "c1", note: null, fields: [{ key: "b", value: "2" }], follow_up: { title: "t", in_days: 1 } });
  assert.equal(applyBody("c1", p, { note: true, fields: new Set(), followUp: false }).follow_up, null);
});

test("saved line in plain words", () => {
  assert.equal(savedLine({ ok: true, saved: { note: true, fields: 2, task: true } }), "Saved: the note, 2 facts and a follow-up.");
  assert.equal(savedLine({ ok: true, saved: { note: true, fields: 0, task: false } }), "Saved: the note.");
  assert.equal(savedLine({ ok: false }), null);
  assert.equal(whenWords(1), "tomorrow");
});
