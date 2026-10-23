import { test } from "node:test";
import assert from "node:assert/strict";
import { DROP_BYS, M2_TOOLS, REF_AGENTS, dropByAreas, exampleMoveAnswer, m2KeyOf, m2Reduce, m2Start, makeExampleStore, withExampleMoveTools } from "../lib/examples/move2.ts";
import { listUrl, peopleUrl, personUrl, readGroups, readPage, readPerson, readTimeline, timelineUrl } from "../lib/people.ts";
import { readRoster, vipsUrl, vipTierUrl } from "../lib/vips.ts";
import { hwcUrl, readHwc } from "../lib/hwc.ts";
import { readRolodex, rolodexUrl } from "../lib/rolodex.ts";
import { touchUrl } from "../lib/contact.ts";
import { MOVE_MENU, movePageId } from "../lib/moveMenu.ts";

// ONE MOVE's example (walker 18 Oct; Parry: "the side information is blank"): the native views read the same readers a
// signed-in agent's do, so the example answers must pass them, and the actions must change what is drawn.

const TODAY = "2026-10-18";
const get = (s: ReturnType<typeof makeExampleStore>, url: string) => exampleMoveAnswer(s, "GET", url, null);
const post = (s: ReturnType<typeof makeExampleStore>, url: string, body: unknown) => exampleMoveAnswer(s, "POST", url, body);

test("Contacts: groups, a page, a person and their history read as ONE MOVE's do", () => {
  const s = makeExampleStore(TODAY);
  const g = readGroups(get(s, `${peopleUrl}/groups`)!.body);
  assert.ok(g);
  assert.ok(g.groups.find((x) => x.key === "vip50")!.count === 47);
  const page = readPage(get(s, listUrl({ group: "vip50", sort: "name", limit: 40 }))!.body);
  assert.ok(page);
  assert.equal(page.items.length, 40);
  assert.ok(page.next);
  assert.ok(page.items.every((i) => i.photo === null), "faces are initials only");
  const due = readPage(get(s, listUrl({ sort: "pulse", limit: 30 }))!.body)!;
  assert.ok(due.items.length >= 5 && due.items.every((i) => i.pulse));
  const found = readPage(get(s, listUrl({ q: "alvarez" }))!.body)!;
  assert.deepEqual(found.items.map((i) => i.name), ["Jen Alvarez"]);
  const p = readPerson(get(s, personUrl(found.items[0].id))!.body);
  assert.ok(p && p.sections.length >= 4);
  assert.ok(readTimeline(get(s, timelineUrl(p.id))!.body)!.events.length > 0);
});

test("Contacts: an edit and an add change the example, nothing else", () => {
  const s = makeExampleStore(TODAY);
  const id = s.people[0].id;
  const after = readPerson(post(s, personUrl(id), { fields: { favorite_restaurant: "Lucky Thai" } })!.body)!;
  assert.equal(after.sections.find((x) => x.key === "about")!.fields.find((f) => f.key === "favorite_restaurant")!.value, "Lucky Thai");
  const added = post(s, peopleUrl, { first_name: "Avery", last_name: "Stone", tier: "vip100" })!.body as { id: string };
  assert.ok(readPerson(get(s, personUrl(added.id))!.body));
  assert.equal(post(s, peopleUrl, { first_name: " " })!.status, 400);
});

test("VIP Management and Touch Audit: 47 of 50, a logged touch ticks the box", () => {
  const s = makeExampleStore(TODAY);
  const r = readRoster(get(s, vipsUrl)!.body)!;
  assert.equal(r.vip50.length, 47);
  assert.equal(r.vip100.length, 30);
  const who = r.vip50.find((p) => !p.month?.call)!;
  assert.deepEqual(post(s, touchUrl, { contact_id: who.id, kind: "call" })!.body, { ok: true });
  assert.equal(readRoster(get(s, vipsUrl)!.body)!.vip50.find((p) => p.id === who.id)!.month!.call, true);
  const up = r.vip100[0];
  post(s, vipTierUrl, { contact_id: up.id, tier: "vip50" });
  assert.equal(readRoster(get(s, vipsUrl)!.body)!.vip50.length, 48);
});

test("Hot/Warm/Cold: classes, opening ticks the day, a move moves", () => {
  const s = makeExampleStore(TODAY);
  const h = readHwc(get(s, hwcUrl)!.body)!;
  for (const c of ["hot", "warm", "cold"] as const) assert.ok(h.people.some((p) => p.cls === c));
  assert.equal(h.today.hot, false);
  assert.equal(readHwc(post(s, `${hwcUrl}/opened`, { class: "hot" })!.body)!.today.hot, true);
  const p = h.people.find((x) => x.cls === "cold")!;
  assert.equal(readHwc(post(s, `${hwcUrl}/move`, { id: p.id, class: "warm" })!.body)!.people.find((x) => x.id === p.id)!.cls, "warm");
  const ask = post(s, `${hwcUrl}/pulse`, { id: p.id })!.body as { summary: string };
  assert.match(ask.summary, /Example/);
});

test("Business Rolodex: share and add from the community", () => {
  const s = makeExampleStore(TODAY);
  const r = readRolodex(get(s, rolodexUrl)!.body)!;
  assert.ok(r.mine.length >= 8 && r.community.length >= 4);
  const b = r.mine.find((x) => !x.shared)!;
  assert.equal(readRolodex(post(s, `${rolodexUrl}/share`, { id: b.id, shared: true })!.body)!.mine.find((x) => x.id === b.id)!.shared, true);
  const after = readRolodex(post(s, `${rolodexUrl}/add`, { key: r.community[0].key })!.body)!;
  assert.equal(after.mine.length, r.mine.length + 1);
});

test("other calls are not answered here", () => {
  const s = makeExampleStore(TODAY);
  assert.equal(get(s, "https://move.vip50one.com/api/brain/deals"), null);
  assert.equal(get(s, "/api/live"), null);
});

test("every example tool is a ONE MOVE menu page with its orb", () => {
  const paths = new Set(MOVE_MENU.map((m) => m.path));
  for (const t of M2_TOOLS) {
    assert.ok(paths.has(t.path), t.path);
    assert.equal(m2KeyOf(movePageId(t.path)), t.key);
    assert.match(t.line, /^Example: /);
  }
  assert.equal(m2KeyOf("move-p-contacts"), null);
});

test("Drop-By Map groups by area and Mark done counts", () => {
  const areas = dropByAreas(DROP_BYS);
  assert.deepEqual(areas.map((a) => a.area), ["Bountiful", "Centerville", "Farmington", "Kaysville"]);
  const s = m2Reduce(m2Start(), { t: "drop", id: "db1" });
  assert.equal(s.drops.find((d) => d.id === "db1")!.done, true);
  assert.match(s.note.dropby!, /nothing was saved/);
});

// Rewritten 23 Oct: the Buyer Needs and Your listings example orbs are gone (Parry, 23 Oct: "retire buyers needs";
// "retire your listings already on the website"), so the test asserts they stay gone.
test("Buyer Needs and Your listings are retired from the example tools", () => {
  assert.deepEqual(M2_TOOLS.map((t) => t.path).filter((p) => p === "/buyer-needs" || p === "/listings"), []);
  assert.equal("needs" in m2Start(), false);
  assert.equal("listings" in m2Start(), false);
});

test("Referral Network: a sent referral is listed and says nothing was sent", () => {
  const s = m2Reduce(m2Start(), { t: "refer", client: "Trent Mayer", agentId: REF_AGENTS[1].id, note: "" });
  assert.equal(s.refs[0].client, "Trent Mayer");
  assert.equal(s.refs[0].status, "Sent");
  assert.match(s.note.referrals!, /Example: nothing was sent/);
  const bad = m2Reduce(m2Start(), { t: "refer", client: " ", agentId: REF_AGENTS[0].id, note: "" });
  assert.equal(bad.refs.length, m2Start().refs.length);
});

test("The Lounge: post, like and reply stay on screen", () => {
  let s = m2Reduce(m2Start(), { t: "post", text: "Hello team" });
  assert.equal(s.posts[0].text, "Hello team");
  assert.match(s.note.lounge!, /nothing was posted/);
  s = m2Reduce(s, { t: "like", id: "lp1" });
  assert.equal(s.liked.lp1, true);
  s = m2Reduce(s, { t: "reply", id: "lp1", text: "Nice" });
  assert.equal(s.posts.find((p) => p.id === "lp1")!.replies.at(-1)!.text, "Nice");
});

test("the walk-through's orbs hang under their groups, and move under Learn once it is there", () => {
  const base = { nodes: [{ id: "move", type: "product", label: "ONE MOVE", product: "move" }, { id: "move-g-trackers", type: "category", label: "Trackers", parentId: "move", product: "move" }], edges: [] } as unknown as Parameters<typeof withExampleMoveTools>[0];
  const g = withExampleMoveTools(base);
  const parent = (path: string, gr = g) => gr.nodes.find((n) => n.id === movePageId(path))!.parentId;
  assert.equal(parent("/analytics"), "move-g-trackers");
  assert.equal(parent("/content"), "move");
  const withLearn = withExampleMoveTools({ ...g, nodes: [...g.nodes, { id: "move-g-learn", type: "category", label: "Learn", parentId: "move", product: "move" } as (typeof g.nodes)[number]] });
  assert.equal(parent("/content", withLearn), "move-g-learn");
  assert.equal(parent("/vip-docs", withLearn), "move-g-learn");
  assert.equal(withLearn.nodes.filter((n) => n.id === movePageId("/content")).length, 1);
  assert.equal(withLearn.edges.filter((e) => e.target === movePageId("/content")).length, 1);
  assert.equal(withExampleMoveTools({ nodes: [{ id: "move", locked: true }], edges: [] } as unknown as Parameters<typeof withExampleMoveTools>[0]).nodes.length, 1);
});

test("each orb's line matches its example", () => {
  const line = (k: string) => M2_TOOLS.find((t) => t.key === k)!.line;
  const s = m2Start();
  assert.match(line("dropby"), new RegExp(`${s.drops.filter((d) => !d.done).length} drop-bys left`));
  assert.match(line("videos"), new RegExp(`${s.videos.length} videos · ${s.videos.filter((v) => v.watched).length} watched`));
});
