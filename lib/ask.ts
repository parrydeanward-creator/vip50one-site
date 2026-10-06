import { childrenOf, pathTo, type GraphIndex, type VisibleSet } from "./graph/model.ts";
import type { GraphNode, NodeStatus } from "./graph/types.ts";

// Ask ONE (research/ONE-BRAIN.md §4): a question about the business, answered
// as a set of nodes that already exist, each with the facts behind it (WHY).
// This file has no AI in it: the rules fallback, the check on whatever the AI
// returns, and the layout the answer is drawn in. lib/askAI.ts calls Claude.

export interface AskResult {
  id: string;
  reasons: string[];
}

export interface AskAnswer {
  question: string;
  answer: string;
  results: AskResult[];
  source: "ai" | "rules";
}

export const SUGGESTED = [
  "What needs my attention today?",
  "Who should I call today?",
  "Which relationships am I neglecting?",
  "How am I tracking?",
];

export const MAX_RESULTS = 6;
export const MAX_QUESTION = 300;

const STATUS_RANK: Record<NodeStatus, number> = { action: 0, attention: 1, opportunity: 2, healthy: 3 };
const PRODUCT_NAME: Record<GraphNode["product"], string> = {
  one: "ONE",
  go: "ONE GO",
  move: "ONE MOVE",
  marquee: "Marquee",
  showly: "Showly",
  open: "ONE Open",
};

// Nodes an answer may point at: anything below the products, in a product the
// agent has. ONE and the product orbs themselves are the frame, not answers.
export function candidates(ix: GraphIndex): GraphNode[] {
  return ix.graph.nodes.filter(
    (n) =>
      n.type !== "core" &&
      n.type !== "product" &&
      !pathTo(ix, n.id).some((p) => p.locked) &&
      !ix.byId.get(n.product)?.locked, // e.g. a Marquee task inside ONE GO for a Relationship agent
  );
}

// The facts a result rests on. Recommendations that point at the node come
// first (they were written as WHY); then the node's own recommendation, its
// numbers and its summary. Nothing here is invented.
export function factsFor(ix: GraphIndex, id: string): string[] {
  const n = ix.byId.get(id);
  if (!n) return [];
  const out: string[] = [];
  for (const other of ix.graph.nodes)
    for (const r of other.recommendations ?? []) if (r.targetId === id) out.push(...r.why);
  // An area (Today, Tracker...) is explained by its own numbers; a person or
  // item by the recommendation written about it.
  const area = n.type === "category" || n.type === "feature";
  if (area && n.stats?.length) out.push(...n.stats.slice(0, 3).map((x) => `${x.label}: ${x.value}.`));
  if (area && n.pace) out.push(sentence(n.pace.headline));
  if (!out.length && !area && n.recommendations?.[0]) out.push(...n.recommendations[0].why);
  if (!out.length) {
    if (n.secondaryLabel) out.push(sentence(n.secondaryLabel));
    if (n.summary) out.push(...sentences(n.summary).slice(0, 3));
  }
  if (out.length < 2 && !area && n.stats?.length) out.push(n.stats.slice(0, 2).map((s) => `${s.label}: ${s.value}`).join(". ") + ".");
  return dedupe(out).slice(0, 4);
}

// What the AI is given: one line per candidate, only fields the products
// reported. Ids are the only way it can point at something.
export function describeGraph(ix: GraphIndex): string {
  const root = ix.byId.get(ix.graph.rootId)!;
  const lines: string[] = [];
  const head = (root.stats ?? []).map((s) => `${s.label}: ${s.value}`).join("; ");
  lines.push(`Agent's headline numbers: ${head}.${root.pace ? ` ${root.pace.headline}. ${root.pace.detail ?? ""}` : ""}`);
  lines.push("");
  lines.push("Nodes (id | type | product | label | detail | state | facts):");
  for (const n of candidates(ix)) {
    const facts = factsFor(ix, n.id).join(" ");
    lines.push(
      [n.id, n.type, PRODUCT_NAME[n.product], n.label, n.secondaryLabel ?? "", n.status ?? "", clip(facts, 280)]
        .map((s) => s.replace(/\|/g, "/"))
        .join(" | "),
    );
  }
  return lines.join("\n");
}

// ---- rules fallback --------------------------------------------------------

type Intent = "attention" | "call" | "neglect" | "tracking" | "search";

export function intentOf(question: string): Intent {
  const q = question.toLowerCase();
  if (/\b(neglect\w*|forg[eo]t\w*|haven'?t (touched|talked|called|seen)|losing touch|slipping|going cold)\b/.test(q)) return "neglect";
  if (/\b(call|phone|reach out|contact|text)\b/.test(q) && /\bwho\b/.test(q)) return "call";
  if (/\b(track|tracking|pace|score|goal|on target|behind|progress|doing)\b/.test(q)) return "tracking";
  if (/\b(attention|needs? me|urgent|priority|priorities|important|today|first|overdue)\b/.test(q)) return "attention";
  return "search";
}

const BUSINESS = new Set(["person", "task", "appointment", "event", "opportunity", "property", "transaction", "goal"]);

function byStatus(a: GraphNode, b: GraphNode) {
  const sa = a.status ? STATUS_RANK[a.status] : 9, sb = b.status ? STATUS_RANK[b.status] : 9;
  return sa - sb || b.importance - a.importance;
}

export function rulesAnswer(question: string, ix: GraphIndex): AskAnswer {
  const all = candidates(ix);
  const people = all.filter((n) => n.type === "person");
  let picked: GraphNode[] = [];
  let answer = "";
  switch (intentOf(question)) {
    case "call": {
      // Who ONE already recommends first, then anyone due a call, then the rest.
      const recommended = new Set(ix.graph.nodes.flatMap((n) => (n.recommendations ?? []).map((r) => r.targetId)));
      const weight = (n: GraphNode) => (recommended.has(n.id) ? 2 : 0) + (isCall(n) ? 1 : 0);
      picked = [...people].sort((a, b) => weight(b) - weight(a) || byStatus(a, b));
      answer = picked.length
        ? `Start with ${cleanName(picked[0].label)}${picked[1] ? `, then ${cleanName(picked[1].label)}` : ""}. They are the people most due a touch today.`
        : "Nobody is flagged for a call today. Pick three VIPs and touch them anyway.";
      break;
    }
    case "neglect": {
      picked = people.filter((n) => n.status === "action" || n.status === "attention" || /\b(\d{2,}) days\b|overdue|no face-to-face/i.test(factsFor(ix, n.id).join(" ")));
      picked.sort(byStatus);
      answer = picked.length
        ? `${count(picked.length, "relationship")} ${picked.length === 1 ? "is" : "are"} slipping. ${cleanName(picked[0].label)} has gone longest without the right touch.`
        : "No one on your list is overdue right now.";
      break;
    }
    case "tracking": {
      const root = ix.byId.get(ix.graph.rootId)!;
      picked = all
        .filter((n) => n.product === "go" && (n.pace || n.stats?.length) && n.type === "category")
        .sort((a, b) => (b.pace ? 1 : 0) - (a.pace ? 1 : 0) || b.importance - a.importance);
      answer = root.pace
        ? `${root.pace.headline}. ${root.pace.detail ?? ""}`.trim()
        : "Here is where your numbers stand today.";
      break;
    }
    case "attention": {
      picked = all.filter((n) => n.status && n.status !== "healthy" && (BUSINESS.has(n.type) || n.status === "action")).sort(byStatus);
      answer = picked.length
        ? `${count(Math.min(picked.length, MAX_RESULTS), "thing")} need${Math.min(picked.length, MAX_RESULTS) === 1 ? "s" : ""} you. Start with ${cleanName(picked[0].label).toLowerCase()}.`
        : "Nothing is waiting on you right now.";
      break;
    }
    case "search": {
      const words = question.toLowerCase().match(/[a-z0-9']{3,}/g)?.filter((w) => !STOP.has(w)) ?? [];
      const score = (n: GraphNode) => {
        const hay = `${n.label} ${n.secondaryLabel ?? ""} ${n.summary ?? ""}`.toLowerCase();
        return words.reduce((s, w) => s + (n.label.toLowerCase().includes(w) ? 3 : hay.includes(w) ? 1 : 0), 0);
      };
      picked = all.map((n) => [n, score(n)] as const).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1] || byStatus(a[0], b[0])).map(([n]) => n);
      answer = picked.length
        ? `Here is what in your business matches "${clip(question, 60)}".`
        : `I couldn't find anything in your business that matches "${clip(question, 60)}". Try one of the suggestions.`;
      break;
    }
  }
  const results = picked.slice(0, MAX_RESULTS).map((n) => ({ id: n.id, reasons: factsFor(ix, n.id) }));
  return { question, answer, results, source: "rules" };
}

// ---- the check on what the AI returns -------------------------------------

// ONE only points; the agent presses the button (CLAUDE.md §2). An answer that
// claims something was done for the agent is thrown away.
const CLAIMS_ACTION =
  /\b(i|i've|i have|we|we've|one|one has)\s+(already\s+)?(sent|texted|emailed|called|published|posted|scheduled|approved|booked|messaged)\b|\b(has|have) been (sent|texted|emailed|published|posted|scheduled|approved|booked)\b/i;

export function claimsAction(text: string): boolean {
  return CLAIMS_ACTION.test(text);
}

export function validate(
  raw: { answer?: unknown; results?: unknown },
  question: string,
  ix: GraphIndex,
  source: AskAnswer["source"] = "ai",
): AskAnswer | null {
  const answer = typeof raw.answer === "string" ? raw.answer.trim() : "";
  if (!answer || claimsAction(answer)) return null;
  const allowed = new Set(candidates(ix).map((n) => n.id));
  const seen = new Set<string>();
  const results: AskResult[] = [];
  for (const r of Array.isArray(raw.results) ? raw.results : []) {
    const id = typeof r?.id === "string" ? r.id : "";
    if (!allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    const given = (Array.isArray(r.reasons) ? r.reasons : [])
      .filter((x: unknown): x is string => typeof x === "string")
      .map((x: string) => clip(x.trim(), 200))
      .filter((x: string) => x && !claimsAction(x));
    results.push({ id, reasons: given.length ? given.slice(0, 4) : factsFor(ix, id) });
    if (results.length === MAX_RESULTS) break;
  }
  return { question, answer: clip(answer, 600), results, source };
}

// ---- how the answer is drawn ------------------------------------------------

// The query layout: ONE at the centre, the answer on the ring around it, the
// products the answer came from faded on the outer arc. Everything else leaves
// the picture (it is still one tap away).
export function answerSet(ix: GraphIndex, ids: string[]): VisibleSet {
  const focus = ix.byId.get(ix.graph.rootId)!;
  const nodes: VisibleSet["nodes"] = [{ node: focus, role: "focus", order: 0, hasChildren: true }];
  const edges: VisibleSet["edges"] = [];
  const products: string[] = [];
  ids.forEach((id, i) => {
    const n = ix.byId.get(id);
    if (!n || n.id === focus.id) return;
    nodes.push({ node: n, role: "child", order: i, hasChildren: childrenOf(ix, n.id).length > 0 });
    edges.push({ source: focus.id, target: n.id, kind: "link" });
    const p = pathTo(ix, n.id)[1];
    if (p && p.type === "product" && !products.includes(p.id)) products.push(p.id);
  });
  products.forEach((id, i) => nodes.push({ node: ix.byId.get(id)!, role: "sibling", order: i, hasChildren: true }));
  return { focus, nodes, edges, hiddenChildren: 0 };
}

// ---- helpers ------------------------------------------------------------------

const STOP = new Set(["the", "and", "what", "who", "which", "how", "are", "for", "with", "about", "should", "does", "did", "have", "has", "was", "this", "that", "today", "there", "any", "can", "you", "your", "mine", "tell", "show"]);

function isCall(n: GraphNode) {
  return /^call\b/i.test(n.label);
}

export function cleanName(label: string) {
  return label.replace(/^(Call|Text|Face-to-face:|Send note to|Social touch:)\s*/i, "");
}

function count(n: number, word: string) {
  const w = ["No", "One", "Two", "Three", "Four", "Five", "Six"][n] ?? String(n);
  return `${w} ${word}${n === 1 ? "" : "s"}`;
}

function sentences(s: string) {
  return (s.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [s]).map((x) => x.trim()).filter(Boolean);
}

function sentence(s: string) {
  const t = s.trim();
  return /[.?!]$/.test(t) ? t : `${t}.`;
}

function dedupe(a: string[]) {
  return [...new Set(a.map((s) => s.trim()).filter(Boolean))];
}

function clip(t: string, n: number) {
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
}

/** What ONE GO opens for each result (VIP-SUMMARY §3m): its title, the reasons, and where it leads:
 * the vip_summary item id (`ref`), the ONE MOVE contact, or the item's own https link. */
export interface AskItem {
  title: string;
  reasons: string[];
  ref: string | null;
  contact_id: string | null;
  link: string | null;
}

export function askItems(ix: GraphIndex, a: AskAnswer): AskItem[] {
  return a.results.flatMap((r) => {
    const n = ix.byId.get(r.id);
    if (!n) return [];
    return [
      {
        title: n.label,
        reasons: r.reasons.slice(0, 3),
        ref: n.id.startsWith("live:") ? n.id.slice(5) : null,
        contact_id: n.contactId ?? null,
        link: n.href && /^https:\/\//.test(n.href) ? n.href : null,
      },
    ];
  });
}
