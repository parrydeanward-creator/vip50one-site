import type { BusinessGraph, GraphNode, ProductKey } from "./graph/types.ts";
import type { WatchStep } from "./watch.ts";
import { clock12 } from "./schedule.ts";

// Watch Pulse work, for real (PULSE-ROADMAP #16): the Watch film run on the agent's own day instead of the example
// agent. Built from today's plan as the Brain already has it (Plan my day / the Day Clock): each thing to do appears
// round ONE in time order, flying out of the product it comes from, then the day is summed up. Nothing invented:
// every step is one of the agent's own items. Kept in this browser tab only (sessionStorage) to hand to /watch.

export const DAY_FILM_KEY = "one.dayFilm";
export const MAX_ITEMS = 8;

export interface DayFilmItem {
  start: string; // "HH:MM"
  what: string;
  product: ProductKey;
  minutes: number;
  done: boolean;
}
export interface DayFilm {
  graph: BusinessGraph;
  spots: Record<string, [number, number]>;
  steps: WatchStep[];
}

const PRODUCTS: [ProductKey, string, string][] = [
  ["go", "ONE GO", "Daily execution"],
  ["move", "ONE MOVE", "Relationship intelligence"],
  ["marquee", "MARQUEE", "Listing intelligence"],
  ["showly", "SHOWLY", "Buyer experience"],
  ["open", "ONE OPEN", "Open house intelligence"],
];
const NAME: Record<string, string> = { one: "ONE", go: "ONE GO", move: "ONE MOVE", marquee: "Marquee", showly: "Showly", open: "ONE Open" };
const P = ["go", "move", "marquee", "showly", "open"];
const SPOT: Record<string, [number, number]> = { go: [-90, 290], move: [-18, 290], marquee: [54, 290], showly: [126, 290], open: [198, 290] };
const isProduct = (p: string): p is ProductKey => ["one", "go", "move", "marquee", "showly", "open"].includes(p);
const hours = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`);

/** Read what the Brain handed over; only well-formed items, in time order, at most 8. */
export function readDayItems(j: unknown): { first: string | null; items: DayFilmItem[] } | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.items)) return null;
  const items: DayFilmItem[] = [];
  for (const x of r.items as Record<string, unknown>[]) {
    if (!x || typeof x.start !== "string" || !/^\d{2}:\d{2}$/.test(x.start) || typeof x.what !== "string" || !x.what.trim()) continue;
    const product = typeof x.product === "string" && isProduct(x.product) ? x.product : "one";
    const minutes = typeof x.minutes === "number" && x.minutes > 0 ? Math.min(600, Math.round(x.minutes)) : 15;
    items.push({ start: x.start, what: x.what.trim().slice(0, 80), product, minutes, done: x.done === true });
  }
  items.sort((a, b) => a.start.localeCompare(b.start));
  const first = typeof r.first === "string" && r.first.trim() ? r.first.trim().slice(0, 30) : null;
  return { first, items: items.slice(0, MAX_ITEMS) };
}

/** The film: intro, one step per item, the day summed up. Null when there is nothing planned. */
export function dayFilm(items: DayFilmItem[], first: string | null): DayFilm | null {
  if (!items.length) return null;
  const nodes: GraphNode[] = [
    { id: "one", type: "core", label: "ONE", parentId: null, product: "one", importance: 1 },
    ...PRODUCTS.map(([id, label, sub]): GraphNode => ({ id, type: "product", label, secondaryLabel: sub, parentId: "one", product: id, importance: 0.9 })),
  ];
  const spots: Record<string, [number, number]> = { ...SPOT };
  const n = items.length;
  items.forEach((it, k) => {
    const id = `my-${k}`;
    nodes.push({
      id,
      type: "task",
      label: it.what.length > 28 ? `${it.what.slice(0, 27)}…` : it.what,
      secondaryLabel: `${clock12(it.start)} · ${hours(it.minutes)}`,
      parentId: "one",
      product: it.product,
      importance: 0.8,
      status: it.done ? "healthy" : "attention",
    });
    // round ONE like a clock face: the first thing at the top, the rest clockwise
    spots[id] = [-90 + (360 / Math.max(n, 6)) * k, k % 2 ? 490 : 470];
  });
  const edges = nodes.filter((x) => x.parentId).map((x) => ({ id: `${x.parentId}>${x.id}`, source: x.parentId!, target: x.id, relationshipType: "belongs_to" as const, strength: 1 }));
  const total = items.reduce((t, i) => t + i.minutes, 0);
  const done = items.filter((i) => i.done).length;
  const ids = items.map((_, k) => `my-${k}`);
  const steps: WatchStep[] = [
    { id: "intro", show: ["one", ...P], focus: ["one", ...P], product: "one", kicker: "Watch Pulse work", title: first ? `${first}, here is your day.` : "Here is your day.", line: `Pulse planned ${n} ${n === 1 ? "thing" : "things"} round your calendar.`, beat: true, ms: 3200 },
    ...items.map((it, k): WatchStep => ({
      id: `s${k}`,
      n: [k + 1, n],
      show: [`my-${k}`],
      focus: ["one", `my-${k}`, ...(it.product !== "one" ? [it.product] : [])],
      flight: [it.product !== "one" ? it.product : "one", `my-${k}`],
      product: it.product,
      kicker: `${clock12(it.start)} · ${NAME[it.product]}`,
      title: it.what,
      line: it.done ? `Done. ${hours(it.minutes)}.` : `About ${hours(it.minutes)}.`,
      ms: 2600,
    })),
    { id: "outro", show: [], focus: ["one", ...P, ...ids], product: "one", kicker: "", title: `${n} ${n === 1 ? "thing" : "things"}. About ${hours(total)}.${done ? ` ${done} done already.` : ""}`, line: "", needs: true, ms: 3800 },
  ];
  return { graph: { nodes, edges, rootId: "one" }, spots, steps };
}
