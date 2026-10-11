import { test } from "node:test";
import assert from "node:assert/strict";
import { LIKELY_NODE, levelLine, demoMoveLikely, levelWord, notedLine, readMoveLikely, withMoveLikelyNode, withoutPerson } from "../lib/moveLikely.ts";

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
  assert.equal(node(null), undefined);
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
