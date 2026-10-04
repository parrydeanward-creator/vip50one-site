import { test } from "node:test";
import assert from "node:assert/strict";
import { demoGraph } from "../lib/graph/demo.ts";
import { DESKTOP_BUDGET, PHONE_BUDGET, childrenOf, indexGraph, pathTo, visibleSet } from "../lib/graph/model.ts";
import { layout } from "../lib/brain/layout.ts";
import { fit, toScreen, toWorld, zoomAt } from "../lib/brain/camera.ts";
import * as nav from "../lib/brain/nav.ts";

const ix = indexGraph(demoGraph("complete"));

test("graph: ids unique, every parent and edge end exists, one root", () => {
  const ids = ix.graph.nodes.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const n of ix.graph.nodes) if (n.parentId) assert.ok(ix.byId.has(n.parentId), `${n.id} parent`);
  for (const e of ix.graph.edges) assert.ok(ix.byId.has(e.source) && ix.byId.has(e.target), e.id);
  assert.deepEqual(ix.graph.nodes.filter((n) => !n.parentId).map((n) => n.id), ["one"]);
});

test("graph: every node is reachable from ONE", () => {
  for (const n of ix.graph.nodes) assert.equal(pathTo(ix, n.id)[0].id, "one", n.id);
});

test("level 1 is ONE and the five products", () => {
  const vs = visibleSet(ix, "one", DESKTOP_BUDGET);
  assert.equal(vs.focus.id, "one");
  assert.deepEqual(
    vs.nodes.filter((v) => v.role === "child").map((v) => v.node.label).sort(),
    ["MARQUEE", "ONE GO", "ONE MOVE", "ONE OPEN", "SHOWLY"],
  );
});

test("never the whole graph: visible set stays within budget", () => {
  for (const n of ix.graph.nodes) {
    for (const b of [DESKTOP_BUDGET, PHONE_BUDGET]) {
      const vs = visibleSet(ix, n.id, b);
      const count = (role: string) => vs.nodes.filter((v) => v.role === role).length;
      assert.ok(count("child") <= b.children);
      assert.ok(count("sibling") <= b.siblings);
      assert.ok(count("ancestor") <= b.ancestors);
      assert.ok(vs.nodes.length <= 1 + b.children + b.siblings + b.ancestors + b.related);
      assert.equal(vs.hiddenChildren, Math.max(0, childrenOf(ix, n.id).length - b.children));
    }
  }
});

test("phone shows the focus, its children and one step back, nothing else", () => {
  const vs = visibleSet(ix, "go-tasks-today", PHONE_BUDGET);
  assert.ok(vs.nodes.every((v) => ["focus", "child", "ancestor", "related"].includes(v.role)));
  assert.equal(vs.nodes.filter((v) => v.role === "ancestor").length, 1);
});

test("layout: deterministic, focus at centre, no two nodes overlap", () => {
  for (const id of ["one", "go", "go-today", "go-tasks-today", "p-jen", "go-daily", "go-score", "dt-habits"]) {
    const vs = visibleSet(ix, id, DESKTOP_BUDGET);
    const a = layout(vs), b = layout(vs);
    assert.deepEqual(a, b);
    const f = a.find((p) => p.role === "focus")!;
    assert.deepEqual([f.x, f.y], [0, 0]);
    for (let i = 0; i < a.length; i++)
      for (let j = i + 1; j < a.length; j++) {
        const d = Math.hypot(a[i].x - a[j].x, a[i].y - a[j].y);
        assert.ok(d >= a[i].r + a[j].r, `${id}: ${a[i].id} overlaps ${a[j].id}`);
      }
  }
});

test("layout without the force pass is still a valid layout (fallback)", () => {
  const p = layout(visibleSet(ix, "go", DESKTOP_BUDGET), { relax: false });
  assert.ok(p.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y) && n.r > 0));
});

test("back history returns the way it came", () => {
  let s = nav.start("one");
  s = nav.go(s, "go");
  s = nav.go(s, "go-today");
  s = nav.go(s, "p-jen");
  s = nav.back(s);
  assert.equal(s.focusId, "go-today");
  s = nav.back(s);
  assert.equal(s.focusId, "go");
  s = nav.back(s);
  assert.equal(s.focusId, "one");
  assert.equal(nav.back(s).focusId, "one");
});

test("camera: zoom keeps the point under the cursor fixed; fit contains the bounds", () => {
  const vp = { width: 800, height: 600 };
  const c = { x: 10, y: -20, scale: 1 };
  const w = toWorld(c, vp, 200, 150);
  const z = zoomAt(c, vp, 1.5, 200, 150);
  const s = toScreen(z, vp, w.x, w.y);
  assert.ok(Math.abs(s.x - 200) < 1e-6 && Math.abs(s.y - 150) < 1e-6);
  const f = fit({ minX: -300, minY: -200, maxX: 300, maxY: 200 }, vp, 20);
  const tl = toScreen(f, vp, -300, -200), br = toScreen(f, vp, 300, 200);
  assert.ok(tl.x >= 19 && tl.y >= 19 && br.x <= 781 && br.y <= 581);
});

test("locked products for Relationship: shown, marked, no children opened", () => {
  const rel = indexGraph(demoGraph("relationship"));
  for (const id of ["marquee", "showly", "open"]) {
    assert.equal(rel.byId.get(id)!.locked, true);
    assert.equal(childrenOf(rel, id).length, 0);
  }
  assert.ok(!rel.byId.get("go")!.locked && !rel.byId.get("move")!.locked);
});

test("ONE GO carries the live app's areas", () => {
  const labels = childrenOf(ix, "go").map((n) => n.label);
  for (const l of ["Today", "Daily Tracker", "Weekly Bonus", "Scoreboard", "VIP Contacts", "Drop-By Map", "Tasks", "Calendar", "90-Day Challenge", "Hot / Warm / Cold", "The Lounge", "Business Rolodex"]) {
    assert.ok(labels.includes(l), l);
  }
  // Four levels deep: ONE > ONE GO > Today > VIP-50 Daily Tasks > Jen > Family
  assert.deepEqual(pathTo(ix, "jen-family").map((n) => n.id), ["one", "go", "go-today", "go-tasks-today", "p-jen", "jen-family"]);
});

test("every recommendation has facts behind it and points at a real node", () => {
  for (const n of ix.graph.nodes)
    for (const r of n.recommendations ?? []) {
      assert.ok(r.why.length > 0, `${n.id}: ${r.title}`);
      if (r.targetId) assert.ok(ix.byId.has(r.targetId), r.targetId);
    }
});

test("back is one step up the path at the top, not the way you came (Parry, 4 Oct)", () => {
  const leaf = ix.graph.nodes.find((n) => pathTo(ix, n.id).length >= 3)!;
  const path = pathTo(ix, leaf.id);
  // Arrived by jumping straight from ONE to the leaf: back still goes to its parent.
  let s = nav.go(nav.start(ix.graph.rootId), leaf.id);
  s = nav.up(s, path);
  assert.equal(s.focusId, path[path.length - 2].id);
  s = nav.up(s, pathTo(ix, s.focusId));
  assert.equal(s.focusId, path[path.length - 3].id);
  // At ONE, back stays at ONE.
  const root = nav.start(ix.graph.rootId);
  assert.equal(nav.up(root, pathTo(ix, root.focusId)).focusId, ix.graph.rootId);
});

test("each in-Brain page has its own address", async () => {
  const { pageAddress, pageFromAddress } = await import("../lib/moveMenu.ts");
  assert.equal(pageAddress("/profile"), "/dashboard/profile");
  assert.equal(pageAddress(null), "/dashboard");
  assert.equal(pageFromAddress("/dashboard/profile"), "/profile");
  assert.equal(pageFromAddress("/dashboard/contacts/vip"), "/contacts/vip");
  assert.equal(pageFromAddress("/dashboard/profile/"), "/profile");
  assert.equal(pageFromAddress("/dashboard"), null);
  assert.equal(pageFromAddress("/dashboard/nope"), null);
  assert.equal(pageFromAddress("/dashboard/dashboard"), null);
});
