import { test } from "node:test";
import assert from "node:assert/strict";
import { START_KEYS, START_NODE, badgeLine, buttonWords, demoStart, filmKey, minutesWords, movePathOf, placeFor, readStart, shownSteps, startAgentUrl, startLine, startMenuLine, startUrl, withStartNode } from "../lib/gettingStarted.ts";
import { needsOf } from "../lib/needs.ts";
import type { GraphEdge, GraphNode } from "../lib/graph/types.ts";

const g = (locked = false) => ({ nodes: [{ id: "one", type: "core", label: "ONE", parentId: null, product: "one", importance: 1 }, { id: "go", type: "product", label: "ONE YOU", parentId: "one", product: "go", importance: 0.95, locked }, { id: "go-plan", type: "feature", label: "Plan my day", parentId: "go", product: "go", importance: 1 }] as GraphNode[], edges: [] as GraphEdge[] });
const ids = { goals: "go-goals", plan: "go-plan", week: "go-week", challenge: "go-challenge" };

test("reads ONE MOVE's answer field by field (vip50-web-crm app/api/brain/getting-started)", () => {
  assert.equal(startUrl, "https://move.vip50one.com/api/brain/getting-started");
  assert.equal(startAgentUrl("a b"), "https://move.vip50one.com/api/brain/getting-started?agent=a%20b");
  assert.equal(readStart(null), null);
  assert.equal(readStart({ error: "x" }), null);
  assert.equal(readStart({ steps: [] }), null);
  const s = readStart({
    steps: [
      { key: "voice", n: 2, label: "Teach Pulse", why: "w", minutes: 5, done: false, fits: true, optional: false, url: "javascript:alert(1)" },
      { key: "profile", n: 1, label: "My Profile", why: "w", minutes: 10, done: true, fits: true, optional: false, url: "https://move.vip50one.com/profile" },
      { key: "website", n: 10, label: "Site", why: "w", minutes: 15, done: false, fits: true, optional: false, url: "https://move.vip50one.com/profile/agent-hub", subs: [{ key: "site:page", label: "Check your personal page", done: true, needed: true }, { key: "site:reviews", label: "Review", done: false, needed: false }] },
      { key: "challenge", n: 12, label: "Optional", why: "w", minutes: 5, done: false, fits: true, optional: true, url: "https://move.vip50one.com/challenge" },
      { key: "hidden", n: 13, label: "Not in package", fits: false },
    ],
    done: 1, of: 3, next: "voice", folded: false, finished_at: null, badge: { name: "Launched", xp: 100, earned: false },
  })!;
  assert.deepEqual(s.steps.map((x) => x.key), ["profile", "voice", "website", "challenge", "hidden"], "in Parry's order");
  assert.equal(s.steps[1].url, null, "only https links");
  assert.deepEqual(s.steps[2].subs.map((x) => [x.key, x.done, x.needed]), [["site:page", true, true], ["site:reviews", false, false]]);
  assert.equal(startLine(s), "1 of 3");
  assert.equal(s.next, "voice");
  assert.deepEqual(shownSteps(s).map((x) => x.key), ["profile", "voice", "website", "challenge"], "only steps that fit show");
  assert.equal(badgeLine(s), null);
  assert.equal(badgeLine({ ...s, badge: { ...s.badge, earned: true } }), "Launched: +100 XP");
});

test("the example list: 4 of 11, every key in order, no network", () => {
  const s = demoStart();
  assert.deepEqual(s.steps.map((x) => x.key), [...START_KEYS]);
  assert.equal(startLine(s), "4 of 11");
  assert.equal(s.next, "vips");
  assert.ok(s.steps.find((x) => x.key === "website")!.subs.length > 2);
});

test("the orb sits at the top of ONE YOU and pulses yellow until done; folded it leaves unless reopened", () => {
  const s = demoStart();
  const out = withStartNode(g(), s);
  const n = out.nodes.find((x) => x.id === START_NODE)!;
  assert.equal(n.parentId, "go");
  assert.equal(n.secondaryLabel, "4 of 11");
  assert.equal(n.status, "attention");
  assert.ok(out.nodes.filter((x) => x.parentId === "go").every((x) => x.id === START_NODE || x.importance < n.importance), "first round ONE YOU");
  assert.equal(needsOf(out.nodes).get("go")?.level, "today");
  assert.equal(withStartNode(out, s).nodes.filter((x) => x.id === START_NODE).length, 1);
  assert.equal(withStartNode(g(), { ...s, folded: true }).nodes.some((x) => x.id === START_NODE), false);
  assert.equal(withStartNode(g(), { ...s, folded: true }, true).nodes.some((x) => x.id === START_NODE), true, "reopened from the menu");
  assert.equal(withStartNode(g(true), s).nodes.some((x) => x.id === START_NODE), false, "ONE YOU locked");
  assert.equal(withStartNode(g(), null).nodes.some((x) => x.id === START_NODE), false);
  const done = withStartNode(g(), { ...s, done: 11, badge: { ...s.badge, earned: true } }, true).nodes.find((x) => x.id === START_NODE)!;
  assert.equal(done.status, "healthy");
  assert.match(done.summary!, /Launched: \+100 XP/);
  assert.equal(startMenuLine(s), "4 of 11 done. Reopen your first-days list.");
});

test("each step's button goes to the Brain's own place first", () => {
  const s = demoStart();
  const at = (k: string) => placeFor(s.steps.find((x) => x.key === k)!, ids);
  assert.deepEqual(at("profile"), { kind: "profile", hash: null });
  assert.deepEqual(at("voice"), { kind: "profile", hash: "pulse" });
  assert.deepEqual(at("pulse_modes"), { kind: "profile", hash: "pulse" });
  assert.deepEqual(at("goals"), { kind: "orb", id: "go-goals" });
  assert.deepEqual(at("plan"), { kind: "orb", id: "go-plan" });
  assert.deepEqual(at("commitments"), { kind: "orb", id: "go-week" });
  assert.deepEqual(at("films"), { kind: "films" });
  assert.deepEqual(at("challenge"), { kind: "orb", id: "go-challenge" });
  assert.deepEqual(at("calendar"), { kind: "url", url: "https://move.vip50one.com/calendar" });
  assert.equal(buttonWords(at("go")), "Get ONE GO");
  assert.equal(movePathOf("https://move.vip50one.com/contacts"), "/contacts");
  assert.equal(movePathOf("https://apps.apple.com/app/id1"), null);
  assert.equal(minutesWords(10), "About 10 minutes");
  assert.equal(minutesWords(0), null);
});

test("films: a and b only", () => {
  assert.equal(filmKey("a"), "films:a");
  assert.equal(filmKey("b"), "films:b");
  assert.equal(filmKey("c"), null);
  assert.equal(filmKey(undefined), null);
});

test("the films route asks MASTER with the one-brain partner secret and never sends it to the page", async () => {
  const { readFileSync } = await import("node:fs");
  const r = readFileSync("app/api/start/film/route.ts", "utf8");
  assert.match(r, /rpc\/vip_start_mark/);
  assert.match(r, /p_partner: "one-brain", p_secret: secret, p_email: me\.email, p_key: key/);
  assert.match(r, /await signedIn\(\)/);
  assert.doesNotMatch(r, /console\./);
  assert.doesNotMatch(r, /Response\.json\([^)]*secret/);
  const b = readFileSync("components/brain/Brain.tsx", "utf8");
  assert.match(b, /onEnded=\{\(\) => markFilm\("a"\)\}/);
  assert.match(b, /onEnded=\{\(\) => markFilm\("b"\)\}/);
});

test("the team welcome is gone from the Brain; the team ads consent stays on My Profile", async () => {
  const { existsSync, readFileSync } = await import("node:fs");
  assert.equal(existsSync("components/brain/TeamWelcome.tsx"), false);
  const b = readFileSync("components/brain/Brain.tsx", "utf8");
  assert.doesNotMatch(b, /TeamWelcome|welcomeUrl|setWelcomeOpen/);
  assert.match(readFileSync("components/brain/ProfileCards.tsx", "utf8"), /readAdsConsent/);
});
