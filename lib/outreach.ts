import { MOVE_URL } from "./host.ts";
import type { GraphEdge, GraphNode, NodeStatus } from "./graph/types.ts";
import { moveGroupId, moveMenuHref, movePageId } from "./moveMenu.ts";
import { HOME_REPORTS_PATH } from "./homeReport.ts";

// Outreach and Events show what each tool is doing (Parry, 16 Oct 20:28 MT: "2 yes", "3 yes"; walker 2026-10-17-0230).
// Opening Outreach shows Newsletter, Market Reports, Action Plans and Landing Pages; opening Events shows Calendar, VIP
// Events and Mixer. Each is an orb with a full side panel (its numbers, what lands there, and the button into the ONE
// MOVE page), never a bare link. Newsletter and Mixer are monthly VIP touches, so each pulses yellow until this month's
// is out. Numbers from ONE MOVE's read-only routes (GO/MOVE, lib/outreach-events.ts), the same as Classic's pages.
// Agent Attraction leaves Outreach for the Team orb, team leads only (GET /api/brain/team/attraction).

export const outreachUrl = `${MOVE_URL}/api/brain/outreach`;
export const eventsUrl = `${MOVE_URL}/api/brain/events`;
export const attractionUrl = `${MOVE_URL}/api/brain/team/attraction`;

export type OutreachKey = "newsletter" | "market_reports" | "action_plans" | "landing_pages";
export type EventsKey = "calendar" | "vip_events" | "mixer";
export type PartKey = OutreachKey | EventsKey;

export interface Part<K extends PartKey = PartKey> {
  key: K;
  label: string;
  path: string;
  /** The orb's ids: ONE MOVE's page orb first, then the example agent's own orb for it (lib/graph/move.ts). */
  ids: string[];
}

/** In the order the orbs sit round their group (Parry's order, 16 Oct). */
export const OUTREACH_PARTS: Part<OutreachKey>[] = [
  { key: "newsletter", label: "Newsletter", path: "/newsletter", ids: [movePageId("/newsletter"), "move-6"] },
  { key: "market_reports", label: "Market Reports", path: HOME_REPORTS_PATH, ids: [movePageId(HOME_REPORTS_PATH)] },
  { key: "action_plans", label: "Action Plans", path: "/action-plans", ids: [movePageId("/action-plans"), "move-7"] },
  { key: "landing_pages", label: "Landing Pages", path: "/landing-pages", ids: [movePageId("/landing-pages")] },
];
export const EVENTS_PARTS: Part<EventsKey>[] = [
  { key: "calendar", label: "Calendar", path: "/calendar", ids: [movePageId("/calendar")] },
  { key: "vip_events", label: "VIP Events", path: "/events", ids: [movePageId("/events")] },
  { key: "mixer", label: "Mixer", path: "/mixer", ids: [movePageId("/mixer"), "move-5"] },
];
const ALL_PARTS: Part[] = [...OUTREACH_PARTS, ...EVENTS_PARTS];

/** Which part an orb is, or null. */
export const partOf = (id: string): Part | null => ALL_PARTS.find((p) => p.ids.includes(id)) ?? null;

/**
 * The ONE MOVE pages that open on their side panel first (the orb rule): a tap shows the numbers and the way in; the
 * panel's button opens the page itself in the Brain.
 */
export const PANEL_FIRST: ReadonlySet<string> = new Set(ALL_PARTS.map((p) => p.path));

// ---- the routes' answers --------------------------------------------------------------------------------------------

export interface Outreach {
  newsletterSent: number;
  reportsSetUp: number;
  reportsReady: number;
  plansRunning: number;
  plansWaiting: number;
  /** null: landing page visits are not counted yet (never shown as 0). */
  landingVisitors: number | null;
  landingLeads: number;
}
export interface CalendarItem { id: string; title: string; date: string; start: string | null; end: string | null; category: string | null }
export interface EventsNow {
  calendar: CalendarItem[];
  vipNext: { id: string; title: string; on: string; location: string | null } | null;
  /** null: no RSVP list kept for VIP events yet. */
  vipInvited: number | null;
  vipYes: number | null;
  mixerNext: string | null;
  mixerTitle: string | null;
  mixerInvites: number;
  mixerYes: number | null;
}
export interface AttractionTask { id: string; title: string; due: string | null; completed: boolean }
export interface Attraction { teamLead: boolean; tasks: AttractionTask[] }

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const count = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);
const str = (v: unknown, max = 200): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const ymd = (v: unknown): string | null => str(v, 40)?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
const hhmm = (v: unknown): string | null => str(v, 20)?.match(/^\d{2}:\d{2}/)?.[0] ?? null;

/** GET /api/brain/outreach, checked; null when it is not one. */
export function readOutreach(j: unknown): Outreach | null {
  const r = obj(j);
  const nl = obj(r?.newsletter), mr = obj(r?.market_reports), ap = obj(r?.action_plans), lp = obj(r?.landing_pages);
  if (!nl || !mr || !ap || !lp) return null;
  return {
    newsletterSent: count(nl.sent_this_month) ?? 0,
    reportsSetUp: count(mr.set_up) ?? 0,
    reportsReady: count(mr.ready_for_1st) ?? 0,
    plansRunning: count(ap.running) ?? 0,
    plansWaiting: count(ap.waiting_to_send) ?? 0,
    landingVisitors: count(lp.visitors_month),
    landingLeads: count(lp.leads_month) ?? 0,
  };
}

/** GET /api/brain/events, checked; null when it is not one. The calendar soonest first. */
export function readEvents(j: unknown): EventsNow | null {
  const r = obj(j);
  const ve = obj(r?.vip_event), mx = obj(r?.mixer);
  if (!r || !Array.isArray(r.calendar_next7) || !ve || !mx) return null;
  const calendar = (r.calendar_next7 as unknown[]).flatMap((x) => {
    const o = obj(x);
    const id = str(o?.id, 80), title = str(o?.title, 200), date = ymd(o?.date);
    return o && id && title && date ? [{ id, title, date, start: hhmm(o.start_time), end: hhmm(o.end_time), category: str(o.category, 40) }] : [];
  });
  calendar.sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? "99").localeCompare(b.start ?? "99"));
  const nx = obj(ve.next);
  const vipNext = nx && str(nx.id, 80) && str(nx.title, 200) && ymd(nx.on) ? { id: str(nx.id, 80)!, title: str(nx.title, 200)!, on: ymd(nx.on)!, location: str(nx.location, 200) } : null;
  return {
    calendar,
    vipNext,
    vipInvited: count(ve.invited),
    vipYes: count(ve.yes),
    mixerNext: ymd(mx.next_on),
    mixerTitle: str(mx.title, 200),
    mixerInvites: count(mx.invites_sent_this_month) ?? 0,
    mixerYes: count(mx.yes),
  };
}

/** GET /api/brain/team/attraction, checked; null when it is not one. Not done first, then by day. */
export function readAttraction(j: unknown): Attraction | null {
  const r = obj(j);
  if (!r || typeof r.team_lead !== "boolean" || !Array.isArray(r.tasks)) return null;
  const tasks = (r.tasks as unknown[]).flatMap((x) => {
    const o = obj(x);
    const id = str(o?.id, 80), title = str(o?.title, 200);
    return o && id && title ? [{ id, title, due: ymd(o.due_date), completed: o.completed === true }] : [];
  });
  tasks.sort((a, b) => Number(a.completed) - Number(b.completed) || (a.due ?? "9").localeCompare(b.due ?? "9"));
  return { teamLead: r.team_lead, tasks: r.team_lead ? tasks : [] };
}

// ---- plain words ----------------------------------------------------------------------------------------------------

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
export const dayWords = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
/** "9:30 am" for "09:30". */
export function timeWords(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`;
}

export const newsletterLine = (n: number) => (n > 0 ? (n === 1 ? "Sent this month" : `Sent this month · ${n} sent`) : "Not sent yet");
export const marketLine = (setUp: number, ready: number) => `${setUp} set up · ${ready} ready for the 1st`;
export const plansLine = (running: number, waiting: number) => `${running} running · ${waiting} waiting for you to send`;
export const leadsLine = (n: number) => `Leads this month: ${n}`;
export const visitsLine = (v: number | null) => (v == null ? "Visits not counted yet" : `Visits this month: ${v}`);
export const calendarLine = (n: number) => (n ? `${plural(n, "thing", "things")} in the next 7 days` : "Nothing in the next 7 days");
export const vipEventLine = (e: EventsNow) => (e.vipNext ? `Next: ${e.vipNext.title} · ${dayWords(e.vipNext.on)}` : "No VIP event coming up");
export const rsvpLine = (invited: number | null, yes: number | null) =>
  invited == null && yes == null ? "RSVPs not kept yet" : `${invited ?? 0} invited · ${yes ?? 0} yes`;
export const mixerLine = (e: EventsNow) =>
  `${e.mixerNext ? `Next: ${dayWords(e.mixerNext)}` : "No mixer planned"} · ${e.mixerInvites ? `${plural(e.mixerInvites, "invite", "invites")} sent this month` : "No invites sent this month"}`;

/** Calendar items by day: [["2026-10-17", [...]], ...]. */
export function byDay(items: CalendarItem[]): [string, CalendarItem[]][] {
  const out = new Map<string, CalendarItem[]>();
  for (const it of items) out.set(it.date, [...(out.get(it.date) ?? []), it]);
  return [...out.entries()];
}

/** What each part's orb says under its name, its colour and its pulse. Null data: the plain page orb, unchanged. */
export function partState(key: PartKey, o: Outreach | null, e: EventsNow | null): { line: string; status?: NodeStatus; needCount?: number } | null {
  if (key === "newsletter" || key === "market_reports" || key === "action_plans" || key === "landing_pages") {
    if (!o) return null;
    if (key === "newsletter") return o.newsletterSent ? { line: newsletterLine(o.newsletterSent), status: "healthy" } : { line: newsletterLine(0), status: "attention", needCount: 1 };
    if (key === "market_reports") return { line: marketLine(o.reportsSetUp, o.reportsReady), status: o.reportsSetUp ? "healthy" : undefined };
    if (key === "action_plans") return { line: plansLine(o.plansRunning, o.plansWaiting), status: o.plansRunning ? "healthy" : undefined };
    return { line: leadsLine(o.landingLeads), status: o.landingLeads ? "healthy" : undefined };
  }
  if (!e) return null;
  if (key === "calendar") return { line: calendarLine(e.calendar.length), status: e.calendar.length ? "healthy" : undefined };
  if (key === "vip_events") return { line: vipEventLine(e), status: e.vipNext ? "healthy" : undefined };
  return e.mixerInvites ? { line: mixerLine(e), status: "healthy" } : { line: mixerLine(e), status: "attention", needCount: 1 };
}

const SUMMARY: Record<PartKey, string> = {
  newsletter: "Your monthly newsletter to your VIPs. It is a monthly VIP touch, so it pulses until this month's is sent.",
  market_reports: "A monthly report on each client's own neighbourhood, sent until you or they stop it. Each report sent counts as that contact's market report touch for the month.",
  action_plans: "Plans running for your contacts, and the texts and emails waiting for you to send.",
  landing_pages: "Your landing pages and the leads they brought in this month.",
  calendar: "What is on your calendar in the next 7 days.",
  vip_events: "The next VIP-50 event.",
  mixer: "Your client mixer. Mixer invites are a monthly VIP touch, so it pulses until this month's are out.",
};

// ---- the orbs -------------------------------------------------------------------------------------------------------

type G = { nodes: GraphNode[]; edges: GraphEdge[] };

/**
 * One group's parts as orbs with their numbers. A signed-in agent's graph already holds the group and its page orbs
 * (lib/live.ts); the example agent's has neither, so the group is added on ONE MOVE and each part found by its example
 * orb (lib/graph/move.ts) or added. Pure; nothing when ONE MOVE is locked or missing.
 */
function withParts<g extends G>(g: g, key: "outreach" | "events", label: string, blurb: string, parts: Part[], state: (k: PartKey) => ReturnType<typeof partState>): g {
  const move = g.nodes.find((n) => n.id === "move");
  if (!move || move.locked) return g;
  const gid = moveGroupId(key);
  // The Outreach orb is itself the overview: the menu's "Overview" row (/outreach, Classic's summary page) is not a
  // fifth part on the ring (screen check 17 Oct).
  const own = key === "outreach" ? movePageId("/outreach") : null;
  const nodes = g.nodes.filter((n) => n.id !== own);
  let edges = g.edges.filter((e) => e.target !== own && e.source !== own);
  if (!nodes.some((n) => n.id === gid)) {
    nodes.push({ id: gid, type: "category", label, secondaryLabel: blurb, parentId: "move", product: "move", importance: key === "outreach" ? 0.86 : 0.88, summary: `${label} in ONE MOVE: ${parts.map((p) => p.label).join(", ")}.` });
    edges.push({ id: `move>${gid}`, source: "move", target: gid, relationshipType: "belongs_to", strength: 1 });
  }
  parts.forEach((p, i) => {
    let at = nodes.findIndex((n) => p.ids.includes(n.id));
    if (at < 0) {
      nodes.push({ id: p.ids[0], type: "feature", label: p.label, parentId: gid, product: "move", importance: 0.8, href: moveMenuHref(p.path) });
      at = nodes.length - 1;
    }
    const n = nodes[at];
    if (n.parentId !== gid) {
      edges = edges.filter((e) => e.target !== n.id);
      edges.push({ id: `${gid}>${n.id}`, source: gid, target: n.id, relationshipType: "belongs_to", strength: 1 });
    } else if (!edges.some((e) => e.target === n.id)) {
      edges.push({ id: `${gid}>${n.id}`, source: gid, target: n.id, relationshipType: "belongs_to", strength: 1 });
    }
    const s = state(p.key);
    nodes[at] = {
      ...n,
      label: p.label,
      parentId: gid,
      importance: 0.85 - i * 0.02,
      summary: SUMMARY[p.key],
      secondaryLabel: s?.line ?? n.secondaryLabel,
      status: s ? s.status : n.status,
      needCount: s ? s.needCount : n.needCount,
      // Follow the pulse (HARD RULE, 5 Oct): a part with child orbs is not a leaf, so its own pulse is carried up by its
      // floor; a lit Mixer or Newsletter lights Events or Outreach above it (screen check 17 Oct: Events stayed green).
      needFloor: s?.status === "attention" || s?.status === "action" ? { count: s.needCount ?? 1, level: s.status === "action" ? "now" : "today" } : n.needFloor,
    };
  });
  return { ...g, nodes, edges };
}

/** Outreach's four orbs with this month's numbers (null: not answered yet, the page orbs as they are). */
export function withOutreachNodes<g extends G>(g: g, o: Outreach | null): g {
  return withParts(g, "outreach", "Outreach", "Newsletter, reports, plans and pages", OUTREACH_PARTS, (k) => partState(k, o, null));
}
/** Events' three orbs with what is coming. */
export function withEventsNodes<g extends G>(g: g, e: EventsNow | null): g {
  return withParts(g, "events", "Events", "Calendar, events and mixers", EVENTS_PARTS, (k) => partState(k, null, e));
}

// ---- the example agent (?demo=1): no network; invented numbers say "Example" in the panel --------------------------

export function demoOutreach(): Outreach {
  return { newsletterSent: 0, reportsSetUp: 3, reportsReady: 2, plansRunning: 6, plansWaiting: 2, landingVisitors: null, landingLeads: 4 };
}
const plusDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
export function demoEvents(today: string): EventsNow {
  return readEvents({
    calendar_next7: [
      { id: "demo-cal-1", title: "Coffee with Marcus Webb", date: today, start_time: "09:30", end_time: "10:15", category: "meeting" },
      { id: "demo-cal-2", title: "Listing appointment, Willow Creek", date: plusDays(today, 1), start_time: "14:00", end_time: "15:00", category: "client" },
      { id: "demo-cal-3", title: "Open house, 77 E Alta View Ct", date: plusDays(today, 2), start_time: "11:00", end_time: "13:00", category: "client" },
      { id: "demo-cal-4", title: "Team meeting", date: plusDays(today, 4), start_time: "10:00", end_time: "11:00", category: "meeting" },
    ],
    vip_event: { next: { id: "demo-vip-1", title: "VIP-50 Quarterly Mastermind", on: plusDays(today, 12), location: "Draper office" }, invited: null, yes: null },
    mixer: { next_on: plusDays(today, 20), title: "Fall Client Mixer", invites_sent_this_month: 0, yes: 0 },
  })!;
}
export function demoAttraction(today: string): Attraction {
  return readAttraction({
    team_lead: true,
    tasks: [
      { id: "demo-aa-1", title: "Agent Attraction 1", due_date: today, completed: true },
      { id: "demo-aa-2", title: "Agent Attraction 2", due_date: plusDays(today, 2), completed: false },
    ],
  })!;
}
