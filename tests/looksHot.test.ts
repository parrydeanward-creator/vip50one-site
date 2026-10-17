import { test } from "node:test";
import assert from "node:assert/strict";
import type { GraphNode } from "../lib/graph/types.ts";
import { COMING_CALL, EMPTY_LINE, LOOKS_NODE, actLooks, demoLooksHot, fromHeat, fromSignals, looksLine, mergeLooks, readLooksHot, readNotYet, shownLooks, withLooksHot, withNotYet } from "../lib/looksHot.ts";
import { demoHeat } from "../lib/heat.ts";
import { demoSignals } from "../lib/webSignals.ts";

const move: GraphNode = { id: "move", type: "product", label: "ONE MOVE", parentId: "one", product: "move", importance: 1 };

test("ONE MOVE's looks-hot list, checked; likely sellers, then high interest, then came back, newest first", () => {
  const l = readLooksHot([
    { contact_id: "a", first_name: "Ann", reason_plain: "Came back to your site 3 times this week", kind: "returned", at: "2026-10-16" },
    { contact_id: "b", first_name: "Bo", reason_plain: "Said Yes to 2 homes on Thursday's tour", kind: "interest", at: "2026-10-14" },
    { contact_id: "c", first_name: "Cy", reason_plain: "Asked what their home is worth", kind: "seller", at: "2026-10-01" },
    { contact_id: "d", first_name: "Di", reason_plain: "Saved 2 homes", kind: "interest", at: "2026-10-15" },
    { contact_id: "a", first_name: "Dup", reason_plain: "x", kind: "seller" },
    { contact_id: "e", first_name: "No reason", kind: "seller" },
  ])!;
  assert.deepEqual(l.map((p) => p.id), ["c", "d", "b", "a"]);
  assert.equal(readLooksHot({ nope: 1 }), null);
});

test("until then: the heat suggestions and the website signals merged, a person once with their strongest reason", () => {
  const web = fromSignals(demoSignals());
  const heat = fromHeat(demoHeat());
  const both = mergeLooks(heat, web, [{ ...web[2], kind: "seller", reason: "Asked what her home is worth", at: "2026-10-14T00:00:00Z" }]);
  assert.equal(both.length, 4);
  assert.equal(both[0].kind, "seller");
  assert.equal(both.find((p) => p.id === "r4")!.reason, "Asked what her home is worth");
  assert.equal(both.find((p) => p.id === "c-amy")!.heatId, "h1");
});

test("always on ONE MOVE: yellow with the count, a green ring and the plain line when empty", () => {
  const on = withLooksHot({ nodes: [move], edges: [] }, demoLooksHot());
  const orb = on.nodes.find((n) => n.id === LOOKS_NODE)!;
  assert.equal(orb.parentId, "move");
  assert.equal(orb.status, "attention");
  assert.equal(orb.needCount, 2);
  assert.equal(orb.secondaryLabel, "2 people · 1 likely seller");
  const empty = withLooksHot(on, []).nodes.find((n) => n.id === LOOKS_NODE)!;
  assert.equal(empty.status, "healthy");
  assert.equal(empty.summary, EMPTY_LINE);
  assert.equal(looksLine([]), "No one right now");
  assert.equal(withLooksHot(on, []).nodes.filter((n) => n.parentId === LOOKS_NODE).length, 0);
});

test("Not yet hides that reason 14 days, on this device; a new reason still shows", () => {
  const [dave, amy] = demoLooksHot();
  const now = Date.parse("2026-10-17T12:00:00Z");
  const n = withNotYet({}, dave, now);
  assert.deepEqual(shownLooks([dave, amy], n, new Set(), now)!.map((p) => p.id), ["c-amy"]);
  assert.deepEqual(shownLooks([{ ...dave, kind: "interest" }, amy], n, new Set(), now)!.length, 2);
  assert.equal(shownLooks([dave], n, new Set(), now + 15 * 86_400_000)!.length, 1);
  assert.deepEqual(readNotYet(JSON.stringify(n), now), n);
  assert.deepEqual(readNotYet("not json", now), {});
  assert.equal(shownLooks(null, {}, new Set()), null);
});

test("buttons: ONE MOVE's act route first; then Move to Hot through the heat route, Not yet kept here, Call them coming", async () => {
  const [dave, amy] = demoLooksHot();
  const calls: { u: string; b: unknown }[] = [];
  const missing = (async (u: string, i?: RequestInit) => {
    calls.push({ u: String(u), b: JSON.parse(String(i?.body ?? "null")) });
    return new Response(JSON.stringify({ need_url: "https://move.vip50one.com/buyer-needs?from=x" }), { status: String(u).endsWith("/act") ? 404 : 200 });
  }) as typeof fetch;
  const hot = await actLooks(amy, "move_hot", missing);
  assert.equal(hot.ok, true);
  assert.equal(hot.needUrl, "https://move.vip50one.com/buyer-needs?from=x");
  assert.deepEqual(calls[1].b, { id: "h1", accept: true });
  calls.length = 0;
  await actLooks(dave, "move_hot", missing);
  assert.match(calls[1].u, /hwc\/add$/);
  assert.deepEqual(await actLooks(dave, "not_yet", missing), { ok: true, line: "Not yet. Pulse won't raise this for Dave again for 14 days.", local: true });
  assert.deepEqual(await actLooks(dave, "call", missing), { ok: false, line: COMING_CALL });
  const ok = (async () => new Response("{}", { status: 200 })) as typeof fetch;
  assert.deepEqual(await actLooks(dave, "call", ok), { ok: true, line: "A task to call Dave is on your list.", needUrl: null });
});
