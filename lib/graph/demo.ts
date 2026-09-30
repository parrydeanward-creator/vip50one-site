import { includes } from "../products.ts";
import type { PackageId } from "../types.ts";
import type { BusinessGraph, GraphEdge, GraphNode, ProductKey } from "./types.ts";
import { addGo } from "./go.ts";
import { addMove } from "./move.ts";
import { addMarquee } from "./marquee.ts";
import { addOpen } from "./open.ts";
import { addShowly } from "./showly.ts";

// A made-up agent's business (every name and address invented), deep on ONE GO
// and one level deep on the other four products (research/ONE-BRAIN.md §10).

type N = Omit<GraphNode, "importance"> & { importance?: number };

const PRODUCT_FOR_PACKAGE: Record<Exclude<ProductKey, "one">, "go" | "move" | "marquee" | "open" | "showly"> = {
  go: "go",
  move: "move",
  marquee: "marquee",
  showly: "showly",
  open: "open",
};

export function demoGraph(pkg: PackageId = "complete"): BusinessGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const add = (n: N) => {
    nodes.push({ importance: 0.5, ...n });
    if (n.parentId) {
      edges.push({ id: `${n.parentId}>${n.id}`, source: n.parentId, target: n.id, relationshipType: "belongs_to", strength: 1 });
    }
  };
  const link = (source: string, target: string, relationshipType: GraphEdge["relationshipType"], strength = 0.6) =>
    edges.push({ id: `${source}~${target}`, source, target, relationshipType, strength });

  // ---- core and products -------------------------------------------------
  add({
    id: "one",
    type: "core",
    label: "ONE",
    secondaryLabel: "Your business, connected",
    parentId: null,
    product: "one",
    importance: 1,
    summary: "Good morning, Sarah. Three things matter most today: call Jen before her birthday, clear the four overdue follow-ups in ONE MOVE, and approve the Maple Ridge posts so they are ready for Thursday.",
    // Headline numbers are what the products really track (Parry, 30 Sep):
    // ONE GO's points, streak and leaderboard; ONE MOVE's Touch Audit.
    stats: [
      { label: "Daily score", value: "14 / 26" },
      { label: "Weekly score", value: "95 / 100" },
      { label: "VIP-50 touch coverage", value: "68%" },
      { label: "Streak", value: "12 days" },
      { label: "Leaderboard", value: "#2" },
      { label: "Referrals this year", value: "9" },
    ],
    pace: { headline: "Current pace: 22 / 26 today", detail: "Jen, Marcus, the Millers and Amy are the four actions that close the gap." },
  });

  const products: N[] = [
    { id: "go", type: "product", label: "ONE GO", secondaryLabel: "Daily execution", parentId: "one", product: "go", importance: 0.95, status: "attention",
      summary: "What needs to happen today, and whether you are on pace: points, VIP-50 tasks, the weekly score, the leaderboard and the 90-Day Challenge.",
      stats: [{ label: "Daily score", value: "14 / 26" }, { label: "Weekly score", value: "95 / 100" }, { label: "Streak", value: "12 days" }, { label: "Leaderboard", value: "#2" }],
      pace: { headline: "Current pace: 22 / 26", detail: "4 high-value actions could close the gap." } },
    { id: "move", type: "product", label: "ONE MOVE", secondaryLabel: "Relationship intelligence", parentId: "one", product: "move", importance: 0.9, status: "action",
      summary: "Everyone you know, and what you promised them.",
      stats: [{ label: "Follow-ups overdue", value: "4" }, { label: "New to sort", value: "3" }] },
    { id: "marquee", type: "product", label: "MARQUEE", secondaryLabel: "Listing intelligence", parentId: "one", product: "marquee", importance: 0.85, status: "attention",
      summary: "Every listing's marketing, from the first presentation to the weekly seller report.",
      stats: [{ label: "Waiting for approval", value: "5" }, { label: "Active listings", value: "2" }] },
    { id: "showly", type: "product", label: "SHOWLY", secondaryLabel: "Buyer experience", parentId: "one", product: "showly", importance: 0.8, status: "opportunity",
      summary: "Buyer tours: your clients answer Yes, Maybe or No on each home.",
      stats: [{ label: "New answers", value: "4" }, { label: "Tours this week", value: "2" }] },
    { id: "open", type: "product", label: "ONE OPEN", secondaryLabel: "Open house intelligence", parentId: "one", product: "open", importance: 0.8, status: "attention",
      summary: "The open house, from plan to the last follow-up.",
      stats: [{ label: "Next open house", value: "Sun 1-3pm" }, { label: "Prep tasks left", value: "3" }] },
  ];
  for (const p of products) {
    const locked = !includes(pkg, PRODUCT_FOR_PACKAGE[p.product as Exclude<ProductKey, "one">]);
    add(locked ? { ...p, locked, status: undefined, stats: undefined, summary: `${p.summary} Included in ONE Complete.` } : p);
  }

  // ---- ONE GO, in depth (modelled on the live app) ----------------------
  addGo(add, link);

  // ---- the other four, in depth (each modelled on its live app) ------------
  const on = (p: string) => !nodes.find((n) => n.id === p)?.locked;
  if (on("move")) addMove(add);
  if (on("marquee")) addMarquee(add, link);
  if (on("open")) addOpen(add);
  if (on("showly")) addShowly(add);

  // Since you were last here (demo): what changed overnight, newest first.
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  const has = (p: string) => !nodes.find((n) => n.id === p)?.locked;
  const changes = [
    { id: "p-millers", product: "showly" as const, what: "The Millers answered on 4 homes from yesterday's tour: two Yes.", at: hoursAgo(2) },
    { id: "marquee-3", product: "marquee" as const, what: "5 posts for 1482 Maple Ridge Dr are ready for your approval.", at: hoursAgo(5) },
    { id: "task-followups", product: "move" as const, what: "2 more follow-ups became overdue overnight.", at: hoursAgo(9) },
    { id: "open-3", product: "open" as const, what: "2 visitors from Saturday's open house still need a rating.", at: hoursAgo(14) },
  ].filter((c) => has(c.product) && nodes.some((n) => n.id === c.id));

  // The timeline (demo): what happened in the last month and what is coming.
  const daysFromNow = (d: number) => {
    const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + d * 86400_000));
    return `${ymd}T18:00:00.000Z`; // about midday in Mountain time, on that Mountain day
  };
  const dated = (
    [
      ["p-dave", "move", -20, "Closed: the Nguyens, referred by Dave Kim."],
      ["p-amy", "move", -12, "Amy Chen sent you a referral."],
      ["marquee-3", "marquee", -9, "1482 Maple Ridge Dr campaign launched."],
      ["p-parkers", "move", -6, "The Parkers posted their new kitchen. You commented."],
      ["open-3", "open", -4, "Open house at 1482 Maple Ridge Dr: 14 visitors signed in."],
      ["p-millers", "showly", -1, "The Millers toured 4 homes and said Yes to two."],
      ["p-jen", "move", 1, "Jen Alvarez's birthday."],
      ["task-approve", "marquee", 1, "Maple Ridge posts start going out."],
      ["task-report", "marquee", 2, "Weekly seller report for Maple Ridge is due."],
      ["open-2", "open", 4, "Open house, Sunday 1-3pm, 1482 Maple Ridge Dr."],
      ["p-marcus", "move", 5, "Lunch with Marcus Lee (face-to-face)."],
      ["showly-3", "showly", 9, "The Millers' second tour."],
      ["go-dates", "move", 12, "Tom and Lisa Reyes' anniversary."],
      ["go-event", "go", 16, "Fall Client Mixer."],
    ] as const
  )
    .filter(([id, product]) => has(product) && nodes.some((n) => n.id === id))
    .map(([id, product, d, what]) => ({ id, product, at: daysFromNow(d), what }));

  // Your day (demo): what today holds, from all five products.
  const today = (
    [
      { id: "day-jen", nodeId: "p-jen", product: "move", kind: "call", what: "Call Jen Alvarez. Her birthday is tomorrow.", minutes: 10, vip: true, watch: ["sig-go"] },
      { id: "day-amy", nodeId: "p-amy", product: "move", kind: "call", what: "Call Amy Chen. Thank her for the referral.", minutes: 10, vip: true },
      { id: "day-video", nodeId: "dt-video", product: "go", kind: "text", what: "Send 2 video texts to your VIP-50.", minutes: 10, vip: true },
      { id: "day-approve", nodeId: "task-approve", product: "marquee", kind: "approval", what: "Approve 5 posts for 1482 Maple Ridge Dr.", minutes: 15 },
      { id: "day-note", nodeId: "p-dave", product: "move", kind: "note", what: "Write Dave Kim a handwritten note.", minutes: 5, vip: true },
      { id: "day-marcus", nodeId: "p-marcus", product: "move", kind: "meeting", what: "Lunch with Marcus Lee.", minutes: 60, vip: true, at: "12:30" },
      { id: "day-rate", nodeId: "open-3", product: "open", kind: "rating", what: "Rate the 2 visitors from Saturday.", minutes: 5 },
      { id: "day-follow", nodeId: "task-followups", product: "move", kind: "follow_up", what: "Clear the 4 overdue follow-ups.", minutes: 20 },
    ] as import("../day.ts").DayItem[]
  ).filter((d) => has(d.product) && nodes.some((n) => n.id === d.nodeId));

  return { nodes, edges, rootId: "one", changes, dated, today };
}
