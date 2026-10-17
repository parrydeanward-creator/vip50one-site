import type { GraphEdge, GraphNode } from "./graph/types.ts";
import type { NewLeads } from "./newLeads.ts";
import { movePageId, moveMenuHref } from "./moveMenu.ts";

// New to Sort, drawn natively (walker inbox/ecosystem/2026-10-17-0127-from-walker-new-to-sort.md; Parry, 16 Oct 19:25
// MT: "yes"). An orb directly on ONE MOVE, never hidden: a still green ring and a plain line when no one is waiting,
// yellow with the count when someone is. Opened, one orb per source (each open house by address and date, tours,
// website, listing sellers) with the people as faces round it. The agent sorts each person: Hot, Warm, Cold, VIP-100,
// Just a contact, or Not for me (archived, never deleted). ONE suggests, the agent accepts; nothing is sent; nobody
// goes into the VIP-50 here (VIP Management's swap does that).
//
// Where it comes from: ONE MOVE's `GET /api/brain/new-to-sort` (live 17 Oct). Only when that route is not there (404,
// or no answer at all; lib/routeFirst.ts) does the Brain fall back to the new leads ONE MOVE already sends
// (`/api/brain/today`) that came from one of the four sources. Sorting goes to `POST /api/brain/new-to-sort/sort`
// (MASTER's own words shown on a refusal); only if that is missing do Hot/Warm/Cold go through the Hot/Warm/Cold add
// route and the rest say they are coming from ONE MOVE.

const MOVE_URL = "https://move.vip50one.com";
export const newToSortUrl = `${MOVE_URL}/api/brain/new-to-sort`;
export const newToSortSortUrl = `${MOVE_URL}/api/brain/new-to-sort/sort`;
export const hwcAddUrl = `${MOVE_URL}/api/brain/hwc/add`;
export const NTS_PATH = "/contacts/visitors";
/** The live orb (ONE MOVE's menu page, so its menu row opens the same view), and the demo's (lib/graph/move.ts). */
export const NTS_NODE = movePageId(NTS_PATH);
export const DEMO_NTS_NODE = "move-4";
export const isNewToSortOrb = (id: string) => id === NTS_NODE || id === DEMO_NTS_NODE;
export const EMPTY_LINE = "No one to sort. New people from your open houses, tours, website and listings land here, each with where they came from.";
export const SUMMARY = "Everyone new, from every source: open houses, tours, your website and listing sellers. Pulse suggests where each one goes; you decide. Nobody goes into your VIP-50 from here.";

export type SourceKind = "open_house" | "tour" | "website" | "listing";
export type SortTo = "hot" | "warm" | "cold" | "vip100" | "contact" | "not_for_me";
export const SORT_BUTTONS: { to: SortTo; label: string; color?: string }[] = [
  { to: "hot", label: "Hot", color: "#ff5a4f" },
  { to: "warm", label: "Warm", color: "#f5a742" },
  { to: "cold", label: "Cold", color: "#5aa9ff" },
  { to: "vip100", label: "VIP-100" },
  { to: "contact", label: "Just a contact" },
  { to: "not_for_me", label: "Not for me" },
];
const SORT_WORD: Record<SortTo, string> = { hot: "Hot", warm: "Warm", cold: "Cold", vip100: "VIP-100", contact: "a contact", not_for_me: "archived" };
export const KIND_LABEL: Record<SourceKind, string> = { open_house: "Open house", tour: "Tours", website: "Your website", listing: "Listing sellers" };
export const KIND_COLOR: Record<SourceKind, string> = { open_house: "#8fd16a", tour: "#ff8fb1", website: "#7cc7ff", listing: "#f5c542" };

export interface NtsPerson {
  contactId: string;
  firstName: string;
  /** Full name when ONE MOVE sends it (the fallback has it). */
  name: string;
  wherePlain: string;
  said: string | null;
  rating: number | null;
  phone: string | null;
  email: string | null;
  at: string | null;
  suggest: { cls: SortTo; line: string } | null;
}
export interface NtsSource {
  key: string;
  kind: SourceKind;
  label: string;
  date: string | null;
  people: NtsPerson[];
}
export interface NewToSort {
  sources: NtsSource[];
  /** False when the list came from what ONE already had (ONE MOVE's route had not answered). */
  fromMove: boolean;
}

const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const isKind = (v: unknown): v is SourceKind => v === "open_house" || v === "tour" || v === "website" || v === "listing";
const isSort = (v: unknown): v is SortTo => SORT_BUTTONS.some((b) => b.to === v);
const dayOf = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);

/**
 * One open house, one group: "450 E 100 S #20, Salt Lake City" and "450 E 100 S #20, Salt Lake, UT 84111" are the same
 * house. Keeps the street and the unit (a "#20", "Unit 4", "Apt 2" part right after the street counts as the unit),
 * drops city, state and zip; case, spaces and full stops do not matter.
 */
export function normAddress(a: string): string {
  const parts = a.split(",").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return "";
  const keep = [parts[0]];
  if (parts[1] && /^(#|unit\b|apt\b|apartment\b|ste\b|suite\b|no\.?\s*\d)/i.test(parts[1])) keep.push(parts[1]);
  return keep
    .join(" ")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/#\s+/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

/** The street part to show for a group: "450 E 100 S #20". */
export const streetOf = (a: string) => {
  const parts = a.split(",").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return a.trim();
  return parts[1] && /^(#|unit\b|apt\b|apartment\b|ste\b|suite\b)/i.test(parts[1]) ? `${parts[0]} ${parts[1]}` : parts[0];
};

function readPerson(x: unknown): NtsPerson | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  const contactId = str(r.contact_id, 60);
  const first = str(r.first_name, 40) ?? str(r.name, 80)?.split(/\s+/)[0] ?? null;
  if (!contactId || !first) return null;
  const s = r.suggest && typeof r.suggest === "object" ? (r.suggest as Record<string, unknown>) : null;
  const rating = typeof r.rating === "number" && Number.isFinite(r.rating) ? Math.max(0, Math.min(5, Math.round(r.rating))) : null;
  return {
    contactId,
    firstName: first,
    name: str(r.name, 80) ?? first,
    wherePlain: str(r.where_plain, 240) ?? "",
    said: str(r.said, 400),
    rating: rating || null,
    phone: str(r.phone, 40),
    email: str(r.email, 120),
    at: str(r.at, 40),
    suggest: s && isSort(s.class) && str(s.line, 240) ? { cls: s.class, line: str(s.line, 240)! } : null,
  };
}

/**
 * The sources, checked and grouped: each open house once per house and day (address spellings merged; a source with
 * no date joins its house's group), tours, website and listing sellers once each. A person shows once.
 */
export function groupSources(raw: { key: string; kind: SourceKind; label: string; date: string | null; people: NtsPerson[] }[]): NtsSource[] {
  const groups = new Map<string, NtsSource>();
  const order: string[] = [];
  const seen = new Set<string>();
  const undated: typeof raw = [];
  const put = (gk: string, s: (typeof raw)[number], label: string) => {
    let g = groups.get(gk);
    if (!g) {
      g = { key: gk, kind: s.kind, label, date: dayOf(s.date), people: [] };
      groups.set(gk, g);
      order.push(gk);
    }
    for (const p of s.people) {
      if (seen.has(p.contactId)) continue;
      seen.add(p.contactId);
      g.people.push(p);
    }
  };
  for (const s of raw) {
    if (s.kind !== "open_house") {
      put(s.kind, s, KIND_LABEL[s.kind]);
      continue;
    }
    if (!dayOf(s.date)) {
      undated.push(s);
      continue;
    }
    put(`open_house|${normAddress(s.label)}|${dayOf(s.date)}`, s, streetOf(s.label));
  }
  for (const s of undated) {
    const addr = normAddress(s.label);
    const same = order.filter((k) => k.startsWith(`open_house|${addr}|`));
    put(same.length === 1 ? same[0] : `open_house|${addr}|`, s, streetOf(s.label));
  }
  return order.map((k) => groups.get(k)!).filter((g) => g.people.length);
}

/** ONE MOVE's `/api/brain/new-to-sort` answer (`{sources: [...]}` or the bare list), checked; null when it is not one. */
export function readNewToSort(j: unknown): NewToSort | null {
  const list = Array.isArray(j) ? j : j && typeof j === "object" ? (j as { sources?: unknown }).sources : null;
  if (!Array.isArray(list)) return null;
  const raw: Parameters<typeof groupSources>[0] = [];
  for (const x of list as Record<string, unknown>[]) {
    if (!x || typeof x !== "object" || !isKind(x.kind)) continue;
    const label = str(x.label, 160) ?? KIND_LABEL[x.kind];
    const people = (Array.isArray(x.people) ? x.people : []).map(readPerson).filter((p): p is NtsPerson => !!p);
    raw.push({ key: str(x.key, 120) ?? `${x.kind}|${label}`, kind: x.kind, label, date: str(x.date, 40), people });
  }
  return { sources: groupSources(raw), fromMove: true };
}

/** A new lead's source words, as one of the four sources; null for anything else (portals, ads). */
export function kindOfSource(source: string | null): SourceKind | null {
  const s = (source ?? "").toLowerCase();
  if (/open[\s_-]?house/.test(s)) return "open_house";
  if (/tour|showly|showing/.test(s)) return "tour";
  if (/marquee|listing|seller/.test(s)) return "listing";
  if (/website|site|valuation|home value/.test(s)) return "website";
  return null;
}

/** Until ONE MOVE's route answers: today's new leads that came from one of the four sources and are not reached yet. */
export function fromNewLeads(l: NewLeads | null): NewToSort | null {
  if (!l) return null;
  const raw: Parameters<typeof groupSources>[0] = [];
  for (const p of l.people) {
    const kind = kindOfSource(p.source);
    if (!kind || p.touched) continue;
    raw.push({
      key: kind,
      kind,
      label: KIND_LABEL[kind],
      date: dayOf(p.at),
      people: [{ contactId: p.id, firstName: p.firstName ?? (p.nameMissing ? "This lead" : p.name.split(/\s+/)[0]), name: p.name, wherePlain: `${p.today ? "Came in today" : "Came in"} from ${p.source}`, said: null, rating: null, phone: null, email: null, at: p.at, suggest: null }],
    });
  }
  // the fallback has no address to tell houses apart, so open house leads share one orb
  return { sources: groupSources(raw.map((r) => (r.kind === "open_house" ? { ...r, label: "Open house", date: null } : r))), fromMove: false };
}

export const countOf = (d: NewToSort | null) => (d ? d.sources.reduce((n, s) => n + s.people.length, 0) : 0);

/** Everyone waiting, oldest first (the side panel's list). */
export function waitingOldestFirst(d: NewToSort | null, onlyKey?: string | null): { source: NtsSource; person: NtsPerson }[] {
  if (!d) return [];
  return d.sources
    .filter((s) => !onlyKey || s.key === onlyKey)
    .flatMap((source) => source.people.map((person) => ({ source, person })))
    .sort((a, b) => (a.person.at ?? a.source.date ?? "9").localeCompare(b.person.at ?? b.source.date ?? "9"));
}

/** The list after one person is sorted: they leave, and an emptied source goes with them. */
export function withoutPerson(d: NewToSort, contactId: string): NewToSort {
  return { ...d, sources: d.sources.map((s) => ({ ...s, people: s.people.filter((p) => p.contactId !== contactId) })).filter((s) => s.people.length) };
}

/** "Sat 3 Oct" for a YYYY-MM-DD day. */
export function dayWords(d: string | null): string | null {
  const day = dayOf(d);
  if (!day) return null;
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
}

/** The source orb's name: "450 E 100 S #20 · Sat 3 Oct", "Tours", "Your website". */
export const sourceTitle = (s: NtsSource) => (s.kind === "open_house" ? [s.label, dayWords(s.date)].filter(Boolean).join(" · ") : s.label);

/** Where they came from, in plain words, never empty. */
export function whereLine(p: NtsPerson, s: NtsSource): string {
  if (p.wherePlain) return p.wherePlain;
  const bits = [s.kind === "open_house" ? `Signed in at ${sourceTitle(s).replace(" · ", ", ")}` : s.kind === "tour" ? "On a tour in Showly" : s.kind === "website" ? "Signed up on your website" : "A seller from your listings in Marquee"];
  if (p.rating) bits.push(`rated it ${p.rating} ${p.rating === 1 ? "star" : "stars"}`);
  return bits.join(" · ");
}

/** Pulse's one line, or a plain prompt when ONE MOVE has not sent a suggestion. */
export const pulseLine = (p: NtsPerson) => p.suggest?.line ?? `Pulse has no suggestion for ${p.firstName} yet. Where do they belong?`;

/** What the agent sees after a tap. */
export function sortedLine(firstName: string, to: SortTo): string {
  if (to === "not_for_me") return `${firstName} is archived. Nothing was deleted.`;
  if (to === "contact") return `${firstName} stays in your contacts.`;
  return `${firstName} is ${SORT_WORD[to]} now.`;
}
export const COMING = "Coming from ONE MOVE: this button works once ONE MOVE's update lands. Nothing was changed.";

export interface SortResult { ok: boolean; line: string }

/**
 * Sort one person. ONE MOVE's sort route first; if it is not there yet (404, or no answer at all), Hot/Warm/Cold go
 * through the Hot/Warm/Cold add route with the contact, and the others say they are coming. Nothing is ever sent to
 * the person.
 */
export async function sortPerson(p: NtsPerson, to: SortTo, f: typeof fetch = fetch): Promise<SortResult> {
  const post = (url: string, body: unknown) => f(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let missing = false;
  try {
    const r = await post(newToSortSortUrl, { contact_id: p.contactId, to });
    if (r.ok) return { ok: true, line: sortedLine(p.firstName, to) };
    if (r.status === 404 || r.status === 405) missing = true;
    else {
      const j = (await r.json().catch(() => null)) as { error?: unknown } | null;
      return { ok: false, line: str(j?.error) ?? "ONE MOVE didn't take that. Nothing was changed." };
    }
  } catch {
    // a route ONE MOVE has not shipped answers without CORS, so the fetch itself fails
    missing = true;
  }
  if (!missing) return { ok: false, line: "ONE MOVE didn't take that. Nothing was changed." };
  if (to !== "hot" && to !== "warm" && to !== "cold") return { ok: false, line: COMING };
  try {
    const r = await post(hwcAddUrl, { name: p.name, phone: p.phone ?? "", class: to, contact_id: p.contactId });
    if (r.ok) return { ok: true, line: sortedLine(p.firstName, to) };
  } catch {
    // fall through
  }
  return { ok: false, line: COMING };
}

/** The orb's line, never empty. */
export const ntsLine = (n: number) => (n ? `${n} to sort` : "No one to sort");

/**
 * The New to Sort orb on the map: directly on ONE MOVE, always there while ONE MOVE is in the package. Yellow with the
 * count when someone is waiting, a still green ring when no one is; before the first answer, just its name.
 */
export function withNewToSort<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, d: NewToSort | null): G {
  const move = g.nodes.find((n) => n.id === "move");
  if (!move || move.locked) return g;
  const id = g.nodes.some((n) => n.id === DEMO_NTS_NODE) ? DEMO_NTS_NODE : NTS_NODE;
  const old = g.nodes.find((n) => n.id === id);
  const n = countOf(d);
  const next: GraphNode = {
    ...(old ?? { type: "category", product: "move", href: moveMenuHref(NTS_PATH) }),
    id,
    label: "New to Sort",
    parentId: "move",
    importance: 0.99,
    summary: d && !n ? EMPTY_LINE : SUMMARY,
    secondaryLabel: d ? ntsLine(n) : old?.secondaryLabel,
    status: d ? (n ? "attention" : "healthy") : old?.status,
    needCount: d ? n || undefined : old?.needCount,
  } as GraphNode;
  const nodes = g.nodes.filter((x) => x.id !== id);
  nodes.push(next);
  const edges = g.edges.filter((e) => e.target !== id);
  edges.push({ id: `move>${id}`, source: "move", target: id, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

/** The example agent's Saturday open house: three visitors, signed in under two spellings of the same address. */
export const demoNewToSort = (): NewToSort =>
  readNewToSort({
    sources: [
      {
        key: "oh-1",
        kind: "open_house",
        label: "1482 Maple Ridge Dr, Draper",
        date: "2026-10-10",
        people: [
          { contact_id: "mv-n1", first_name: "Kim", name: "Kim Reyes", where_plain: "Signed in at 1482 Maple Ridge Dr, Sat 10 Oct · rated it 5 stars", said: "Loved the kitchen. Renting nearby; lease ends in March.", rating: 5, phone: "8015550142", email: "kim.reyes@example.com", at: "2026-10-10T19:05:00Z", suggest: { class: "warm", line: "Pulse suggests Warm: buying in 3-6 months. Send the thank-you." } },
          { contact_id: "mv-n3", first_name: "Jordan", name: "Jordan Lee", where_plain: "Signed in at 1482 Maple Ridge Dr, Sat 10 Oct", said: "Just looking for ideas for our own remodel.", rating: 2, phone: null, email: "jlee@example.com", at: "2026-10-10T20:40:00Z", suggest: { class: "contact", line: "Pulse suggests Just a contact: not buying; remodelling their own home." } },
        ],
      },
      {
        key: "oh-2",
        kind: "open_house",
        label: "1482 Maple Ridge Dr, Draper, UT 84020",
        date: "2026-10-10",
        people: [
          { contact_id: "mv-n2", first_name: "Sam", name: "Sam Patel", where_plain: "Signed in at 1482 Maple Ridge Dr, Sat 10 Oct · lives nearby", said: "Neighbor. Curious what the house goes for; thinking of selling next year.", rating: 4, phone: "8015550199", email: null, at: "2026-10-10T19:30:00Z", suggest: { class: "cold", line: "Pulse suggests Cold: a neighbor thinking of selling next year. Offer a home value." } },
        ],
      },
    ],
  })!;
