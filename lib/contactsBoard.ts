import { BIZ_PARENT, groupColor, isBizSub, nestBizVip, type Groups, type LeadSource, type PeopleGroup, type PersonItem } from "./people.ts";

// My Contacts, option C (Parry, 22 Oct: "yes on C"; vip50-ecosystem research/mockups/contacts/contacts-c.png): four
// clean-up buttons on top; on the left the agent's circles as rings round YOU (closest inside), a key of every group and
// where people came from; in the middle the list, starting on who needs the agent today; on the right the person picked.
// Every number opens its people (PROTOCOL rule 12). The rules here are pure so they can be tested; ONE MOVE still sends
// the groups, the counts and Pulse's lines (VIP-SUMMARY §3k), and the Brain only draws and asks.

/** The rings by closeness, inside out. "Other" is ONE MOVE's catch-all group (sent as a "came from" group). */
export const RING_KEYS = ["vip50", "vip100", "past_clients", "sphere", "other"] as const;
export type RingKey = (typeof RING_KEYS)[number];
const RING_LABEL: Record<RingKey, string> = { vip50: "VIP-50", vip100: "VIP-100", past_clients: "Past clients", sphere: "Sphere", other: "Other" };
/** The key's lines after the rings, in the order Parry approved. */
export const EXTRA_KEYS = [BIZ_PARENT, "leads", "agents", "hwc", "to_sort"] as const;
const EXTRA_LABEL: Record<string, string> = { [BIZ_PARENT]: "Biz VIP", leads: "Leads", agents: "Agents", hwc: "Hot / Warm / Cold", to_sort: "New to sort" };

/** Ring colours: the Brain's group colours, with the mockup's closeness colours for the rings. */
export const BOARD_COLOR: Record<string, string> = {
  vip50: "#f5c542",
  vip100: "#ff8a5f",
  past_clients: "#2fbf71",
  sphere: "#c58cff",
  other: "#8089a2",
  [BIZ_PARENT]: "#2ec4b6",
  leads: "#4aa3ff",
  agents: "#b8c34a",
  hwc: "#ff5a5f",
  to_sort: "#e05aa0",
};
export const boardColor = (key: string) => BOARD_COLOR[key] ?? groupColor(key);

export interface BoardLine { key: string; label: string; count: number; needsYou: number; color: string; ring: boolean }
export interface BoardSource { key: string; label: string; count: number; color: string }
export interface Board {
  total: number;
  needsYou: number;
  rings: BoardLine[];
  key: BoardLine[];
  sources: BoardSource[];
  /** The Leads line's sources, largest first: counts only (the people route has no source filter), shown under Leads. */
  leadsSources: LeadSource[];
  /** Sources with nobody yet: named in one grey line, never drawn. */
  emptySources: string[];
  /** Biz VIP's sub-groups (Mayor's Circle, Rising VIP), offered inside the Biz VIP list. */
  bizSubs: PeopleGroup[];
}

/** The board from ONE MOVE's groups. A ring or key line ONE MOVE does not send yet shows 0 (its list is then empty). */
export function boardOf(g: Groups, family: Partial<Record<string, PersonItem[]>> = {}): Board {
  const nest = nestBizVip(g.groups, family);
  const byKey = new Map(nest.ring.map((x) => [x.key, x] as const));
  const line = (key: string, label: string, ring: boolean): BoardLine => {
    const x = byKey.get(key);
    return { key, label: x?.label && !ring ? x.label : label, count: x?.count ?? 0, needsYou: x?.needsYou ?? 0, color: boardColor(key), ring };
  };
  const rings = RING_KEYS.map((k) => line(k, RING_LABEL[k], true));
  const shown = new Set<string>([...RING_KEYS, ...EXTRA_KEYS]);
  const extras = EXTRA_KEYS.map((k) => line(k, EXTRA_LABEL[k], false));
  // any other circle ONE MOVE adds later shows in the key with no Brain change
  const more = nest.ring.filter((x) => x.kind === "tier" && !shown.has(x.key) && !isBizSub(x.key)).map((x) => ({ key: x.key, label: x.label, count: x.count, needsYou: x.needsYou, color: boardColor(x.key), ring: false }));
  const src = nest.ring.filter((x) => x.kind === "source" && !shown.has(x.key));
  return {
    total: g.total,
    needsYou: g.needsYou,
    rings,
    key: [...rings, ...extras, ...more],
    sources: src.filter((x) => x.count > 0).sort((a, b) => b.count - a.count).map((x) => ({ key: x.key, label: x.label, count: x.count, color: groupColor(x.key) })),
    leadsSources: g.leadsBySource ?? [],
    emptySources: src.filter((x) => x.count === 0).map((x) => x.label),
    bizSubs: nest.subs,
  };
}

// ---- the key as tiles (Parry, 23 Oct: "yes on B"; research/mockups/contacts-key) --------------------------------------

/** The tiles before Leads and after it; an empty group goes last, full width and faded. Leads is the one wide tile. */
export function tilesOf(key: readonly BoardLine[]): { before: BoardLine[]; leads: BoardLine | null; after: BoardLine[]; empty: BoardLine[] } {
  const order = ["vip50", "vip100", "past_clients", "sphere", "leads", "hwc", "agents", "other", "to_sort", BIZ_PARENT];
  const rank = (k: string) => (order.includes(k) ? order.indexOf(k) : order.length);
  const sorted = [...key].sort((a, b) => rank(a.key) - rank(b.key));
  const leads = sorted.find((k) => k.key === "leads") ?? null;
  const rest = sorted.filter((k) => k.key !== "leads");
  const full = rest.filter((k) => k.count > 0);
  return { before: full.filter((k) => rank(k.key) < rank("leads")), leads, after: full.filter((k) => rank(k.key) > rank("leads")), empty: rest.filter((k) => !k.count) };
}

const SOURCE_WORDS: Record<string, string> = { callin: "Called in", personaltransaction: "Personal transaction", listing_email: "Listing email", open_house: "Open house", "": "Unknown" };
/** A lead source as a person would write it: "DIRECT " -> "Direct", "CALLIN" -> "Called in"; mixed case stays as typed. */
export function sourceLabel(raw: string): string {
  const t = raw.trim();
  const low = t.toLowerCase();
  if (low in SOURCE_WORDS) return SOURCE_WORDS[low];
  if (t !== low && t !== t.toUpperCase()) return t;
  const w = low.replace(/_/g, " ");
  return w.charAt(0).toUpperCase() + w.slice(1);
}
/** "Sphere" as a lead source is SOI waiting to move back to Sphere: shown in gold until it is gone. */
export const isSoiSource = (raw: string) => raw.trim().toLowerCase() === "sphere";
/** How many sources show as chips before "+N more". */
export const LEAD_CHIPS = 7;
const SOURCE_COLORS = ["#2f5fc8", "#4a7fe6", "#6b9bf5", "#8bb4f8", "#a9c7fa", "#5fb7d9", "#79c9c0"];
export const sourceColor = (raw: string, i: number) => (isSoiSource(raw) ? "#c9a43e" : SOURCE_COLORS[i] ?? "#5a6488");

// ---- what the middle list shows ------------------------------------------------------------------------------------

export type Chip = "bday" | "dup" | "sort" | "perm";
export type Filter =
  | { kind: "need" }
  | { kind: "all" }
  | { kind: "group"; key: string }
  | { kind: "source"; key: string }
  /** One lead source under Leads ("BT Paid Ad"); n is its count, so the Brain can tell when ONE MOVE did not filter. */
  | { kind: "lsrc"; key: string; n: number }
  | { kind: "chip"; key: Chip };

/** The VIPs with no birthday, when ONE MOVE lists them as a group; until then the Brain lists the VIP-50 and VIP-100. */
export const BDAY_GROUP = "vip_no_birthday";
export const BDAY_FALLBACK = ["vip50", "vip100"] as const;

export const NEED: Filter = { kind: "need" };
export const sameFilter = (a: Filter, b: Filter) => a.kind === b.kind && ("key" in a ? a.key : null) === ("key" in b ? b.key : null);
/** Tap a ring, a key line, a source or a button: its people fill the list. Tap it again: back to who needs you today. */
export const toggleFilter = (cur: Filter, next: Filter): Filter => (sameFilter(cur, next) ? NEED : next);

/** What ONE MOVE is asked for (§3k.2). Lists of a circle are A-Z; who needs you is Pulse's order, shown A-Z. */
export function filterQuery(f: Filter): { group: string | null; sort: "pulse" | "name"; source?: string } | null {
  switch (f.kind) {
    case "need":
      return { group: null, sort: "pulse" };
    case "all":
      return { group: null, sort: "name" };
    case "group":
    case "source":
      return { group: f.key, sort: "name" };
    case "lsrc":
      return { group: "leads", sort: "name", source: f.key };
    case "chip":
      return f.key === "sort" ? { group: "to_sort", sort: "name" } : f.key === "bday" ? { group: BDAY_GROUP, sort: "name" } : null;
  }
}

const n = (x: number) => x.toLocaleString("en-US");
/** The list's heading, e.g. "NEED YOU TODAY · 31", "VIP-100 · 3", "CAME FROM LOFTY · 4,998". */
export function filterTitle(f: Filter, b: Board, gaps: Groups["gaps"], needLeft: number): string {
  const line = (k: string) => b.key.find((x) => x.key === k) ?? b.bizSubs.map((x) => ({ ...x, color: "", ring: false })).find((x) => x.key === k);
  switch (f.kind) {
    case "need":
      return `NEED YOU TODAY · ${n(needLeft)}`;
    case "all":
      return `EVERYONE · ${n(b.total)}`;
    case "group": {
      const l = line(f.key);
      return `${(l?.label ?? f.key).toUpperCase()} · ${n(l?.count ?? 0)}`;
    }
    case "source": {
      const s = b.sources.find((x) => x.key === f.key);
      return `CAME FROM ${(s?.label ?? f.key).toUpperCase()} · ${n(s?.count ?? 0)}`;
    }
    case "lsrc":
      return `${sourceLabel(f.key).toUpperCase()} LEADS · ${n(f.n)}`;
    case "chip":
      return f.key === "bday" ? `VIPS WITH NO BIRTHDAY · ${n(gaps.vipNoBirthday)}` : f.key === "dup" ? `POSSIBLE DUPLICATES · ${n(gaps.possibleDuplicates)}` : f.key === "sort" ? `NEW TO SORT · ${n(gaps.toSort)}` : "ASK A GROUP FOR PERMISSION";
  }
}

/** The people in a list that match the search box (name, circle, where they came from, Pulse's line). */
export function narrow(list: PersonItem[], q: string): PersonItem[] {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return list;
  return list.filter((p) => {
    const hay = `${p.name} ${p.tier ?? ""} ${p.tier === "vip50" ? "vip-50" : p.tier === "vip100" ? "vip-100" : ""} ${p.cls ?? ""} ${p.source ?? ""} ${p.pulse ?? ""}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

// ---- a done touch ---------------------------------------------------------------------------------------------------

/** Someone the agent marked touched today, and the groups they count in (rings, Hot/Warm/Cold, the list they were in). */
export interface Done { id: string; keys: string[] }

/** The groups a person counts in, as far as the Brain knows: the rings it has loaded, their tier and class, the open list. */
export function keysOf(p: Pick<PersonItem, "id" | "tier" | "cls">, ringOf: ReadonlyMap<string, string[]>, open: Filter): string[] {
  const out = new Set<string>(ringOf.get(p.id) ?? []);
  if (p.tier === "vip50" || p.tier === "vip100") out.add(p.tier);
  if (p.cls) out.add("hwc");
  if (open.kind === "group" || open.kind === "source") out.add(open.key);
  if (open.kind === "lsrc") out.add("leads");
  if (open.kind === "chip" && open.key === "sort") out.add("to_sort");
  return [...out];
}

/**
 * The counts with today's done touches taken off at once (rule 12: "all checks need to apply once done"). Only people
 * ONE MOVE still flags are taken off, so a count ONE MOVE has already lowered is not lowered twice; when ONE MOVE's
 * next answer no longer flags them, its own numbers stand.
 */
export function applyDone(g: Groups, done: readonly Done[], stillFlagged: ReadonlySet<string>): Groups {
  const live = done.filter((d) => stillFlagged.has(d.id));
  if (!live.length) return g;
  const less = (key: string) => live.filter((d) => d.keys.includes(key) || (key === BIZ_PARENT && d.keys.some(isBizSub))).length;
  return {
    ...g,
    needsYou: Math.max(0, g.needsYou - live.length),
    needsNow: Math.min(Math.max(0, g.needsYou - live.length), g.needsNow),
    groups: g.groups.map((x) => {
      const k = less(x.key);
      if (!k) return x;
      const needsYou = Math.max(0, x.needsYou - k);
      return { ...x, needsYou, needsNow: Math.min(needsYou, x.needsNow) };
    }),
  };
}

// ---- the rings ------------------------------------------------------------------------------------------------------

export const RING_BOX = 360;
const RING_R: Record<RingKey, number> = { vip50: 58, vip100: 86, past_clients: 114, sphere: 143, other: 172 };
export const ringRadius = (k: string) => RING_R[k as RingKey] ?? 172;

export interface Seat { id: string; ring: string; x: number; y: number }
/**
 * The people who need the agent, as faces on their ring: as many as fit round it without touching (at most `perRing`), the
 * rest counted in "+N". A person in two rings sits on the inner one.
 */
export const ringSeats = (k: RingKey, perRing = 8) => Math.min(perRing, Math.floor((2 * Math.PI * RING_R[k]) / 36));
export function seatFaces(need: { id: string }[], ringOf: ReadonlyMap<string, string[]>, perRing = 8): { seats: Seat[]; more: number } {
  const c = RING_BOX / 2;
  const by = new Map<string, string[]>();
  let placed = 0;
  for (const p of need) {
    const ring = RING_KEYS.find((k) => ringOf.get(p.id)?.includes(k));
    if (!ring) continue;
    const l = by.get(ring) ?? [];
    if (l.length >= ringSeats(ring, perRing)) continue;
    l.push(p.id);
    by.set(ring, l);
    placed++;
  }
  const seats: Seat[] = [];
  RING_KEYS.forEach((ring, ri) => {
    const ids = by.get(ring) ?? [];
    const r = RING_R[ring];
    ids.forEach((id, i) => {
      const a = -Math.PI / 2 + 0.7 + ri * 1.1 + (2 * Math.PI * i) / Math.max(ids.length, 3);
      seats.push({ id, ring, x: Math.round((c + r * Math.cos(a)) * 10) / 10, y: Math.round((c + r * Math.sin(a)) * 10) / 10 });
    });
  });
  return { seats, more: Math.max(0, need.length - placed) };
}

// ---- small words ----------------------------------------------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Today", "6 days", "Oct 2", "5 months", or "—" for never. */
export function lastTouchWords(on: string | null, today: string): string {
  if (!on) return "—";
  const days = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${on}T12:00:00Z`)) / 86_400_000);
  if (!Number.isFinite(days)) return "—";
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 60) return `${days} days`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(on);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : "—";
}

/** The circle a list row names. */
export function circleOf(p: Pick<PersonItem, "tier" | "cls" | "source">, ringOf: ReadonlyMap<string, string[]>, id: string): { key: string; label: string } {
  const ring = RING_KEYS.find((k) => ringOf.get(id)?.includes(k));
  if (p.tier === "vip50" || ring === "vip50") return { key: "vip50", label: "VIP-50" };
  if (p.tier === "vip100" || ring === "vip100") return { key: "vip100", label: "VIP-100" };
  if (ring) return { key: ring, label: RING_LABEL[ring] };
  if (p.cls) return { key: "hwc", label: p.cls[0].toUpperCase() + p.cls.slice(1) };
  return { key: "other", label: p.source ?? "Contact" };
}

export const todayYmd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
