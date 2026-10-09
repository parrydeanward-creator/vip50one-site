import type { GraphEdge, GraphNode } from "./graph/types.ts";
import type { DraftKind } from "./drafts.ts";
import type { Timeline } from "./people.ts";

// Life-event radar (PULSE-ROADMAP relationship #4; VIP-SUMMARY §3y). Only the agent's own words about their own
// contact: notes, call and text logs, touch details. Never guessed from age, family status or any other profile fact
// (Fair Housing). The radar suggests a touch the agent makes; nothing is sent, nothing is shown to the contact, and
// the coach does not see it. Plain rules decide; ONE GO copies this file word for word.

const MOVE_URL = "https://move.vip50one.com";
export const LIFE_NODE = "move-life-events";
export const lifeEventsUrl = (days = 90) => `${MOVE_URL}/api/brain/life-events?days=${days}`;
export const keepUrl = `${MOVE_URL}/api/brain/life-events/keep`;
/** An event shows once per contact per 180 days (§3y.4). */
export const QUIET_DAYS = 180;

export type LifeEvent = "baby" | "wedding" | "new_job" | "retirement" | "empty_nest" | "new_home" | "loss" | "hard_time";
export const EVENTS: LifeEvent[] = ["baby", "wedding", "new_job", "retirement", "empty_nest", "new_home", "loss", "hard_time"];
export const EVENT_TITLE: Record<LifeEvent, string> = {
  baby: "New baby",
  wedding: "Wedding",
  new_job: "New job",
  retirement: "Retirement",
  empty_nest: "Kids leaving home",
  new_home: "New home",
  loss: "A loss",
  hard_time: "A hard time",
};

// The words that count (§3y.2). Kept narrow on purpose: a missed event costs little, a wrong one costs trust.
const RULES: [LifeEvent, RegExp][] = [
  ["baby", /\b(new (baby|grandbaby|grandchild)|had (a|their|her|his) (baby|son|daughter)|having a baby|baby (boy|girl|is due|due)|pregnant|expecting|adopted (a|their)|newborn)\b/i],
  ["wedding", /\b(engaged|getting married|got married|wedding(?! anniversary)|newlyweds?|tied the knot)\b/i],
  ["new_job", /\b(new job|got promoted|promoted to|started (at|with|a new job)|new position|new role|hired (at|by))\b/i],
  ["retirement", /\b(retir(ing|ed|ement))\b/i],
  ["empty_nest", /\b(off to college|leaving for college|started college|moved out|graduat(ing|ed|ion)|empty nest(ers?)?|mission call|leaving on (a|his|her) mission)\b/i],
  ["new_home", /\b(bought a (house|home|condo|townhome)|closed on (their|a|the) (new )?(house|home|condo)|moved into (their|a|the) (new )?(house|home|place|condo))\b/i],
  ["loss", /\b(passed away|passed on|funeral|died|lost (his|her|their) (mom|mother|dad|father|wife|husband|son|daughter|brother|sister|grandma|grandpa|dog|cat))\b/i],
  ["hard_time", /\b(divorc(e|ed|ing)|separated|laid off|lost (his|her|their) job|in the hospital|surgery|cancer|diagnos(is|ed))\b/i],
];
// "not pregnant", "no wedding plans", "never retired", "hasn't moved out"
const NEGATION = /\b(not|no|never|isn't|aren't|wasn't|hasn't|haven't|didn't|won't|not yet|called off|cancel(l)?ed)\s+(\w+\s+){0,2}$/i;

/** The life events in one piece of the agent's writing, each once, in rule order. */
export function detect(text: string): LifeEvent[] {
  const out: LifeEvent[] = [];
  for (const [event, re] of RULES) {
    const g = new RegExp(re.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = g.exec(text))) {
      const before = text.slice(Math.max(0, m.index - 40), m.index);
      if (NEGATION.test(before)) continue;
      out.push(event);
      break;
    }
  }
  // "called off the wedding" reads as a hard time, not a wedding
  if (/\b(called off|cancel(l)?ed) the wedding\b/i.test(text) && !out.includes("hard_time")) out.push("hard_time");
  return out;
}

/** The sentence around a match, for the agent to see why (never shown to anyone else). */
export function quote(text: string, event: LifeEvent): string {
  const re = RULES.find(([e]) => e === event)?.[1];
  const parts = text.split(/(?<=[.!?\n])\s+/);
  const hit = (re && parts.find((p) => re.test(p))) || text;
  const t = hit.trim();
  return t.length > 140 ? `${t.slice(0, 139)}…` : t;
}

export type Tone = "celebrate" | "care" | "sympathy";
export const TONE: Record<LifeEvent, Tone> = {
  baby: "celebrate",
  wedding: "celebrate",
  new_job: "celebrate",
  retirement: "celebrate",
  empty_nest: "care",
  new_home: "celebrate",
  loss: "sympathy",
  hard_time: "care",
};

export interface Touch {
  /** What to do, in the agent's words. */
  line: string;
  /** Which Pulse draft opens; null when the touch is a call only. */
  draft: DraftKind | null;
  /** The ask passed to Pulse Drafts. */
  ask: string | null;
}

/** The touch the radar suggests (§3y.3). Loss and hard times never get business words or a home value. */
export function touchFor(e: LifeEvent, first: string): Touch {
  switch (e) {
    case "baby":
      return { line: `Send ${first} a handwritten note: congratulations on the new baby`, draft: "note", ask: "Congratulate them on their new baby. Warm, short, no business." };
    case "wedding":
      return { line: `Send ${first} a handwritten note: congratulations on the wedding`, draft: "note", ask: "Congratulate them on their engagement or wedding. Warm, short, no business." };
    case "new_job":
      return { line: `Text ${first}: congratulations on the new job`, draft: "text", ask: "Congratulate them on their new job or promotion. Short, no business." };
    case "retirement":
      return { line: `Call ${first} to congratulate them on retiring, then a note`, draft: "note", ask: "Congratulate them on retiring and wish them well. Warm, no business." };
    case "empty_nest":
      return { line: `Call ${first}: ask how they're doing with the kids leaving home`, draft: null, ask: null };
    case "new_home":
      return { line: `Send ${first} a note: congratulations on the new home`, draft: "note", ask: "Congratulate them on their new home. Warm, short, no business." };
    case "loss":
      return { line: `Send ${first} a handwritten sympathy note. No business for 30 days`, draft: "note", ask: "A short, sincere sympathy note for their loss. No business words of any kind, no offers, no home values." };
    case "hard_time":
      return { line: `Call ${first}: a caring check-in only. No card, no home value`, draft: null, ask: null };
  }
}

/** One event Pulse found for one contact. */
export interface Found {
  contactId: string;
  name: string;
  tier: string | null;
  event: LifeEvent;
  at: string;
  quote: string;
}

const firstOf = (name: string) => name.trim().split(/\s+/)[0] || name;
export const firstName = firstOf;

/** Events in one contact's own timeline, newest mention per event (works today, no new route). */
export function fromTimeline(contactId: string, name: string, t: Timeline | null): Found[] {
  if (!t) return [];
  const seen = new Map<LifeEvent, Found>();
  const events = [...t.events].sort((a, b) => b.at.localeCompare(a.at));
  for (const ev of events) {
    if (ev.kind === "web" || ev.kind === "listing" || ev.kind === "showing" || ev.kind === "open_house") continue; // not the agent's words
    const text = [ev.title, ev.detail].filter(Boolean).join(". ");
    for (const e of detect(text)) if (!seen.has(e)) seen.set(e, { contactId, name, tier: null, event: e, at: ev.at, quote: quote(text, e) });
  }
  return [...seen.values()];
}

// ---- the radar across contacts (§3y.5) ----------------------------------------------------------------------------

export type Kept = { contactId: string; event: LifeEvent; state: "done" | "not_this"; at: string };
export interface Radar {
  today: string;
  found: Found[];
  kept: Kept[];
}

const isDay = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s);
const str = (v: unknown, n: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);
const isEvent = (v: unknown): v is LifeEvent => typeof v === "string" && (EVENTS as string[]).includes(v);
const days = (a: string, b: string) => Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 86_400_000);

/** A §3y.5 answer, read with the rules; null when it is not one. One finding per contact and event, newest. */
export function readRadar(j: unknown, fallbackToday: string): Radar | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.notes)) return null;
  const today = isDay(r.today) ? r.today.slice(0, 10) : fallbackToday;
  const kept: Kept[] = [];
  for (const x of (Array.isArray(r.kept) ? r.kept : []) as Record<string, unknown>[]) {
    const id = str(x?.contact_id, 60);
    if (!id || !isEvent(x.event) || (x.state !== "done" && x.state !== "not_this") || !isDay(x.at)) continue;
    kept.push({ contactId: id, event: x.event, state: x.state, at: x.at });
  }
  const best = new Map<string, Found>();
  for (const x of r.notes as Record<string, unknown>[]) {
    const id = str(x?.contact_id, 60);
    const name = str(x?.name, 80);
    const text = str(x?.text, 600);
    if (!id || !name || !text || !isDay(x.at)) continue;
    for (const e of detect(text)) {
      const k = `${id}|${e}`;
      const f: Found = { contactId: id, name, tier: str(x.tier, 30), event: e, at: x.at, quote: quote(text, e) };
      const had = best.get(k);
      if (!had || had.at < f.at) best.set(k, f);
    }
  }
  return { today, kept, found: [...best.values()] };
}

/** What still needs the agent: not kept in the last 180 days, newest first, sympathy and care first on a tie. */
export function open(r: Radar): Found[] {
  const keptAt = (f: Found) => r.kept.find((k) => k.contactId === f.contactId && k.event === f.event && days(k.at, r.today) <= QUIET_DAYS && k.at >= f.at.slice(0, 10));
  const rank: Record<Tone, number> = { sympathy: 0, care: 1, celebrate: 2 };
  return r.found
    .filter((f) => !keptAt(f) && days(f.at, r.today) <= QUIET_DAYS)
    .sort((a, b) => b.at.localeCompare(a.at) || rank[TONE[a.event]] - rank[TONE[b.event]]);
}

/** The agent made the touch, or it was the wrong reading: put away without ONE MOVE (the example agent). */
export function applyKeep(r: Radar, contactId: string, event: LifeEvent, state: "done" | "not_this"): Radar {
  return { ...r, kept: [...r.kept.filter((k) => !(k.contactId === contactId && k.event === event)), { contactId, event, state, at: r.today }] };
}

export const keepBody = (contactId: string, event: LifeEvent, state: "done" | "not_this") => ({ contact_id: contactId, event, state });

/** "Jane Smith: New baby" lines, at most n. */
export const radarLine = (f: Found) => `${f.name}: ${EVENT_TITLE[f.event]}`;

/** The Life events orb under ONE MOVE: yellow while one from the last 14 days is untouched; quiet otherwise. */
export function withLifeEventsNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, r: Radar | null): G {
  const move = g.nodes.find((n) => n.id === "move");
  const nodes = g.nodes.filter((n) => n.id !== LIFE_NODE);
  const edges = g.edges.filter((e) => e.target !== LIFE_NODE);
  if (!move || move.locked || !r) return { ...g, nodes, edges };
  const list = open(r);
  const fresh = list.filter((f) => days(f.at, r.today) <= 14);
  nodes.push({
    id: LIFE_NODE,
    type: "feature",
    label: "Life events",
    secondaryLabel: list.length ? (fresh.length ? `${fresh.length} new · ${radarLine(fresh[0])}` : `${list.length} to touch`) : "Nothing new",
    parentId: "move",
    product: "move",
    importance: fresh.length ? 0.99 : 0.7,
    status: fresh.length ? "attention" : "healthy",
    summary: "New babies, weddings, new jobs and harder news, from your own notes. Pulse suggests the touch; you make it.",
  });
  edges.push({ id: `move>${LIFE_NODE}`, source: "move", target: LIFE_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

const back = (today: string, k: number) => new Date(Date.parse(`${today}T12:00:00Z`) - k * 86_400_000).toISOString().slice(0, 10);

/** The example agent's radar: four found in their notes, one already put away. */
export function demoRadar(today: string): Radar {
  return readRadar(
    {
      today,
      notes: [
        { contact_id: "r1", name: "Jane Smith", tier: "VIP", at: `${back(today, 2)}T18:00:00Z`, kind: "call", text: "Great call. Jane and Tom are expecting their second in March! Still loves Cafe Rio." },
        { contact_id: "r2", name: "Mike Torres", tier: "VIP", at: `${back(today, 5)}T16:30:00Z`, kind: "note", text: "Mike got promoted to regional manager at Zions. Busy but happy." },
        { contact_id: "r5", name: "Linda Park", tier: "VIP", at: `${back(today, 9)}T15:00:00Z`, kind: "text", text: "Linda's mom passed away last week. Funeral Saturday in Provo." },
        { contact_id: "r6", name: "Dave Ortiz", tier: null, at: `${back(today, 30)}T15:00:00Z`, kind: "note", text: "Oldest is off to college at USU in August; Dave says the house feels big." },
        { contact_id: "r7", name: "Amy Chen", tier: "VIP", at: `${back(today, 40)}T15:00:00Z`, kind: "note", text: "Amy is not pregnant, people keep asking. Planning a trip to Italy." },
        { contact_id: "r3", name: "Sara Lee", tier: "VIP", at: `${back(today, 20)}T15:00:00Z`, kind: "call", text: "Sara and Ben got engaged over the summer." },
      ],
      kept: [{ contact_id: "r3", event: "wedding", state: "done", at: back(today, 18) }],
    },
    today,
  )!;
}
