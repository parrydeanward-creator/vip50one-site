import { test } from "node:test";
import assert from "node:assert/strict";
import { engineUrl, monthOf, questions, readResults, tallyLine, withAskAiNode, ASK_AI_NODE } from "../lib/aiCheck.ts";

test("questions use the agent's name and area", () => {
  const q = questions("Sarah Bennett", "Draper, Utah");
  assert.equal(q.length, 3);
  assert.match(q[0].text, /Sarah Bennett.*Draper, Utah/);
  assert.match(questions("", "")[1].text, /my area/);
});

test("engine links carry the question and send nothing", () => {
  assert.equal(engineUrl("google", "a b?"), "https://www.google.com/search?q=a%20b%3F");
  assert.match(engineUrl("chatgpt", "x"), /^https:\/\/chatgpt\.com\/\?q=x$/);
  assert.match(engineUrl("perplexity", "x"), /^https:\/\/www\.perplexity\.ai\/search\?q=x$/);
});

test("results keep only good answers; tally line", () => {
  const r = readResults({ "who:google": "named", "best:chatgpt": "not_named", "x:y": "named", "who:chatgpt": "maybe" });
  assert.deepEqual(r, { "who:google": "named", "best:chatgpt": "not_named" });
  assert.equal(tallyLine(r), "Named in 1 of 2 answers");
  assert.equal(tallyLine({}), "Not checked yet this month");
  assert.equal(monthOf("2026-10-12"), "2026-10");
});

test("orb sits under ONE YOU, gold until checked, never when locked", () => {
  const g = { nodes: [{ id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 1 }] as never[], edges: [] };
  const a = withAskAiNode(g, {});
  assert.equal((a.nodes.find((n: { id: string }) => n.id === ASK_AI_NODE) as unknown as { status?: string } | undefined)?.status, "opportunity");
  const b = withAskAiNode(g, { "who:google": "named" });
  assert.equal((b.nodes.find((n: { id: string }) => n.id === ASK_AI_NODE) as unknown as { status?: string } | undefined)?.status, "healthy");
  const locked = { ...g, nodes: [{ ...(g.nodes[0] as object), locked: true }] as never[] };
  assert.equal(withAskAiNode(locked, {}).nodes.some((n: { id: string }) => n.id === ASK_AI_NODE), false);
});
