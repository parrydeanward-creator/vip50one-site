import { includes } from "../products.ts";
import type { PackageId } from "../types.ts";
import type { BusinessGraph, GraphEdge, GraphNode, ProductKey } from "./types.ts";
import { addGo } from "./go.ts";

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
      summary: "Buyer tours your clients react to, house by house.",
      stats: [{ label: "New reactions", value: "4" }, { label: "Tours this week", value: "2" }] },
    { id: "open", type: "product", label: "ONE OPEN", secondaryLabel: "Open house intelligence", parentId: "one", product: "open", importance: 0.8, status: "healthy",
      summary: "The open house, from plan to the last follow-up.",
      stats: [{ label: "Next open house", value: "Sun 1-3pm" }, { label: "Prep tasks left", value: "3" }] },
  ];
  for (const p of products) {
    const locked = !includes(pkg, PRODUCT_FOR_PACKAGE[p.product as Exclude<ProductKey, "one">]);
    add(locked ? { ...p, locked, status: undefined, stats: undefined, summary: `${p.summary} Included in ONE Complete.` } : p);
  }

  // ---- ONE GO, in depth (modelled on the live app) ----------------------
  addGo(add, link);

  // ---- the other four, one level (content comes in the next build) --------
  const level2: [string, ProductKey, [string, string][]][] = [
    ["move", "move", [["People", "1,284 contacts"], ["Follow-ups", "4 overdue"], ["Important dates", "3 this week"], ["Referrals", "9 this year"], ["New to sort", "3 from Saturday"]]],
    ["marquee", "marquee", [["Win", "Listing presentations"], ["Launch", "2 active campaigns"], ["ReLaunch", "Refresh a listing"], ["1482 Maple Ridge Dr", "5 to approve"], ["Seller reports", "Due Friday"]]],
    ["showly", "showly", [["Buyers", "3 active"], ["Tours", "2 this week"], ["Feedback", "4 new reactions"], ["Next steps", "The Millers"]]],
    ["open", "open", [["Plan", "Done"], ["Prepare", "3 tasks left"], ["Host", "Sun 1-3pm"], ["Follow Up", "2 to rate"]]],
  ];
  for (const [parent, product, kids] of level2) {
    if (nodes.find((n) => n.id === parent)?.locked) continue;
    kids.forEach(([label, sec], i) =>
      add({ id: `${parent}-${i}`, type: "category", label, secondaryLabel: sec, parentId: parent, product, importance: 0.9 - i * 0.05,
        summary: "More detail arrives in the next build." }),
    );
  }
  link("marquee-3", "open", "related_to");

  // Since you were last here (demo): what changed overnight, newest first.
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  const has = (p: string) => !nodes.find((n) => n.id === p)?.locked;
  const changes = [
    { id: "p-millers", product: "showly" as const, what: "The Millers reacted to 4 homes from yesterday's tour: two loves.", at: hoursAgo(2) },
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
      ["p-millers", "showly", -1, "The Millers toured 4 homes and loved two."],
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

  return { nodes, edges, rootId: "one", changes, dated };
}
