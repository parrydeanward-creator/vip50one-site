import type { GraphIndex } from "../graph/model.ts";
import type { GraphEdge, GraphNode, NodeStatus } from "../graph/types.ts";
import { moveGroupId, moveMenuHref, movePageId } from "../moveMenu.ts";
import { CHALLENGE_NODE, SCORE_NODE } from "../oneYou.ts";
import { LEARN_FILMS, LEARN_START, dateWords, type Learn } from "../learn.ts";
import { EVENTS_PARTS, OUTREACH_PARTS, dayWords, rsvpLine, timeWords, type EventsNow } from "../outreach.ts";

// ONE MOVE's group heads (walker 18 Oct; Parry 06:48: "the side information is blank"): Trackers, Events, Outreach and
// Learn each open their own panel, every part with its count, its pulse and a few lines of what is in it, and a tap on
// a part opens the view it already has. The example agent (?demo=1) has no Trackers group, so it gets one here, with
// invented numbers that say "Example". Pure.

export interface PartSpec {
  label: string;
  /** Candidate orbs, first found wins: the ONE MOVE page orb (signed in), then the Brain's own view of it (example). */
  ids: string[];
}

export const TRACKERS_PARTS: PartSpec[] = [
  { label: "Daily Tracker", ids: [movePageId("/daily")] },
  { label: "Weekly Tracker", ids: [movePageId("/weekly")] },
  { label: "90-Day Challenge", ids: [movePageId("/challenge"), CHALLENGE_NODE] },
  { label: "Scoreboard", ids: [movePageId("/achievements"), SCORE_NODE] },
  { label: "Analytics", ids: [movePageId("/analytics")] },
];
export const LEARN_PARTS: PartSpec[] = [
  { label: "Start here", ids: [LEARN_START] },
  { label: "What's New", ids: [movePageId("/whats-new")] },
  { label: "The Vault", ids: [movePageId("/vault")] },
  { label: "Tour films", ids: [LEARN_FILMS] },
  { label: "Video Library", ids: [movePageId("/content")] },
  { label: "VIP Docs", ids: [movePageId("/vip-docs")] },
];

/** The parts a group's panel lists, in ring order; [] for a group with none. */
export function partsFor(key: string): PartSpec[] {
  if (key === "outreach") return OUTREACH_PARTS;
  if (key === "events") return EVENTS_PARTS;
  if (key === "trackers") return TRACKERS_PARTS;
  if (key === "learn") return LEARN_PARTS;
  return [];
}

export interface GroupPart {
  id: string;
  label: string;
  line: string;
  status?: NodeStatus;
  /** How many need the agent (the orb's own count), 0 when none. */
  count: number;
  lit: boolean;
}

const countOf = (n: GraphNode) => n.needCount ?? n.needFloor?.count ?? 0;
const isLit = (n: GraphNode) => n.status === "action" || n.status === "attention" || !!n.needFloor;

/** Each part's orb: a child of the group first, else the same view elsewhere in the graph. A part with no orb is left out. */
export function groupParts(ix: GraphIndex, groupId: string, specs: readonly PartSpec[]): GroupPart[] {
  return specs.flatMap((p) => {
    const found = p.ids.map((id) => ix.byId.get(id)).filter((x): x is GraphNode => !!x);
    const n = found.find((x) => x.parentId === groupId) ?? found[0];
    if (!n) return [];
    const lit = isLit(n);
    return [{ id: n.id, label: p.label, line: n.secondaryLabel || "Open to see it", status: n.status ?? (lit ? "attention" : undefined), count: lit ? Math.max(1, countOf(n)) : 0, lit }];
  });
}

/** Follow the pulse: the group is lit when a part is, at the part's level; its count is the parts' counts added up. */
export function groupPulse(parts: readonly GroupPart[]): { status?: NodeStatus; count: number } {
  const lit = parts.filter((p) => p.lit);
  if (!lit.length) return { count: 0 };
  return { status: lit.some((p) => p.status === "action") ? "action" : "attention", count: lit.reduce((a, p) => a + p.count, 0) };
}

// ---- what is in each part: a few lines under its row ------------------------------------------------------------------

export interface ExampleInput {
  /** The example agent: invented lines are allowed, and say "Example". */
  demo: boolean;
  today: string;
  events: EventsNow | null;
  learn: Learn | null;
  ix: GraphIndex;
}

const dayOrToday = (d: string, today: string) => (d === today ? "Today" : dayWords(d));

/** Up to four lines per part id. Real data first (the routes' answers, the orb's own children); invented lines only for the example agent. */
export function partExamples(key: string, parts: readonly GroupPart[], x: ExampleInput): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const kidsOf = (id: string) =>
    [...x.ix.byId.values()]
      .filter((n) => n.parentId === id && !n.id.startsWith("live:"))
      .slice(0, 3)
      .map((n) => (n.secondaryLabel ? `${n.label} · ${n.secondaryLabel}` : n.label));
  for (const p of parts) {
    let lines: string[] = [];
    const e = x.events;
    const l = x.learn;
    const box = x.ix.byId.get(moveGroupId("trackers"))?.boxes;
    switch (p.label) {
      case "Calendar":
        lines = e ? e.calendar.slice(0, 4).map((c) => `${dayOrToday(c.date, x.today)}${c.start ? ` ${timeWords(c.start)}` : ""} · ${c.title}`) : [];
        if (e && !e.calendar.length) lines = ["Nothing on your calendar in the next 7 days"];
        break;
      case "VIP Events":
        if (e?.vipNext) lines = [`${e.vipNext.title} · ${dayWords(e.vipNext.on)}${e.vipNext.location ? ` · ${e.vipNext.location}` : ""}`, rsvpLine(e.vipInvited, e.vipYes)];
        break;
      case "Mixer":
        if (e) lines = [`${e.mixerTitle ?? "Client mixer"}${e.mixerNext ? ` · ${dayWords(e.mixerNext)}` : " · no date set"}`, e.mixerInvites ? `${e.mixerInvites} invites sent this month${e.mixerYes != null ? ` · ${e.mixerYes} yes` : ""}` : "No invites sent this month: it is a monthly VIP touch"];
        break;
      case "Start here":
        if (l?.nextVideo) lines = [`Next: ${l.nextVideo.title}`, l.watched == null ? `${l.total} videos` : `${l.watched} of ${l.total} watched`];
        break;
      case "What's New":
        if (l) lines = l.whatsNew.slice(0, 3).map((w) => `${dateWords(w.date)} · ${w.title}`);
        break;
      case "The Vault":
        if (l) lines = l.vaultNewest.slice(0, 3).map((v) => (v.category ? `${v.title} · ${v.category}` : v.title));
        break;
      case "Daily Tracker":
        if (box?.length) lines = box.filter((b) => !b.done).slice(0, 3).map((b) => `To do: ${b.label} · ${b.points} pts`);
        break;
      default:
        lines = kidsOf(p.id);
    }
    lines = lines.filter((t) => t !== p.line);
    if (!lines.length && x.demo) lines = DEMO_LINES[p.label] ?? [];
    if (lines.length) out[p.id] = lines.slice(0, 4);
  }
  return out;
}

/** The example agent's lines for parts with nothing else to show. Invented. */
const DEMO_LINES: Record<string, string[]> = {
  Newsletter: ["October issue · draft · 47 VIPs will get it", "September issue · sent to 85"],
  "Market Reports": ["Willow Creek, for Jen Alvarez · ready for the 1st", "Corner Canyon, for the Millers · ready for the 1st", "South Mountain, for Dave Kim · set up"],
  "Action Plans": ["Open House Follow-Up · 3 enrolled", "Just Closed · 1 enrolled", "Welcome to VIP-50 · 2 enrolled"],
  "Landing Pages": ["What is my home worth? · 3 leads", "Draper first-time buyers · 1 lead"],
  "Weekly Tracker": ["Face to face: 2 this week · 10 pts", "Mixer invite sent: not yet · 5 pts", "Newsletter sent: not yet · 5 pts"],
  "90-Day Challenge": ["Day 23 of 90", "Today: 64 of 100"],
  Scoreboard: ["#4 on the leaderboard this week", "3 badges earned this month"],
  "Video Library": ["Your first week with the VIP-50", "Running a VIP mixer"],
  "VIP Docs": ["VIP-50 playbook", "Touch scripts"],
};

// ---- the example agent's Trackers group ---------------------------------------------------------------------------------

type G = { nodes: GraphNode[]; edges: GraphEdge[] };

/**
 * The example agent's Trackers group round ONE MOVE (the signed-in graph builds it in lib/live.ts): its scores, today's
 * boxes, and the Daily and Weekly Tracker orbs moved under it. Nothing when ONE MOVE is locked or Trackers is there.
 */
export function withDemoTrackers<g extends G>(g: g): g {
  const move = g.nodes.find((n) => n.id === "move");
  const gid = moveGroupId("trackers");
  if (!move || move.locked || g.nodes.some((n) => n.id === gid)) return g;
  const pages: [string, string, string, NodeStatus | undefined][] = [
    ["/daily", "Daily Tracker", "Example: 18 of 26 points today", "attention"],
    ["/weekly", "Weekly Tracker", "Example: 64 of 100 this week", undefined],
  ];
  const ids = new Set(pages.map(([p]) => movePageId(p)));
  const nodes: GraphNode[] = g.nodes.filter((n) => !ids.has(n.id));
  const edges: GraphEdge[] = g.edges.filter((e) => !ids.has(e.target));
  nodes.push({
    id: gid,
    type: "category",
    label: "Trackers",
    secondaryLabel: "1 needs you",
    parentId: "move",
    product: "move",
    importance: 0.87,
    status: "attention",
    summary: "Trackers in ONE MOVE: Daily Tracker, Weekly Tracker, 90-Day Challenge, Scoreboard, Analytics.",
    stats: [
      { label: "Example: Daily score", value: "18 / 26" },
      { label: "Example: Weekly score", value: "64 / 100" },
      { label: "Example: Weekly boxes", value: "3 / 8" },
      { label: "Example: Streak", value: "4 days" },
    ],
    boxes: [
      { label: "Calls (5)", done: true, points: 5 },
      { label: "Video texts (3)", done: true, points: 3 },
      { label: "Social touches (3)", done: true, points: 3 },
      { label: "Handwritten note", done: false, points: 2 },
      { label: "Hot worked", done: true, points: 2 },
      { label: "Warm worked", done: true, points: 2 },
      { label: "Cold worked", done: false, points: 2 },
      { label: "Face to face", done: false, points: 4 },
      { label: "Power Hour", done: true, points: 3 },
    ],
  });
  edges.push({ id: `move>${gid}`, source: "move", target: gid, relationshipType: "belongs_to", strength: 1 });
  pages.forEach(([path, label, line, status], j) => {
    const id = movePageId(path);
    nodes.push({ id, type: "feature", label, secondaryLabel: line, parentId: gid, product: "move", importance: 0.8 - j * 0.02, href: moveMenuHref(path), status, needCount: status ? 1 : undefined });
    edges.push({ id: `${gid}>${id}`, source: gid, target: id, relationshipType: "belongs_to", strength: 1 });
  });
  return { ...g, nodes, edges };
}

// ---- the example agent's Daily and Weekly Tracker (the raw answers of ONE MOVE's routes, invented) ----------------------

const box = (key: string, label: string, points: number, done: boolean) => ({ key, label, points, done });

/** GET /api/brain/daily as the example agent's would answer: 18 of 26 points so far today. */
export function demoDailyRaw(today: string) {
  return {
    date: today,
    score: 18,
    max: 26,
    week: { score: 64, minimum: 100 },
    sections: [
      { key: "vip", label: "VIP touches", boxes: [box("call", "Calls (5)", 5, true), box("video_text", "Video texts (3)", 3, true), box("social", "Social touches (3)", 3, true), box("note", "Handwritten note", 2, false)] },
      { key: "hwc", label: "Hot, Warm, Cold", boxes: [box("hot_contact", "Hot worked", 2, true), box("warm_contact", "Warm worked", 2, true), box("cold_contact", "Cold worked", 2, false)] },
      { key: "business", label: "Business", boxes: [box("face_to_face", "Face to face", 4, false), box("power_hour", "Power Hour", 3, true)] },
    ],
  };
}

/** GET /api/brain/weekly as the example agent's would answer: 64 of the weekly 100. */
export function demoWeeklyRaw(today: string) {
  const d = new Date(`${today}T12:00:00Z`);
  const monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86_400_000);
  const days = [14, 18, 12, 0, 0, 0, 0].map((points, i) => ({ date: new Date(monday.getTime() + i * 86_400_000).toISOString().slice(0, 10), points }));
  const wb = (key: string, label: string, points: number, done: boolean, auto = false) => ({ key, label, points, done, auto });
  return {
    week_start: days[0].date,
    score: 64,
    minimum: 100,
    met: false,
    daily_points: 44,
    bonus_points: 20,
    days,
    sections: [
      { key: "relationships", label: "Relationships", boxes: [wb("face_to_face_2", "Two face to face", 10, true), wb("mixer_participation", "Mixer Participation", 5, true), wb("drop_by", "Drop-by", 5, false)] },
      { key: "sends", label: "Sends", boxes: [wb("mixer_invite_sent", "Mixer invite sent", 5, false, true), wb("newsletter_sent", "Newsletter sent", 5, false, true)] },
      { key: "business", label: "Business", boxes: [wb("open_house", "Open house held", 5, true), wb("weekly_review", "Weekly Review", 5, false)] },
    ],
  };
}

/**
 * Where a ONE MOVE menu row goes: its page orb, or, when the graph has none (the example agent), the Brain's own view
 * of the same thing (90-Day Challenge, Scoreboard, the example Mixer, Newsletter and Action Plans orbs; Overview and Learn home are their groups), so the row never drops back to the whole map.
 */
export function menuTarget(path: string, has: (id: string) => boolean): string {
  const own = movePageId(path);
  if (has(own)) return own;
  // Outreach's Overview and Learn home are their group orbs themselves.
  const group = path === "/outreach" ? moveGroupId("outreach") : path === "/learn" ? moveGroupId("learn") : null;
  if (group && has(group)) return group;
  const spec = [...TRACKERS_PARTS, ...LEARN_PARTS, ...OUTREACH_PARTS, ...EVENTS_PARTS].find((p) => p.ids[0] === own);
  return spec?.ids.find(has) ?? own;
}
