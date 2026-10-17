import { test } from "node:test";
import assert from "node:assert/strict";
import { liveGraph, type SummaryEnvelope } from "../lib/live.ts";
import { moveGroupId, movePageId } from "../lib/moveMenu.ts";
import { demoGraph } from "../lib/graph/demo.ts";
import { LEARN_FILMS, LEARN_PANEL_FIRST, LEARN_START, demoLearn, learnPartOf, newsLine, openTarget, readHits, readLearn, searchable, vaultLine, videosLine, withLearnNodes } from "../lib/learn.ts";

// Learn shows what is inside (walker 2026-10-17-0245), checked on a live-shaped graph and the example agent's.

const MASTER: SummaryEnvelope = { v: 1, product: "go", found: true, stats: [], items: [] };
const opts = { pkg: "complete" as const, firstName: "Parry", reachable: true, today: "2026-10-17" };
const ROUTE = {
  next_video: { id: "v1", title: "Week one", url: "https://move.vip50one.com/content?v=v1", category: "Start" },
  watched: null,
  total: 11,
  whats_new: [
    { date: "2026-10-10", title: "Old", body: "b", href: "/deals" },
    { date: "2026-10-17", title: "Newest", body: null, href: "javascript:alert(1)" },
    { date: "2026-10-12", title: "Middle", body: "m", href: null },
    { date: "2026-10-01", title: "Oldest", body: "o", href: null },
  ],
  vault: { count: 24, newest: [{ id: "x1", title: "Script", category: "Scripts", added: "2026-10-16" }] },
};

test("the route is read: What's New newest first, three at most; unsafe links dropped", () => {
  const l = readLearn(ROUTE)!;
  assert.deepEqual(l.whatsNew.map((n) => n.title), ["Newest", "Middle", "Old"]);
  assert.equal(l.whatsNew[0].href, null);
  assert.equal(l.nextVideo?.title, "Week one");
  assert.equal(l.vaultCount, 24);
  assert.equal(l.watched, null);
  assert.equal(readLearn({}), null);
});

test("never '0 of 11 watched' while watching is not counted", () => {
  assert.equal(videosLine(null, 11), "11 videos");
  assert.equal(videosLine(3, 11), "3 of 11 watched");
  assert.equal(videosLine(null, 1), "1 video");
  assert.equal(vaultLine(24), "24 items in the Vault");
  assert.equal(vaultLine(0), "Nothing in the Vault yet");
  assert.equal(newsLine([]), "Nothing new yet");
});

test("Learn's parts are orbs round the Learn orb; Learn home is not on the ring (live-shaped graph)", () => {
  const base = liveGraph(MASTER, opts, {});
  assert.ok(base.nodes.some((n) => n.id === movePageId("/learn")), "the live graph has the Learn home page");
  const g = withLearnNodes(base, readLearn(ROUTE));
  const gid = moveGroupId("learn");
  const kids = g.nodes.filter((n) => n.parentId === gid).map((n) => n.label);
  for (const k of ["Start here", "What's New", "The Vault", "Tour films", "Video Library", "VIP Docs"]) assert.ok(kids.includes(k), k);
  assert.ok(!g.nodes.some((n) => n.id === movePageId("/learn")));
  assert.equal(g.nodes.find((n) => n.id === LEARN_START)!.secondaryLabel, "Next: Week one");
  assert.equal(g.nodes.find((n) => n.id === movePageId("/vault"))!.secondaryLabel, "24 items in the Vault");
  assert.equal(withLearnNodes(g, readLearn(ROUTE)).nodes.filter((n) => n.id === LEARN_FILMS).length, 1);
});

test("the example agent gets the Learn orb and its parts too", () => {
  const g = withLearnNodes(demoGraph(), demoLearn("2026-10-17"));
  const gid = moveGroupId("learn");
  assert.ok(g.nodes.some((n) => n.id === gid && n.parentId === "move"));
  assert.deepEqual(g.nodes.filter((n) => n.parentId === gid).map((n) => n.label), ["Start here", "What's New", "The Vault", "Tour films"]);
});

test("which part an orb is; What's New and the Vault open on their panel first", () => {
  assert.equal(learnPartOf(LEARN_START), "start");
  assert.equal(learnPartOf(LEARN_FILMS), "films");
  assert.equal(learnPartOf(movePageId("/whats-new")), "whats_new");
  assert.equal(learnPartOf(movePageId("/vault")), "vault");
  assert.equal(learnPartOf(movePageId("/content")), null);
  assert.ok(LEARN_PANEL_FIRST.has("/vault") && !LEARN_PANEL_FIRST.has("/content"));
});

test("search: results read; a ONE MOVE page inside the Brain opens there, anything else in a new tab", () => {
  const hits = readHits({ results: [{ kind: "video", id: "v1", title: "Week one", detail: "Start", href: "https://move.vip50one.com/content" }, { kind: "pdf", id: "x", title: "x", href: "/x" }, { kind: "doc", id: "d1", title: "Doc", href: "http://insecure" }] });
  assert.deepEqual(hits.map((h) => h.id), ["v1"]);
  assert.deepEqual(readHits(null), []);
  assert.ok(!searchable("a") && searchable("ab"));
  assert.deepEqual(openTarget("https://move.vip50one.com/vault"), { kind: "brain", path: "/vault" });
  assert.deepEqual(openTarget("/whats-new"), { kind: "brain", path: "/whats-new" });
  assert.deepEqual(openTarget("https://move.vip50one.com/vault/abc"), { kind: "tab", url: "https://move.vip50one.com/vault/abc" });
  assert.deepEqual(openTarget("https://move.vip50one.com/content?v=1"), { kind: "tab", url: "https://move.vip50one.com/content?v=1" });
  assert.deepEqual(openTarget("https://youtube.com/watch?v=1"), { kind: "tab", url: "https://youtube.com/watch?v=1" });
});
