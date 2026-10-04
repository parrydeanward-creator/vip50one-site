import { MOVE_URL } from "./host.ts";

// VIP-SUMMARY §3i (v1.13): the Business Rolodex and its Community drawn in
// ONE Brain (Parry, 4 Oct: "love it, go and build"). ONE MOVE keeps the list,
// the family mapping, the sharing and the merge; the Brain draws and asks.

// §3i.7 (v1.15, Parry 4 Oct): ten groups, the system's; Pulse places every business.
export type FamilyKey = "financing" | "closing" | "repair" | "cleaning" | "referral" | "auto" | "food" | "business" | "lifestyle" | "other";
export interface Family { key: FamilyKey; label: string }
export const FAMILIES: Family[] = [
  { key: "financing", label: "Financing" },
  { key: "closing", label: "Closing" },
  { key: "repair", label: "Home repair" },
  { key: "cleaning", label: "Cleaning & moving" },
  { key: "referral", label: "Referral partners" },
  { key: "auto", label: "Auto" },
  { key: "food", label: "Food & events" },
  { key: "business", label: "Business services" },
  { key: "lifestyle", label: "Lifestyle" },
  { key: "other", label: "Other" },
];
export const FAMILY_COLOR: Record<FamilyKey, string> = {
  financing: "#f5c542",
  closing: "#2fb7a3",
  repair: "#ff8a3d",
  cleaning: "#5aa9ff",
  referral: "#b07cff",
  auto: "#ff6b8b",
  food: "#7ee081",
  business: "#4dd0e1",
  lifestyle: "#ff9ec4",
  other: "#9aa4bf",
};

export interface Card {
  name: string;
  category: string | null;
  family: FamilyKey;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  offer: string | null;
  city: string | null;
  image: string | null;
}
export type GroupBy = "rules" | "pulse" | "agent";
export interface MineBiz extends Card { id: string; notes: string | null; shared: boolean; groupBy: GroupBy }
export interface Recommender { name: string; me: boolean; since: string | null }
export interface CommunityBiz extends Card { key: string; recommended_by: Recommender[]; in_mine: boolean }
export interface Rolodex { myCity: string | null; mine: MineBiz[]; community: CommunityBiz[] }

export const rolodexUrl = `${MOVE_URL}/api/brain/rolodex`;

const str = (v: unknown, max = 500): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const fam = (v: unknown): FamilyKey => (FAMILIES.some((f) => f.key === v) ? (v as FamilyKey) : "other");

/** Only http(s) websites, so a card never opens anything else. */
export function safeWebsite(v: unknown): string | null {
  const s = str(v, 300);
  if (!s) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^https?:\/\//i.test(s)) return null; // another scheme
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
const safeImage = (v: unknown) => {
  const s = str(v, 600);
  return s && /^https:\/\//.test(s) ? s : null;
};

function card(r: Record<string, unknown>): Card | null {
  const name = str(r.name, 120);
  if (!name) return null;
  return {
    name,
    category: str(r.category, 60),
    family: fam(r.family),
    contact_name: str(r.contact_name, 120),
    phone: str(r.phone, 40),
    email: str(r.email, 200),
    website: safeWebsite(r.website),
    offer: str(r.offer, 400),
    city: str(r.city, 80),
    image: safeImage(r.image),
  };
}

/** Keep only well-formed parts; a wrong shape is refused. */
export function readRolodex(raw: unknown): Rolodex | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.mine) || !Array.isArray(r.community)) return null;
  const mine: MineBiz[] = [];
  for (const m of r.mine as unknown[]) {
    if (!m || typeof m !== "object") continue;
    const o = m as Record<string, unknown>;
    const c = card(o);
    if (!c || typeof o.id !== "string" || !o.id) continue;
    const by: GroupBy = o.group_by === "pulse" || o.group_by === "agent" ? o.group_by : "rules";
    mine.push({ ...placed(c, o.group_by == null), id: o.id, notes: str(o.notes, 2000), shared: o.shared === true, groupBy: by });
  }
  const community: CommunityBiz[] = [];
  for (const m of r.community as unknown[]) {
    if (!m || typeof m !== "object") continue;
    const o = m as Record<string, unknown>;
    const c = card(o);
    if (!c || typeof o.key !== "string" || !o.key) continue;
    const recs = Array.isArray(o.recommended_by)
      ? (o.recommended_by as unknown[])
          .filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && typeof (x as { name?: unknown }).name === "string")
          .map((x) => ({ name: (x.name as string).slice(0, 60), me: x.me === true, since: str(x.since, 20) }))
      : [];
    community.push({ ...placed(c, o.group_by == null), key: o.key, recommended_by: recs, in_mine: o.in_mine === true });
  }
  return { myCity: str(r.my_city, 80), mine, community };
}

/** "Recommended by Parry W. and 3 other VIP-50 agents." */
export function recommendedLine(b: CommunityBiz): string {
  const n = b.recommended_by.length;
  if (!n) return "Shared by a VIP-50 agent.";
  const first = b.recommended_by.find((r) => r.me) ? "you" : b.recommended_by[0].name;
  if (n === 1) return `Recommended by ${first}.`;
  return `Recommended by ${first} and ${n - 1} other VIP-50 ${n - 1 === 1 ? "agent" : "agents"}.`;
}

/** The sharing after one switch, before ONE MOVE answers. */
export function withShared(r: Rolodex, id: string, shared: boolean): Rolodex {
  return { ...r, mine: r.mine.map((b) => (b.id === id ? { ...b, shared } : b)) };
}

/** "RM" for Rocky Mountain Plumbing. */
export function bizInitials(name: string): string {
  const w = name.split(/\s+/).map((x) => x.replace(/[^\p{L}\p{N}]/gu, "")).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] ?? "?").slice(0, 2)).toUpperCase();
}

export interface Seat { id: string; x: number; y: number; r: number }
/** Business orbs fanned outward from their family orb, in two staggered rows. */
export function fanSeats(ids: string[], fx: number, fy: number, cx: number, cy: number, sizes: number[] = [], maxSpread = 2.4): Seat[] {
  const out = Math.atan2(fy - cy, fx - cx);
  const n = ids.length;
  const spread = Math.min(maxSpread, 0.42 * Math.max(1, n));
  return ids.map((id, j) => {
    const ang = out + (n === 1 ? 0 : -spread / 2 + (spread * j) / (n - 1));
    const rr = 120 + (j % 2) * 48 + Math.floor(j / 8) * 52;
    return { id, x: fx + rr * Math.cos(ang), y: fy + rr * Math.sin(ang), r: sizes[j] ?? 21 };
  });
}


// Pulse's plain rules (§3i.7): "what they do" first, then the name. ONE MOVE
// holds the same rules and asks its AI when they can't tell; until ONE MOVE
// sorts (no group_by in its answer) the Brain places what ONE MOVE left in Other.
const RULES: [FamilyKey, RegExp][] = [
  ["financing", /lender|mortgage|\bloans?\b|credit union|\bbank/],
  ["closing", /title|escrow|apprais|inspect|insurance|attorney|home warranty/],
  ["repair", /plumb|electric|roof|paint|floor|contract|hvac|handyman|landscap|pest|window|door|garage|remodel|renovat|builder|construct|fenc|upholster|maintenance|concrete|gutter|solar|\bpools?\b|tree|lawn|lighting|utility|cabinet|countertop/],
  ["cleaning", /clean|carpet|maid|moving|mover|junk|storage|haul|demolition/],
  ["referral", /realtor|real estate|realty|\bagent\b|broker/],
  ["auto", /\btires?\b|wheel|\bauto|detailing|car wash|mechanic|collision|body shop/],
  ["food", /cater|bbq|barbecue|food|restaurant|\bbar\b|grill|cafe|coffee|bakery|hospitality|event|venue|florist/],
  ["business", /legal|\btax|account|\bcpa\b|marketing|social media|design|print|phone|mobile|photograph|video|property management|staging|\bsigns?\b/],
  ["lifestyle", /\bspas?\b|salon|fitness|\bgym|\bdogs?\b|\bpets?\b|groom|\bguns?\b|smith|golf|massage|boutique/],
];
const firstRule = (s: string | null): FamilyKey | null => {
  const c = (s ?? "").toLowerCase();
  if (!c.trim()) return null;
  for (const [g, re] of RULES) if (re.test(c)) return g;
  return null;
};

/** The group Pulse's plain rules give a business, or null when they can't tell. */
export function suggestGroup(b: { name: string; category: string | null }): FamilyKey | null {
  return firstRule(b.category) ?? firstRule(b.name);
}

/** A card ONE MOVE left in Other, placed by the rules (only while ONE MOVE doesn't sort yet). */
function placed<T extends Card>(c: T, unsorted: boolean): T {
  return unsorted && c.family === "other" ? { ...c, family: suggestGroup(c) ?? "other" } : c;
}

export const familyLabel = (k: FamilyKey) => FAMILIES.find((f) => f.key === k)!.label;

/** "Pulse put this in Auto." */
export function placedLine(b: MineBiz): string {
  const g = familyLabel(b.family);
  if (b.family === "other") return "Pulse couldn't tell what this business does. Add what they do, or move it.";
  return b.groupBy === "agent" ? `You moved this to ${g}.` : `Pulse put this in ${g}.`;
}

/** At most this many business orbs per group; the rest are "+N more". */
export const FAN_MAX = 10;

export type Draft = { name: string; category: string; contact_name: string; phone: string; email: string; website: string; city: string; offer: string; notes: string };
export const DRAFT_FIELDS: { key: keyof Draft; label: string; max: number; long?: boolean; hint?: string; type?: string }[] = [
  { key: "name", label: "Business name", max: 120 },
  { key: "category", label: "What they do", max: 60, hint: "e.g. Plumbing, Catering, Title. Pulse picks the group from this." },
  { key: "contact_name", label: "Contact name", max: 120 },
  { key: "phone", label: "Phone", max: 40, type: "tel" },
  { key: "email", label: "Email", max: 200, type: "email" },
  { key: "website", label: "Website", max: 300, type: "url" },
  { key: "city", label: "City", max: 80, hint: "Where they work. Agents nearby see them first in the Community." },
  { key: "offer", label: "Offer for your clients", max: 400, long: true },
  { key: "notes", label: "Your notes (private)", max: 2000, long: true },
];

export function draftOf(b: MineBiz | null): Draft {
  return {
    name: b?.name ?? "",
    category: b?.category ?? "",
    contact_name: b?.contact_name ?? "",
    phone: b?.phone ?? "",
    email: b?.email ?? "",
    website: b?.website ?? "",
    city: b?.city ?? "",
    offer: b?.offer ?? "",
    notes: b?.notes ?? "",
  };
}

/** A problem with the form in plain words, or null. */
export function draftProblem(d: Draft): string | null {
  if (!d.name.trim()) return "Give the business a name.";
  for (const f of DRAFT_FIELDS) if (d[f.key].length > f.max) return `${f.label} is too long (${f.max} characters at most).`;
  if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) return "That email address doesn't look right.";
  if (d.website.trim() && !safeWebsite(d.website)) return "That website doesn't look right.";
  return null;
}

/** The body for rolodex/save: every field for a new business, only what changed for an edit. */
export function saveBody(d: Draft, was: MineBiz | null): Record<string, string | null> {
  const clean = (v: string) => (v.trim() ? v.trim() : null);
  const next: Record<string, string | null> = {};
  for (const f of DRAFT_FIELDS) next[f.key] = clean(d[f.key]);
  if (next.website) next.website = safeWebsite(next.website);
  if (!was) return next;
  const before = draftOf(was);
  const out: Record<string, string | null> = { id: was.id };
  for (const f of DRAFT_FIELDS) if ((clean(before[f.key]) ?? "") !== (next[f.key] ?? "")) out[f.key] = next[f.key];
  return out;
}

/**
 * Seats for a group's business orbs, in rows fanned outward from the group orb,
 * each row only as wide as the group's slice of the ring, so ten groups never
 * overlap. `n` seats (the last may be the "+N more" orb).
 */
export function groupSeats(n: number, fx: number, fy: number, cx: number, cy: number, slice: number, ring: number, gap = 70): { x: number; y: number }[] {
  const out = Math.atan2(fy - cy, fx - cx);
  const seats: { x: number; y: number }[] = [];
  for (let row = 0; seats.length < n; row++) {
    const rr = 104 + row * 62;
    const spread = Math.min(2.1, ((ring + rr) * slice) / rr);
    const cap = Math.max(1, Math.floor((rr * spread) / gap) + 1);
    const k = Math.min(cap, n - seats.length);
    const used = k === 1 ? 0 : Math.min(spread, ((k - 1) * gap) / rr);
    for (let j = 0; j < k; j++) {
      const a = out + (k === 1 ? 0 : -used / 2 + (used * j) / (k - 1));
      seats.push({ x: fx + rr * Math.cos(a), y: fy + rr * Math.sin(a) });
    }
  }
  return seats;
}

/** The order businesses show in a fan: offers first, then shared, then A-Z. */
export function fanOrder<T extends { name: string; offer: string | null }>(items: T[], shared: (b: T) => boolean): T[] {
  return [...items].sort((a, b) => Number(!!b.offer) - Number(!!a.offer) || Number(shared(b)) - Number(shared(a)) || a.name.localeCompare(b.name));
}
