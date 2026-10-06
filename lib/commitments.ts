import type { GraphEdge, GraphNode } from "./graph/types.ts";

// Commitments (Parry, 6 Oct; VIP-SUMMARY §3n): set the week on Monday, check in on Friday, set the
// weekend on Friday and check it on Monday, as in his coaching. The agent and their coach see them; no
// points. MASTER keeps them and counts the counted kinds; the Brain draws, asks and checks shapes.
// Nothing here ever marks a commitment kept for the agent.

const MOVE_URL = "https://move.vip50one.com";
export const commitmentsUrl = `${MOVE_URL}/api/brain/commitments`;
export const WEEK_NODE = "go-week";
export const MAX = { week: 5, weekend: 3 } as const;
export const TEXT_MAX = 140;
export const NOTE_MAX = 200;

export type Period = "week" | "weekend";
export type Due = "set_week" | "check_weekend" | "check_week" | "set_weekend" | null;
export type Result = "kept" | "partly" | "missed";
export const COUNTED = ["call", "text", "video_text", "face_to_face", "handwritten_note", "drop_by", "social", "closing", "referral"] as const;
export type Kind = (typeof COUNTED)[number] | "yes_no";

export const KIND_LABEL: Record<Kind, string> = {
  yes_no: "Yes or no",
  call: "Calls",
  text: "Texts",
  video_text: "Video texts",
  face_to_face: "Face-to-faces",
  handwritten_note: "Handwritten notes",
  drop_by: "Drop-bys",
  social: "Social touches",
  closing: "Closings",
  referral: "Referrals",
};

/** Short words that fit inside an orb. */
export const KIND_SHORT: Record<Kind, string> = { yes_no: "", call: "CALLS", text: "TEXTS", video_text: "VIDEOS", face_to_face: "COFFEES", handwritten_note: "NOTES", drop_by: "DROP-BYS", social: "SOCIAL", closing: "CLOSINGS", referral: "REFERRALS" };

export interface Item {
  id: string;
  text: string;
  kind: Kind;
  target: number | null;
  count: number | null;
  result: Result | null;
  note: string | null;
}

export interface PeriodState {
  id: string;
  starts: string;
  setAt: string | null;
  checkedAt: string | null;
  items: Item[];
}

export interface Commitments {
  today: string;
  due: Due;
  week: PeriodState | null;
  weekend: PeriodState | null;
  lastWeek: { kept: number; partly: number; missed: number } | null;
  keepRate8w: number | null;
  streak: number;
}

const isDay = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const DUES: readonly Exclude<Due, null>[] = ["set_week", "check_weekend", "check_week", "set_weekend"];
const RESULTS: readonly Result[] = ["kept", "partly", "missed"];
const KINDS: readonly Kind[] = ["yes_no", ...COUNTED];

function readPeriod(p: unknown): PeriodState | null {
  if (!p || typeof p !== "object") return null;
  const r = p as Record<string, unknown>;
  if (typeof r.id !== "string" || !isDay(r.starts) || !Array.isArray(r.items)) return null;
  const items: Item[] = [];
  for (const x of r.items as Record<string, unknown>[]) {
    if (!x || typeof x.id !== "string" || typeof x.text !== "string") continue;
    const kind = KINDS.includes(x.kind as Kind) ? (x.kind as Kind) : "yes_no";
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);
    items.push({
      id: x.id,
      text: x.text.slice(0, TEXT_MAX),
      kind,
      target: kind === "yes_no" ? null : num(x.target),
      count: kind === "yes_no" ? null : num(x.count),
      result: RESULTS.includes(x.result as Result) ? (x.result as Result) : null,
      note: typeof x.note === "string" && x.note.trim() ? x.note.slice(0, NOTE_MAX) : null,
    });
  }
  return {
    id: r.id,
    starts: r.starts,
    setAt: typeof r.set_at === "string" ? r.set_at : null,
    checkedAt: typeof r.checked_at === "string" ? r.checked_at : null,
    items,
  };
}

/** A §3n.2 answer, checked; null when it is not one. */
export function readCommitments(j: unknown): Commitments | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!isDay(r.today)) return null;
  const lw = r.last_week as Record<string, unknown> | null | undefined;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : 0);
  return {
    today: r.today,
    due: DUES.includes(r.due as Exclude<Due, null>) ? (r.due as Due) : null,
    week: readPeriod(r.week),
    weekend: readPeriod(r.weekend),
    lastWeek: lw && typeof lw === "object" ? { kept: n(lw.kept), partly: n(lw.partly), missed: n(lw.missed) } : null,
    keepRate8w: typeof r.keep_rate_8w === "number" && r.keep_rate_8w >= 0 && r.keep_rate_8w <= 1 ? r.keep_rate_8w : null,
    streak: n(r.streak),
  };
}

/** How urgent the due step is, by the clock in Denver (§3n.1): yellow while it is on time, red once it
 * is late (setting the week after Monday noon; checking in from Saturday). */
export function dueLevel(due: Due, today: string, hour: number): "now" | "today" | null {
  if (!due) return null;
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 Sunday .. 6 Saturday
  if (due === "set_week" || due === "check_weekend") return dow === 1 && hour < 12 ? "today" : "now";
  if (due === "check_week" || due === "set_weekend") return dow === 5 ? "today" : "now";
  return null;
}

/** The step's words, for the orb and the panel. */
export function dueWords(due: Due): string | null {
  switch (due) {
    case "set_week":
      return "Set this week's commitments";
    case "check_weekend":
      return "Check in on your weekend";
    case "check_week":
      return "Check in on your week";
    case "set_weekend":
      return "Set your weekend commitments";
    default:
      return null;
  }
}

/** A counted item has reached its target (the agent still marks it at check-in). */
export const reached = (i: Item) => i.kind !== "yes_no" && i.target != null && i.count != null && i.count >= i.target;

/** "9 of 15 calls", "Yes or no". */
export function progressWords(i: Item): string {
  if (i.kind === "yes_no" || i.target == null) return i.result ? resultWord(i.result) : "Yes or no";
  return `${Math.min(i.count ?? 0, 9999)} of ${i.target} ${KIND_LABEL[i.kind].toLowerCase()}`;
}

export const resultWord = (r: Result) => (r === "kept" ? "Kept" : r === "partly" ? "Partly" : "Missed");

/** Kept / all of a checked period; partly counts half (§3n.2). */
export function keepShare(items: Item[]): number | null {
  const done = items.filter((i) => i.result);
  if (!done.length) return null;
  return done.reduce((t, i) => t + (i.result === "kept" ? 1 : i.result === "partly" ? 0.5 : 0), 0) / done.length;
}

export interface Draft {
  text: string;
  kind: Kind;
  target: number | null;
}

/** The §3n.3 set body, or the plain-words reason it cannot be sent. */
export function setBody(period: Period, drafts: Draft[]): { period: Period; items: Draft[] } | { error: string } {
  const items = drafts
    .map((d) => ({ text: d.text.trim().slice(0, TEXT_MAX), kind: d.kind, target: d.kind === "yes_no" ? null : d.target }))
    .filter((d) => d.text);
  if (!items.length) return { error: "Write at least one commitment." };
  if (items.length > MAX[period]) return { error: `Up to ${MAX[period]} for the ${period}.` };
  for (const d of items) {
    if (d.kind !== "yes_no" && (d.target == null || !Number.isInteger(d.target) || d.target < 1 || d.target > 100)) {
      return { error: `Give "${d.text}" a number from 1 to 100.` };
    }
  }
  return { period, items };
}

/** The §3n.3 check body, or why not: every commitment needs a result. */
export function checkBody(period: Period, items: Item[], picks: Record<string, { result: Result | null; note: string }>): { period: Period; results: { id: string; result: Result; note: string | null }[] } | { error: string } {
  const results = [];
  for (const i of items) {
    const p = picks[i.id];
    if (!p?.result) return { error: `Mark "${i.text}" as kept, partly or missed.` };
    results.push({ id: i.id, result: p.result, note: p.note.trim() ? p.note.trim().slice(0, NOTE_MAX) : null });
  }
  return { period, results };
}

/** Pulse suggests (§3n.5): editable starters from the agent's own week, never set for them. */
export function starters(facts: { overdueFollowUps?: number; vipsUntouched?: number; faceToFaceLastWeek?: number }): Draft[] {
  const out: Draft[] = [];
  if ((facts.faceToFaceLastWeek ?? 0) < 2) out.push({ text: "Two face-to-faces with VIP-50 clients", kind: "face_to_face", target: 2 });
  if ((facts.vipsUntouched ?? 0) > 0) out.push({ text: `Call ${Math.min(15, Math.max(5, facts.vipsUntouched ?? 0))} VIPs I haven't talked to this month`, kind: "call", target: Math.min(15, Math.max(5, facts.vipsUntouched ?? 0)) });
  if ((facts.overdueFollowUps ?? 0) > 0) out.push({ text: "Clear every overdue follow-up", kind: "yes_no", target: null });
  out.push({ text: "Three handwritten notes", kind: "handwritten_note", target: 3 });
  return out.slice(0, 3);
}

/** ONE YOU's "This week" orb (§3n.7): pulses for the step that is due, otherwise shows how the week is
 * going. No ONE YOU orb (or not in the package): unchanged. */
export function withWeekNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, c: Commitments | null, hour: number): G {
  const go = g.nodes.find((n) => n.id === "go");
  if (!go || go.locked || !c) return g;
  const nodes = g.nodes.filter((n) => n.id !== WEEK_NODE);
  const edges = g.edges.filter((e) => e.target !== WEEK_NODE);
  const level = dueLevel(c.due, c.today, hour);
  const items = c.week?.items ?? [];
  const on = items.filter((i) => i.result === "kept" || reached(i)).length;
  nodes.push({
    id: WEEK_NODE,
    type: "feature",
    label: "This week",
    secondaryLabel: dueWords(c.due) ?? (items.length ? `${on} of ${items.length} commitments on track` : "No commitments yet"),
    parentId: "go",
    product: "go",
    importance: 1.04,
    status: level === "now" ? "action" : level === "today" ? "attention" : items.length && on === items.length ? "healthy" : undefined,
    stats: items.length ? [{ label: "Commitments", value: `${on} / ${items.length}` }] : undefined,
    summary: c.keepRate8w != null ? `You keep ${Math.round(c.keepRate8w * 100)}% of your commitments (last 8 weeks).${c.streak ? ` ${c.streak}-week streak.` : ""}` : "Set your commitments Monday, check in Friday, and the weekend too.",
  });
  edges.push({ id: `go>${WEEK_NODE}`, source: "go", target: WEEK_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

/** The demo agent's week (Tuesday, half way through), so the sales demo shows it working. */
export function demoCommitments(today: string): Commitments {
  const item = (id: string, text: string, kind: Kind, target: number | null, count: number | null): Item => ({ id, text, kind, target, count, result: null, note: null });
  return {
    today,
    due: null,
    week: {
      id: "demo-week",
      starts: today,
      setAt: `${today}T14:00:00Z`,
      checkedAt: null,
      items: [
        item("c1", "Two coffees with VIP-50 clients", "face_to_face", 2, 1),
        item("c2", "Call 15 VIPs I haven't talked to this month", "call", 15, 9),
        item("c3", "Three handwritten notes", "handwritten_note", 3, 3),
        item("c4", "Finish my listing presentation", "yes_no", null, null),
      ],
    },
    weekend: null,
    lastWeek: { kept: 3, partly: 1, missed: 1 },
    keepRate8w: 0.72,
    streak: 4,
  };
}
