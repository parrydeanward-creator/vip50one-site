import { includes } from "../products.ts";
import type { PackageId } from "../types.ts";
import type { BusinessGraph, GraphEdge, GraphNode, ProductKey } from "./types.ts";

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
    stats: [
      { label: "Touches this month", value: "286 / 400" },
      { label: "VIP list", value: "47 / 50" },
      { label: "Day streak", value: "12" },
      { label: "Closings this year", value: "14 / 25" },
    ],
  });

  const products: N[] = [
    { id: "go", type: "product", label: "ONE GO", secondaryLabel: "Daily execution", parentId: "one", product: "go", importance: 0.95, status: "attention",
      summary: "What needs to happen today, and whether you are on pace.",
      stats: [{ label: "Touches due today", value: "6" }, { label: "Streak", value: "12 days" }] },
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

  // ---- ONE GO, in depth ---------------------------------------------------
  add({ id: "go-today", type: "category", label: "Today", secondaryLabel: "4 of 10 touches", parentId: "go", product: "go", importance: 1, status: "attention",
    summary: "You have done 4 of today's 10 touches. Six people are waiting, and two of them matter most this week.",
    stats: [
      { label: "Touches today", value: "4 / 10" },
      { label: "Tasks left", value: "4" },
      { label: "Appointments", value: "2" },
      { label: "This month", value: "286 / 400" },
    ],
    recommendations: [
      { title: "Call Jen Alvarez before her birthday tomorrow", targetId: "p-jen",
        why: ["Jen is on your VIP-50.", "Her birthday is tomorrow.", "Your last touch was 19 days ago."] },
      { title: "Call Marcus Lee about his follow-up", targetId: "p-marcus",
        why: ["Marcus came to Saturday's open house at 1482 Maple Ridge Dr.", "His follow-up was due Friday and is not done.", "He said he is buying in 3 to 6 months."] },
    ] });
  add({ id: "go-tracking", type: "category", label: "Tracking", secondaryLabel: "286 of 400 this month", parentId: "go", product: "go", importance: 0.9, status: "healthy",
    summary: "At your current pace you finish the month at about 372 touches. Twenty-eight more calls or texts this week closes the gap.",
    stats: [{ label: "Touches this month", value: "286 / 400" }, { label: "Pacing to", value: "372" }, { label: "Streak", value: "12 days" }] });
  add({ id: "go-tasks", type: "category", label: "Tasks", secondaryLabel: "4 open", parentId: "go", product: "go", importance: 0.8, status: "action",
    summary: "Four tasks open, one overdue." });
  add({ id: "go-calendar", type: "category", label: "Calendar", secondaryLabel: "2 today", parentId: "go", product: "go", importance: 0.7,
    summary: "Two appointments today and an open house on Sunday." });
  add({ id: "go-goals", type: "category", label: "Goals", secondaryLabel: "14 of 25 closings", parentId: "go", product: "go", importance: 0.6, status: "healthy",
    summary: "On the way to 25 referral closings this year." });
  add({ id: "go-accountability", type: "category", label: "Accountability", secondaryLabel: "Friday check-in", parentId: "go", product: "go", importance: 0.5,
    summary: "Your Friday accountability call and weekly numbers." });

  // Today: the people ONE recommends, who live in ONE MOVE.
  const people: N[] = [
    { id: "p-jen", type: "person", label: "Jen Alvarez", secondaryLabel: "Birthday tomorrow", parentId: "go-today", product: "move", importance: 1, status: "opportunity",
      summary: "VIP-50. Referred the Parkers last spring.", timestamps: { last: "19 days ago", due: "tomorrow" },
      stats: [{ label: "Last touch", value: "19 days ago" }, { label: "Referrals", value: "1" }],
      recommendations: [{ title: "Call Jen today", why: ["Birthday tomorrow.", "Last touch 19 days ago.", "She has referred business before."] }] },
    { id: "p-marcus", type: "person", label: "Marcus Lee", secondaryLabel: "Follow-up overdue", parentId: "go-today", product: "move", importance: 0.95, status: "action",
      summary: "Open house visitor, Saturday at 1482 Maple Ridge Dr. Buying in 3 to 6 months.", timestamps: { due: "Friday" },
      recommendations: [{ title: "Call Marcus today", why: ["Visited Saturday's open house.", "Said 3 to 6 months.", "Opened the follow-up listing link yesterday.", "No personal follow-up recorded."] }] },
    { id: "p-millers", type: "person", label: "The Millers", secondaryLabel: "Loved 2 homes", parentId: "go-today", product: "move", importance: 0.85, status: "opportunity",
      summary: "Active buyers. Reacted to 4 homes from yesterday's Showly tour: two loves, one maybe, one no." },
    { id: "p-dave", type: "person", label: "Dave Kim", secondaryLabel: "Drop-by today", parentId: "go-today", product: "move", importance: 0.6,
      summary: "VIP-50, Draper. On today's drop-by route." },
    { id: "p-parkers", type: "person", label: "The Parkers", secondaryLabel: "Drop-by today", parentId: "go-today", product: "move", importance: 0.55, status: "healthy",
      summary: "Past clients, Draper. On today's drop-by route." },
    { id: "p-touches", type: "task", label: "6 VIP touches", secondaryLabel: "2 calls, 3 texts, 1 card", parentId: "go-today", product: "go", importance: 0.7, status: "attention",
      summary: "Two calls, three texts and one handwritten card." },
  ];
  people.forEach(add);
  link("p-marcus", "open", "attended");
  link("p-millers", "showly", "showed");
  link("p-jen", "move", "connected_to");

  // Relationship memory, one level deeper on Jen (ONE MOVE preview).
  add({ id: "jen-family", type: "feature", label: "Family", secondaryLabel: "Mike, Emma", parentId: "p-jen", product: "move", importance: 0.8,
    summary: "Husband Mike. Daughter Emma, starts at Juan Diego this fall." });
  add({ id: "jen-dates", type: "feature", label: "Important dates", secondaryLabel: "Birthday tomorrow", parentId: "p-jen", product: "move", importance: 0.9, status: "opportunity",
    summary: "Birthday 1 Oct. Home anniversary 14 May." });
  add({ id: "jen-promises", type: "feature", label: "Promises", secondaryLabel: "1 open", parentId: "p-jen", product: "move", importance: 0.85, status: "attention",
    summary: "Send Jen the Draper market report. Open, due this week." });
  add({ id: "jen-history", type: "feature", label: "Touch history", secondaryLabel: "Last: 19 days", parentId: "p-jen", product: "move", importance: 0.6,
    summary: "Text 19 days ago. Coffee 6 weeks ago. Referral thank-you card in May." });
  add({ id: "jen-referrals", type: "feature", label: "Referrals", secondaryLabel: "The Parkers", parentId: "p-jen", product: "move", importance: 0.7, status: "healthy",
    summary: "Referred the Parkers (closed in June)." });

  // Tracking detail.
  for (const [i, [label, sec]] of ([
    ["Calls", "38 this month"],
    ["Texts", "142 this month"],
    ["Cards", "21 this month"],
    ["Drop-bys", "9 this month"],
    ["Conversations", "61 this month"],
    ["Appointments", "7 this month"],
  ] as const).entries()) {
    add({ id: `trk-${i}`, type: "feature", label, secondaryLabel: sec, parentId: "go-tracking", product: "go", importance: 0.8 - i * 0.05 });
  }
  // Tasks.
  add({ id: "task-followups", type: "task", label: "Overdue follow-ups", secondaryLabel: "4 in ONE MOVE", parentId: "go-tasks", product: "move", importance: 1, status: "action" });
  add({ id: "task-approve", type: "task", label: "Approve posts", secondaryLabel: "Maple Ridge, 5 pieces", parentId: "go-tasks", product: "marquee", importance: 0.9, status: "attention" });
  add({ id: "task-rate", type: "task", label: "Rate visitors", secondaryLabel: "2 from Saturday", parentId: "go-tasks", product: "open", importance: 0.8, status: "attention" });
  add({ id: "task-report", type: "task", label: "Seller report", secondaryLabel: "Due Friday", parentId: "go-tasks", product: "marquee", importance: 0.6 });
  link("task-followups", "move", "requires_action");
  link("task-approve", "marquee", "requires_action");
  link("task-rate", "open", "requires_action");
  // Calendar.
  add({ id: "cal-1", type: "appointment", label: "Listing appointment", secondaryLabel: "Today 2:00pm", parentId: "go-calendar", product: "go", importance: 0.9 });
  add({ id: "cal-2", type: "appointment", label: "Coffee with Dave", secondaryLabel: "Today 4:30pm", parentId: "go-calendar", product: "go", importance: 0.8 });
  add({ id: "cal-oh", type: "event", label: "Open house", secondaryLabel: "Sun 1-3pm", parentId: "go-calendar", product: "open", importance: 0.85 });
  link("cal-oh", "open", "scheduled_for");
  // Goals.
  add({ id: "goal-closings", type: "goal", label: "25 closings", secondaryLabel: "14 so far", parentId: "go-goals", product: "go", importance: 1, status: "healthy" });
  add({ id: "goal-touches", type: "goal", label: "400 touches a month", secondaryLabel: "286 so far", parentId: "go-goals", product: "go", importance: 0.9, status: "attention" });
  add({ id: "goal-vip", type: "goal", label: "VIP-50", secondaryLabel: "47 of 50", parentId: "go-goals", product: "go", importance: 0.8, status: "attention" });

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

  return { nodes, edges, rootId: "one" };
}
