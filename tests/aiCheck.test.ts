import { test } from "node:test";
import assert from "node:assert/strict";
import { engineUrl, monthOf, questions, readResults, tallyLine, askAiCard, ASK_AI_NODE } from "../lib/aiCheck.ts";
import { groupOneYou } from "../lib/youGroups.ts";
import type { GraphNode } from "../lib/graph/types.ts";

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

// Parry, 19 Oct: Ask AI about you moved off the ONE YOU map onto My Profile (rewritten from the old "orb under ONE
// YOU" test: the rule changed on purpose). The card says this month's tally and is due until the first answer.
test("Ask AI about you is a My Profile card, not an orb", () => {
  assert.deepEqual(askAiCard({}), { title: "Ask AI about you", line: "Once a month: do ChatGPT, Perplexity and Google name you? Not checked yet this month.", due: true });
  const c = askAiCard({ "who:google": "named", "best:google": "not_named" });
  assert.equal(c.due, false);
  assert.match(c.line, /Named in 1 of 2 answers\.$/);
  const g = { nodes: [{ id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 1 }, { id: ASK_AI_NODE, type: "feature", label: "Ask AI about you", parentId: "go", product: "go", importance: 1 }] as GraphNode[], edges: [] };
  assert.equal(groupOneYou(g).nodes.some((n) => n.id === ASK_AI_NODE), false);
});

// Parry/ONE MOVE (vip50-web-crm#326): the check is kept in MASTER; the Brain reads and writes it through the route.
import { aiCheckBody, aiCheckUrl, cardFor, readAiCheck } from "../lib/aiCheck.ts";

test("the route is ONE MOVE's ai-check", () => {
  assert.equal(aiCheckUrl, "https://move.vip50one.com/api/brain/ai-check");
});

test("reads the route's answer", () => {
  const c = readAiCheck({
    month: "2026-10",
    results: { "who:chatgpt": "named", "best:google": "not_named", "bad:key": "named", "who:google": "maybe" },
    area: "Draper, Utah",
    name: "Sarah Bennett",
    last_month: { "who:chatgpt": "not_named" },
    card: { title: "Ask AI about you", line: "Named in 1 of 2 answers.", due: false },
  })!;
  assert.equal(c.month, "2026-10");
  assert.deepEqual(c.results, { "who:chatgpt": "named", "best:google": "not_named" });
  assert.equal(c.area, "Draper, Utah");
  assert.equal(c.name, "Sarah Bennett");
  assert.deepEqual(c.lastMonth, { "who:chatgpt": "not_named" });
  assert.deepEqual(c.card, { title: "Ask AI about you", line: "Named in 1 of 2 answers.", due: false });
  // the card line comes from the route
  assert.equal(cardFor(c, c.results).line, "Named in 1 of 2 answers.");
  // no card from the route: the local wording
  const bare = readAiCheck({ month: "2026-10", results: {} })!;
  assert.equal(bare.card, null);
  assert.equal(bare.lastMonth, null);
  assert.equal(cardFor(bare, {}).due, true);
  assert.equal(readAiCheck(null), null);
  assert.equal(readAiCheck({ results: {} }), null);
  assert.equal(readAiCheck({ month: "2026-10" }), null);
});

test("the POST body: one mark, a clear, or the area", () => {
  assert.deepEqual(aiCheckBody({ mark: { key: "who:chatgpt", answer: "named" } }), { results: { "who:chatgpt": "named" } });
  assert.deepEqual(aiCheckBody({ mark: { key: "best:google", answer: null } }), { results: { "best:google": null } });
  assert.deepEqual(aiCheckBody({ area: "Draper, Utah" }), { area: "Draper, Utah" });
  assert.deepEqual(aiCheckBody({ mark: { key: "who:bing", answer: "named" } }), {});
  assert.equal(JSON.stringify(aiCheckBody({ mark: { key: "who:chatgpt", answer: null } })), '{"results":{"who:chatgpt":null}}');
});
