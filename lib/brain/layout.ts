import { forceCollide, forceSimulation, forceX, forceY, type SimulationNodeDatum } from "d3-force";
import type { NodeType } from "../graph/types.ts";
import type { Role, VisibleSet } from "../graph/model.ts";

// Layer 3 (presentation): where each visible node sits, in world units, with
// the focus at (0, 0). A deterministic radial layout first, then a short
// collision pass that settles and stops. If the pass is skipped, the radial
// layout alone is a valid layout (ONE-BRAIN.md §8, deterministic fallback).

export interface Placed {
  id: string;
  role: Role;
  x: number;
  y: number;
  r: number;
}

const BASE_R: Record<NodeType, number> = {
  core: 92,
  product: 50,
  category: 38,
  feature: 32,
  person: 34,
  property: 36,
  task: 30,
  appointment: 30,
  goal: 32,
  opportunity: 32,
  transaction: 32,
  event: 32,
  insight: 30,
};

export function radiusFor(type: NodeType, role: Role): number {
  const r = BASE_R[type];
  switch (role) {
    case "focus":
      return type === "core" ? r : Math.max(r * 1.45, 58);
    case "child":
      return r;
    case "ancestor":
      return type === "core" ? 30 : 22;
    case "sibling":
      return r * 0.7;
    case "related":
      return r * 0.8;
  }
}

const GAP = 26;
const LABEL_W = 150; // widest label a child carries, in world units

/** The One Team orb's children: every orb the same larger size, on two concentric rings round the focus. */
export const TEAM_RINGS = 2;
export const TEAM_ORB_R = 54;
export const TEAM_SPACE = 150; // least centre-to-centre spacing: along each ring, and between the rings (orb, gap, name)

/** One spacing for everything (Parry, 22 Oct: "space all of them the same"): the split between the rings and their radii
 * are chosen so the neighbour gap on the inner ring, on the outer ring, and the gap between the rings agree (the
 * three differ by under 5%; a ring holds a whole number of orbs, so they cannot be exact). */
export function teamSplit(total: number, inner0: number) {
  if (total < 6) return { nIn: Math.min(total, Math.max(1, Math.ceil(total / 2))), rIn: inner0, rOut: inner0 + TEAM_SPACE * 1.25 };
  let best: { spread: number; nIn: number; cin: number; m: number; x: number } | null = null;
  for (let nIn = 3; nIn <= total - 3; nIn++) {
    const nOut = total - nIn;
    const a = 2 * Math.sin(Math.PI / nIn), b = 2 * Math.sin(Math.PI / nOut);
    for (let cin = 0.8; cin <= 1.25; cin += 0.002) {
      const x = cin / a;
      for (let m = 0.7; m <= 1.4; m += 0.004) {
        const v = [cin, b * (x + m), m];
        const spread = Math.max(...v) / Math.min(...v);
        if (!best || spread < best.spread - 1e-9) best = { spread, nIn, cin, m, x };
      }
    }
  }
  const o = best!;
  const nOut = total - o.nIn, b = 2 * Math.sin(Math.PI / nOut);
  const least = Math.min(o.cin, o.m, b * (o.x + o.m));
  const k = Math.max(TEAM_SPACE / least, inner0 / o.x); // scale up, never down
  return { nIn: o.nIn, rIn: o.x * k, rOut: (o.x + o.m) * k };
}

/** Two rings centred on the focus (Parry, 22 Oct: "agents still around the orb but with one row closer and then
 * another around that group. spaced out"). The children are split by circumference so every gap is the same, the parts first on the inner ring; the outer
 * ring's angles are offset by half a step so its faces sit between the inner ones. Radii grow with the count; the
 * orbs never shrink. Deterministic: no relax pass. */
export function teamRings(vs: VisibleSet): Placed[] {
  const focus = vs.nodes.find((v) => v.role === "focus")!;
  const rf = radiusFor(focus.node.type, "focus");
  const kids = vs.nodes.filter((v) => v.role === "child").sort((a, b) => a.order - b.order);
  const { nIn, rIn, rOut } = teamSplit(kids.length, rf + TEAM_ORB_R + 60);
  const nOut = kids.length - nIn;
  const placed: Placed[] = [{ id: focus.node.id, role: "focus", x: 0, y: 0, r: rf }];
  const start = -Math.PI / 2;
  kids.forEach((k, i) => {
    const inner = i < nIn;
    const n = inner ? nIn : nOut, j = inner ? i : i - nIn;
    const step = (2 * Math.PI) / n;
    const ang = start + j * step + (inner ? 0 : step / 2);
    const R = inner ? rIn : rOut;
    placed.push({ id: k.node.id, role: "child", x: Math.cos(ang) * R, y: Math.sin(ang) * R, r: TEAM_ORB_R });
  });
  // The back orb sits outside the outer ring, to the upper left.
  vs.nodes.filter((v) => v.role === "ancestor").sort((a, b) => a.order - b.order).forEach((v, i) => {
    const ar = radiusFor(v.node.type, "ancestor");
    const d = (nOut ? rOut : rIn) + TEAM_ORB_R + ar + 30 + i * (ar * 2 + 20);
    placed.push({ id: v.node.id, role: "ancestor", x: -d * Math.SQRT1_2, y: -d * Math.SQRT1_2, r: ar });
  });
  return placed;
}

/** What a phone starts fitted to: the focus and the inner ring (the outer ring is a pan away). */
export function teamInner(placed: Placed[]): Placed[] {
  const focus = placed.find((p) => p.role === "focus");
  if (!focus) return placed;
  const kids = placed.filter((p) => p.role === "child");
  if (!kids.length) return [focus];
  const d = (p: Placed) => Math.hypot(p.x - focus.x, p.y - focus.y);
  const rIn = Math.min(...kids.map(d));
  return [focus, ...kids.filter((k) => d(k) < rIn + 1)];
}

export function layout(vs: VisibleSet, opts: { relax?: boolean; teamRings?: boolean } = {}): Placed[] {
  if (opts.teamRings) return teamRings(vs);
  const byRole = (role: Role) => vs.nodes.filter((v) => v.role === role).sort((a, b) => a.order - b.order);
  const placed: Placed[] = [];

  const focus = vs.nodes.find((v) => v.role === "focus")!;
  const rf = radiusFor(focus.node.type, "focus");
  placed.push({ id: focus.node.id, role: "focus", x: 0, y: 0, r: rf });

  // Children on a ring big enough that they do not touch.
  const kids = byRole("child");
  const rk = kids.length ? Math.max(...kids.map((k) => radiusFor(k.node.type, "child"))) : 0;
  // Room for each child's label as well as its orb, so labels never collide.
  const slot = Math.max(2 * rk + GAP, LABEL_W);
  const ring1 = Math.max(rf + rk + 90, (kids.length * slot) / (2 * Math.PI));
  kids.forEach((k, i) => {
    const a = -Math.PI / 2 + (i / Math.max(1, kids.length)) * Math.PI * 2;
    placed.push({ id: k.node.id, role: "child", x: Math.cos(a) * ring1, y: Math.sin(a) * ring1, r: radiusFor(k.node.type, "child") });
  });

  // Ancestors trail off to the upper left, nearest first.
  const anc = byRole("ancestor");
  const ancA = (-140 * Math.PI) / 180;
  anc.forEach((v, i) => {
    const d = ring1 + rk + 130 + i * 84;
    placed.push({ id: v.node.id, role: "ancestor", x: Math.cos(ancA) * d, y: Math.sin(ancA) * d, r: radiusFor(v.node.type, "ancestor") });
  });

  // Siblings on an outer arc, away from the ancestors.
  const sib = byRole("sibling");
  const ring2 = ring1 + rk + 110;
  sib.forEach((v, i) => {
    // An arc from upper right round to lower left, leaving the ancestors' side clear.
    const from = (-60 * Math.PI) / 180, to = (170 * Math.PI) / 180;
    const a = sib.length === 1 ? Math.PI / 4 : from + (i / (sib.length - 1)) * (to - from);
    placed.push({ id: v.node.id, role: "sibling", x: Math.cos(a) * ring2, y: Math.sin(a) * ring2, r: radiusFor(v.node.type, "sibling") });
  });

  // Related nodes (links into other products) to the right, outside ring 1.
  const rel = byRole("related");
  rel.forEach((v, i) => {
    const a = (-25 + i * 22) * (Math.PI / 180);
    const d = ring1 + rk + 60;
    placed.push({ id: v.node.id, role: "related", x: Math.cos(a) * d, y: Math.sin(a) * d, r: radiusFor(v.node.type, "related") });
  });

  if (opts.relax === false) return placed;
  return relax(placed);
}

type SimNode = SimulationNodeDatum & { id: string; tx: number; ty: number; r: number; fixed: boolean };

function relax(placed: Placed[]): Placed[] {
  const sim: SimNode[] = placed.map((p) => ({
    id: p.id,
    x: p.x,
    y: p.y,
    tx: p.x,
    ty: p.y,
    r: p.r,
    fixed: p.role === "focus",
    ...(p.role === "focus" ? { fx: 0, fy: 0 } : {}),
  }));
  const s = forceSimulation(sim)
    .force("x", forceX<SimNode>((d) => d.tx).strength(0.35))
    .force("y", forceY<SimNode>((d) => d.ty).strength(0.35))
    .force("collide", forceCollide<SimNode>((d) => d.r + 16).strength(0.9))
    .stop();
  s.tick(120); // settle, then stop: no jitter afterwards
  return placed.map((p, i) => ({ ...p, x: Math.round(sim[i].x ?? p.x), y: Math.round(sim[i].y ?? p.y) }));
}

export function bounds(placed: Placed[], pad = 0) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of placed) {
    minX = Math.min(minX, p.x - p.r);
    minY = Math.min(minY, p.y - p.r);
    maxX = Math.max(maxX, p.x + p.r);
    maxY = Math.max(maxY, p.y + p.r + 40); // label below
  }
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}
