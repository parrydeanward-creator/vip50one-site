import type { GraphEdge, GraphNode, NodeStatus } from "./graph/types.ts";

// Follow-ups (Parry, 16 Oct 18:30 MT: "yes on follow ups"; walker inbox/ecosystem/2026-10-17-0032-from-walker-follow-ups.md).
// A permanent orb directly on ONE MOVE, never hidden: a still green ring when nothing is due, yellow when something is
// due today, red when anything is overdue, with the count on the orb. Its side panel holds three groups, Overdue, Today
// and Next 7 days; each row is the person's first name, what is owed and how late or when; a click opens the person's
// record, and "Log the touch" closes the task.
//
// Where the rows come from: ONE MOVE's `GET /api/brain/follow-ups` ({overdue, today, next7}, asked of GO/MOVE 17 Oct)
// when it answers; until then, the follow-up items MASTER's vip_summary already sends (overdue and today only).

const MOVE_URL = "https://move.vip50one.com";
export const followUpsUrl = `${MOVE_URL}/api/brain/follow-ups`;
export const followUpsLogUrl = `${MOVE_URL}/api/brain/follow-ups/log`;
/** The live orb, and the demo's (lib/graph/move.ts). */
export const FOLLOW_NODE = "move-followups";
export const DEMO_FOLLOW_NODE = "move-3";
export const isFollowUpsOrb = (id: string) => id === FOLLOW_NODE || id === DEMO_FOLLOW_NODE;
/** At most 15 tasks show at one time (Parry, 6 Oct). */
export const MAX_SHOWN = 15;
export const EMPTY_LINE = "Nothing to follow up. Follow-ups appear here from a call note, Talk to Pulse or an action plan.";
export const SUMMARY = "Every promise you made in ONE MOVE: what is overdue, what is due today and what is coming in the next 7 days. Log the touch and the task closes itself.";

export type Group = "overdue" | "today" | "next7";
export const GROUPS: { key: Group; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "next7", label: "Next 7 days" },
];

export interface FollowRow {
  taskId?: string;
  contactId?: string;
  firstName: string;
  what: string;
  /** YYYY-MM-DD (or a full time) when known. */
  dueAt: string | null;
  lateDays: number;
  /** The orb a click opens (the person's record). */
  orbId: string;
  /** Plain words when there is no date to work from. */
  when?: string;
}
export type FollowUps = Record<Group, FollowRow[]>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
export const rowOrbId = (taskId: string) => `live:go:task:${taskId}`;

function readRow(x: unknown): FollowRow | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  const taskId = str(r.task_id, 40);
  const what = str(r.what);
  if (!taskId || !UUID.test(taskId) || !what) return null;
  const contactId = str(r.contact_id, 40);
  const late = typeof r.late_days === "number" && Number.isFinite(r.late_days) ? Math.max(0, Math.round(r.late_days)) : 0;
  return {
    taskId,
    contactId: contactId && UUID.test(contactId) ? contactId : undefined,
    firstName: str(r.first_name, 40) ?? "",
    what,
    dueAt: str(r.due_at, 40),
    lateDays: late,
    orbId: rowOrbId(taskId),
  };
}

/** ONE MOVE's `/api/brain/follow-ups` answer, checked; null when it is not one. Rows without a real task id are left
 * out, and a task is listed once (its first group). */
export function readFollowUps(j: unknown): FollowUps | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.overdue) && !Array.isArray(r.today) && !Array.isArray(r.next7)) return null;
  const seen = new Set<string>();
  const out: FollowUps = { overdue: [], today: [], next7: [] };
  for (const g of ["overdue", "today", "next7"] as const) {
    for (const x of Array.isArray(r[g]) ? (r[g] as unknown[]) : []) {
      const row = readRow(x);
      if (!row || seen.has(row.taskId!)) continue;
      seen.add(row.taskId!);
      out[g].push(row);
    }
  }
  out.overdue.sort((a, b) => b.lateDays - a.lateDays);
  const byDue = (a: FollowRow, b: FollowRow) => (a.dueAt ?? "").localeCompare(b.dueAt ?? "");
  out.today.sort(byDue);
  out.next7.sort(byDue);
  return out;
}

/** "Call back Rosa Diaz" -> "Rosa"; "Send CMA to the Hendersons" -> "Hendersons"; "" when no name shows. */
export function firstNameIn(title: string): string {
  const t = title.trim();
  const after = /\b(?:with|to|for)\s+(?:the\s+)?([A-Z][a-z'’-]+)/.exec(t);
  if (after) return after[1];
  const words = t.split(/\s+/).slice(1);
  return words.find((w) => /^[A-Z][a-z'’-]+$/.test(w)) ?? "";
}

const day = (s: string | null | undefined) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

/** How late, or when: "3 days late", "Due today", "Tomorrow", "Thu, Oct 22". */
export function whenWords(row: FollowRow, group: Group, today: string): string {
  const due = day(row.dueAt);
  if (group === "overdue") {
    const late = row.lateDays || (due ? Math.max(0, daysBetween(due, today)) : 0);
    if (late) return late === 1 ? "1 day late" : `${late} days late`;
    return row.when ?? "Overdue";
  }
  if (group === "today") return row.when ?? "Due today";
  if (!due) return row.when ?? "This week";
  const ahead = daysBetween(today, due);
  if (ahead === 1) return "Tomorrow";
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${due}T12:00:00Z`));
}

const groupOf = (s: NodeStatus | undefined): Group => (s === "action" ? "overdue" : s === "attention" ? "today" : "next7");

/** The rows the orb already draws (vip_summary's follow-ups, or the demo's), for when ONE MOVE's route has not answered. */
export function rowsFromKids(kids: readonly GraphNode[], today: string): FollowUps {
  const out: FollowUps = { overdue: [], today: [], next7: [] };
  for (const k of kids) {
    const g = groupOf(k.status);
    const due = day(k.timestamps?.due);
    out[g].push({
      taskId: k.taskId,
      contactId: k.contactId,
      firstName: firstNameIn(k.label),
      what: k.label,
      dueAt: due,
      lateDays: g === "overdue" && due ? Math.max(0, daysBetween(due, today)) : 0,
      orbId: k.id,
      when: k.secondaryLabel,
    });
  }
  return out;
}

export const countOf = (f: FollowUps) => f.overdue.length + f.today.length + f.next7.length;

/** The orb's colour: red when anything is overdue, yellow when something is due today, a still green ring otherwise. */
export function followStatus(overdue: number, today: number): NodeStatus {
  return overdue ? "action" : today ? "attention" : "healthy";
}

/** The line under the orb, never empty. */
export function followLine(overdue: number, today: number, next7: number): string {
  if (overdue) return `${overdue} overdue${today ? `, ${today} today` : ""}`;
  if (today) return `${today} due today`;
  if (next7) return `${next7} in the next 7 days`;
  return "All clear";
}

/** The rows drawn as orbs and listed in the panel: overdue first, then today, then the next 7 days; at most 15. */
export function shownRows(f: FollowUps): { group: Group; row: FollowRow }[] {
  return GROUPS.flatMap((g) => f[g.key].map((row) => ({ group: g.key, row }))).slice(0, MAX_SHOWN);
}

/** The Follow-ups orb itself, directly on ONE MOVE. `overdueTotal` is ONE MOVE's whole count when it holds more than it
 * sends (vip_summary's `followups_overdue`). */
export function followNode(overdue: number, today: number, next7: number, overdueTotal?: number | null): GraphNode {
  const od = Math.max(overdue, overdueTotal ?? 0);
  return {
    id: FOLLOW_NODE,
    type: "category",
    label: "Follow-ups",
    secondaryLabel: followLine(od, today, next7),
    parentId: "move",
    product: "move",
    // first round ONE MOVE: what the agent promised comes before everything else there
    importance: 1,
    status: followStatus(od, today),
    summary: SUMMARY,
    needFloor: od ? { count: od + today, level: "now" } : today ? { count: today, level: "today" } : undefined,
  };
}

/** ONE MOVE's answer on the map: the orb and its rows replace whatever was there. Without ONE MOVE on the map, nothing. */
export function withFollowUps<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, f: FollowUps | null, today: string): G {
  if (!f) return g;
  const move = g.nodes.find((n) => n.id === "move");
  if (!move || move.locked) return g;
  const shown = shownRows(f);
  const ids = new Set(shown.map((s) => s.row.orbId));
  const old = new Set(g.nodes.filter((n) => n.parentId === FOLLOW_NODE).map((n) => n.id));
  const gone = (id: string) => id === FOLLOW_NODE || old.has(id) || ids.has(id);
  const nodes = g.nodes.filter((n) => !gone(n.id));
  const edges = g.edges.filter((e) => !gone(e.target) && !gone(e.source));
  nodes.push(followNode(f.overdue.length, f.today.length, f.next7.length));
  edges.push({ id: `move>${FOLLOW_NODE}`, source: "move", target: FOLLOW_NODE, relationshipType: "belongs_to", strength: 1 });
  shown.forEach(({ group, row }, k) => {
    nodes.push({
      id: row.orbId,
      type: "task",
      label: row.firstName && !row.what.includes(row.firstName) ? `${row.what}, ${row.firstName}` : row.what,
      secondaryLabel: whenWords(row, group, today),
      parentId: FOLLOW_NODE,
      product: "move",
      importance: 1 - k * 0.03,
      status: group === "overdue" ? "action" : group === "today" ? "attention" : undefined,
      summary: row.what,
      timestamps: row.dueAt ? { due: row.dueAt } : undefined,
      contactId: row.contactId,
      taskId: row.taskId,
    });
    edges.push({ id: `${FOLLOW_NODE}>${row.orbId}`, source: FOLLOW_NODE, target: row.orbId, relationshipType: "belongs_to", strength: 1 });
  });
  return { ...g, nodes, edges };
}
