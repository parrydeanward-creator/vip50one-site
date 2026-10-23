import type { GraphEdge, GraphNode } from "./graph/types.ts";
import { dueLevel, dueWords, keepShare, reached, readCommitments, type Commitments, type Item, type Kind } from "./commitments.ts";

// The Coach view (VIP-SUMMARY §3n.4, §3n.7; Parry, 6 Oct: commitments "seen by the agent and their coach";
// his team are linked to him as their coach). A coach reads, never writes: each agent's week, weekend,
// results and notes, keep rate and streak, with the ones who need a word from the coach first. MASTER only
// answers for someone who coaches at least one agent; anyone else gets no Coaching orb.

const MOVE_URL = "https://move.vip50one.com";
export const coachedUrl = `${MOVE_URL}/api/brain/commitments/coached`;
export const COACH_NODE = "go-coach";

/** §3ag.2: setup progress, eight (or seven) yes/no steps from MASTER. `since` is the agent's start day when sent. */
export interface SetupStep { key: string; label: string; done: boolean; count: number | null }
export interface Setup { done: number; of: number; steps: SetupStep[]; since: string | null }

export interface Coached {
  id: string;
  name: string;
  c: Commitments;
  setup: Setup | null;
  /** Optional, read when MASTER sends them (asked of GO/MOVE for the Coaching board, 22 Oct): a face, each finished
   *  week's share kept (oldest first, at most 8, null for a week with nothing set: an empty slot, never a 0 bar). */
  photo?: string | null;
  keptWeeks?: (number | null)[];
  /** The latest real activity (MASTER last_active_at: app open, touch, task, tracker, commitment, plan, habit,
   *  contact, lounge). Never auth's last_sign_in_at, which only moves on a typed password or code (Parry, 23 Oct). */
  lastActive?: string | null;
  /** What that activity was (MASTER last_active_source). */
  lastActiveSource?: string | null;
  /** This Mountain week's score as ONE GO's Weekly Tracker shows it (MASTER score_this_week, vip50-web-crm#399). */
  scoreThisWeek?: number;
  /** The 8 finished Mountain weeks before this one, oldest first (MASTER scores_by_week). */
  scoresByWeek?: { week: string; score: number; away: boolean }[];
  /** The commitments behind keepRate8w (MASTER kept_counts_8w). set 0: none set. */
  keptCounts?: { set: number; kept: number; partly: number; missed: number; notChecked: number };
  /** False when the agent has never set a commitment in a finished week (MASTER has_commitments). */
  hasCommitments?: boolean;
}

/** §3ag answer for one agent, checked; null when absent or the wrong shape. */
export function readSetup(v: unknown): Setup | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  if (!Array.isArray(r.steps)) return null;
  const steps: SetupStep[] = [];
  for (const x of r.steps as Record<string, unknown>[]) {
    if (!x || typeof x.key !== "string" || typeof x.label !== "string") continue;
    steps.push({ key: x.key, label: x.label.slice(0, 60), done: x.done === true, count: typeof x.count === "number" && x.count >= 0 ? Math.round(x.count) : null });
  }
  if (!steps.length) return null;
  const since = typeof r.since === "string" && /^\d{4}-\d{2}-\d{2}/.test(r.since) ? r.since.slice(0, 10) : null;
  return { done: steps.filter((x) => x.done).length, of: steps.length, steps, since };
}

/** §3ag.4: under half set up 14 days or more after starting is yellow for the coach. No start day, no yellow. */
export const SETUP_DAYS = 14;
export function setupLate(st: Setup | null, today: string): boolean {
  if (!st || !st.since || st.done * 2 >= st.of) return false;
  return (Date.parse(`${today}T12:00:00Z`) - Date.parse(`${st.since}T12:00:00Z`)) / 86_400_000 >= SETUP_DAYS;
}

export const setupWords = (st: Setup) => (st.done === st.of ? "Fully set up" : `${st.done} of ${st.of} set up`);

/** The team's setup: agents fully set up, of those with setup data. */
export function teamSetup(agents: Coached[]): { full: number; of: number } | null {
  const w = agents.filter((a) => a.setup);
  return w.length ? { full: w.filter((a) => a.setup!.done === a.setup!.of).length, of: w.length } : null;
}

const numOf = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null;

/** kept_by_week: {week, kept 0..1 or null, away} objects (MASTER) or bare numbers; oldest first, the last 8. */
function readKeptWeeks(v: unknown): (number | null)[] | null {
  if (!Array.isArray(v)) return null;
  return v.slice(-8).map((x) => {
    const n = x && typeof x === "object" ? numOf((x as { kept?: unknown }).kept) : typeof x === "number" ? numOf(x) : null;
    return n == null ? null : Math.max(0, Math.min(1, n));
  });
}

/** scores_by_week: {week, score, away}, oldest first, the last 8. */
function readScores(v: unknown): { week: string; score: number; away: boolean }[] | null {
  if (!Array.isArray(v)) return null;
  return v.slice(-8).map((x) => {
    const o = x && typeof x === "object" ? (x as Record<string, unknown>) : {};
    return { week: typeof o.week === "string" ? o.week.slice(0, 10) : "", score: Math.max(0, Math.round(numOf(o.score) ?? 0)), away: o.away === true };
  });
}

/** kept_counts_8w: {set, kept, partly, missed, not_checked}. */
function readCounts(v: unknown): Coached["keptCounts"] | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const n = (k: string) => Math.max(0, Math.round(numOf(o[k]) ?? 0));
  return { set: n("set"), kept: n("kept"), partly: n("partly"), missed: n("missed"), notChecked: n("not_checked") };
}

export type Attention = { level: "now" | "today" | null; words: string };

/** The §3n.4 answer, checked: agents with a name and a readable commitments state. */
export function readCoached(j: unknown, today: string): Coached[] {
  const agents = j && typeof j === "object" ? (j as { agents?: unknown }).agents : null;
  if (!Array.isArray(agents)) return [];
  const out: Coached[] = [];
  for (const a of agents as Record<string, unknown>[]) {
    if (!a || typeof a.agent_id !== "string") continue;
    const c = readCommitments({ ...a, today });
    if (!c) continue;
    const name = typeof a.name === "string" && a.name.trim() ? a.name.trim().slice(0, 60) : "Agent";
    const photo = typeof a.photo_url === "string" && /^https:\/\//.test(a.photo_url) ? a.photo_url.slice(0, 500) : null;
    // last_active_at only: last_sign_in_at stays in MASTER's answer for old readers, never on the board (23 Oct)
    const seen = [a.last_active_at, a.last_active].find((v) => typeof v === "string" && !Number.isNaN(Date.parse(v))) as string | undefined;
    const kw = readKeptWeeks(a.kept_by_week);
    const scores = readScores(a.scores_by_week);
    const counts = readCounts(a.kept_counts_8w);
    const thisWeek = numOf(a.score_this_week);
    out.push({
      id: a.agent_id,
      name: name.includes("@") ? name.split("@")[0] : name,
      c,
      setup: readSetup(a.setup),
      photo,
      ...(kw ? { keptWeeks: kw } : {}),
      lastActive: seen ?? null,
      ...(typeof a.last_active_source === "string" ? { lastActiveSource: a.last_active_source.slice(0, 20) } : {}),
      ...(thisWeek != null ? { scoreThisWeek: Math.max(0, Math.round(thisWeek)) } : {}),
      ...(scores ? { scoresByWeek: scores } : {}),
      ...(counts ? { keptCounts: counts } : {}),
      ...(typeof a.has_commitments === "boolean" ? { hasCommitments: a.has_commitments } : {}),
    });
  }
  return out;
}

/** What the coach should know about one agent right now, in plain words. Facts only. */
export function attention(a: Coached, hour: number): Attention {
  const { c } = a;
  const level = dueLevel(c.due, c.today, hour);
  const first = a.name.split(/\s+/)[0];
  if (level === "now" && c.due) {
    const late: Record<string, string> = {
      set_week: `${first} hasn't set this week's commitments`,
      check_week: `${first} hasn't checked in on the week`,
      set_weekend: `${first} hasn't set weekend commitments`,
      check_weekend: `${first} hasn't checked in on the weekend`,
    };
    return { level, words: late[c.due] };
  }
  if (level === "today" && c.due) return { level, words: `${dueWords(c.due)} today` };
  const items = c.week?.items ?? [];
  if (!items.length) return { level: null, words: "No commitments this week" };
  const missed = items.filter((i) => i.result === "missed").length;
  if (missed) return { level: null, words: `Missed ${missed} of ${items.length} this week` };
  const on = items.filter((i) => i.result === "kept" || reached(i)).length;
  return { level: null, words: `${on} of ${items.length} on track` };
}

/** Who needs the coach first: late (red), due today (yellow), then the lowest keep rate. */
export function coachOrder(agents: Coached[], hour: number): Coached[] {
  const rank = (a: Coached) => {
    const l = attention(a, hour).level;
    return l === "now" ? 0 : l === "today" ? 1 : 2;
  };
  return [...agents].sort((a, b) => rank(a) - rank(b) || (a.c.keepRate8w ?? 1) - (b.c.keepRate8w ?? 1) || a.name.localeCompare(b.name));
}

/** The team's keep rate: the average of the agents who have one. */
export function teamKeepRate(agents: Coached[]): number | null {
  const rates = agents.map((a) => (a.hasCommitments === false ? null : a.c.keepRate8w)).filter((r): r is number => r != null);
  return rates.length ? rates.reduce((t, r) => t + r, 0) / rates.length : null;
}

/** Last week, as kept / all (partly counts half), for the drawer. */
export const lastWeekShare = (a: Coached) => {
  const lw = a.c.lastWeek;
  if (!lw) return null;
  const n = lw.kept + lw.partly + lw.missed;
  return n ? (lw.kept + lw.partly / 2) / n : null;
};
export { keepShare };

/** ONE YOU's Coaching orb: only for a coach. It pulses for the agents who are late, with a count. */
export function withCoachNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, agents: Coached[] | null, hour: number): G {
  const go = g.nodes.find((n) => n.id === "go");
  const nodes = g.nodes.filter((n) => n.id !== COACH_NODE);
  const edges = g.edges.filter((e) => e.target !== COACH_NODE);
  if (!go || go.locked || !agents?.length) return { ...g, nodes, edges };
  const late = agents.filter((a) => attention(a, hour).level === "now").length;
  const today = agents.filter((a) => attention(a, hour).level === "today" || setupLate(a.setup, a.c.today)).length;
  const rate = teamKeepRate(agents);
  nodes.push({
    id: COACH_NODE,
    type: "feature",
    label: "Coaching",
    secondaryLabel: late ? `${late} ${late === 1 ? "agent needs" : "agents need"} a word from you` : `${agents.length} ${agents.length === 1 ? "agent" : "agents"}${rate != null ? ` · ${Math.round(rate * 100)}% kept` : ""}`,
    parentId: "go",
    product: "go",
    importance: 1.02,
    status: late ? "action" : today ? "attention" : "healthy",
    stats: [{ label: "Agents", value: String(agents.length) }],
    summary: "The commitments and setup of the agents you coach: who has set the week, who checked in, who kept them and what is left to set up. Read only.",
  });
  edges.push({ id: `go>${COACH_NODE}`, source: "go", target: COACH_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

/** Made-up agents for the sales demo, so the Coach view shows what a coach sees. */
export function demoCoached(today: string): Coached[] {
  const base = (over: Partial<Commitments>): Commitments => ({ today, due: null, week: null, weekend: null, lastWeek: null, keepRate8w: null, streak: 0, ...over });
  const item = (id: string, text: string, kind: Kind, target: number | null, count: number | null): Item => ({ id, text, kind, target, count, result: null, note: null });
  const week = (id: string, items: Item[]) => ({ id, starts: today, setAt: `${today}T14:00:00Z`, checkedAt: null, items });
  const st = (done: string[], since: string | null, counts: Record<string, number> = {}) =>
    readSetup({
      since,
      steps: [
        ["profile", "Photo and name in My Profile"], ["phone_app", "Phone app with notifications on"], ["contacts", "50 contacts in ONE MOVE"],
        ["vip50", "25 people in the VIP-50"], ["pulse_modes", "Pulse settings chosen"], ["calendar", "Calendar connected"], ["first_week", "A week at 100 points"],
      ].map(([key, label]) => ({ key, label, done: done.includes(key), count: counts[key] })),
    });
  const ago = (d: number) => new Date(Date.parse(`${today}T12:00:00Z`) - d * 86_400_000).toISOString().slice(0, 10);
  const list: Omit<Coached, "setup">[] = [
    { id: "t2", name: "Marcus Lee", c: base({ due: "set_week", keepRate8w: 0.45, streak: 0, lastWeek: { kept: 1, partly: 1, missed: 3 } }) },
    { id: "t1", name: "Jen Alvarez", c: base({ week: week("w2", [item("a", "Call 15 VIPs", "call", 15, 11), item("b", "Two coffees", "face_to_face", 2, 2), item("c", "Finish my listing presentation", "yes_no", null, null)]), keepRate8w: 0.83, streak: 6, lastWeek: { kept: 4, partly: 1, missed: 0 } }) },
    { id: "t4", name: "Dave Kim", c: base({ week: week("w3", [item("a", "Three handwritten notes", "handwritten_note", 3, 1), item("b", "Call 10 VIPs", "call", 10, 2)]), keepRate8w: 0.6, streak: 1, lastWeek: { kept: 2, partly: 1, missed: 2 } }) },
    { id: "t5", name: "Amy Chen", c: base({ week: week("w4", [item("a", "Book my open house", "yes_no", null, null), item("b", "Five video texts", "video_text", 5, 5)]), keepRate8w: 0.92, streak: 9, lastWeek: { kept: 5, partly: 0, missed: 0 } }) },
  ];
  const setups: Record<string, Setup | null> = {
    t2: st(["profile", "phone_app"], ago(21), { contacts: 12, vip50: 3 }),
    t1: st(["profile", "phone_app", "contacts", "vip50", "pulse_modes", "calendar", "first_week"], ago(200), { contacts: 412, vip50: 50 }),
    t4: st(["profile", "contacts", "pulse_modes", "first_week"], ago(60), { contacts: 96, vip50: 18 }),
    t5: st(["profile", "phone_app", "contacts", "vip50", "pulse_modes", "first_week"], ago(120), { contacts: 230, vip50: 41 }),
  };
  return list.map((a) => ({ ...a, setup: setups[a.id] ?? null }));
}
