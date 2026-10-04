import { MOVE_URL } from "./host.ts";

// VIP-SUMMARY §3i (v1.13): the Business Rolodex and its Community drawn in
// ONE Brain (Parry, 4 Oct: "love it, go and build"). ONE MOVE keeps the list,
// the family mapping, the sharing and the merge; the Brain draws and asks.

export type FamilyKey = "financing" | "closing" | "repair" | "cleaning" | "referral" | "other";
export interface Family { key: FamilyKey; label: string }
export const FAMILIES: Family[] = [
  { key: "financing", label: "Financing" },
  { key: "closing", label: "Closing" },
  { key: "repair", label: "Home repair" },
  { key: "cleaning", label: "Cleaning & moving" },
  { key: "referral", label: "Referral partners" },
  { key: "other", label: "Other" },
];
export const FAMILY_COLOR: Record<FamilyKey, string> = {
  financing: "#f5c542",
  closing: "#2fb7a3",
  repair: "#ff8a3d",
  cleaning: "#5aa9ff",
  referral: "#b07cff",
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
export interface MineBiz extends Card { id: string; notes: string | null; shared: boolean }
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
    if (c && typeof o.id === "string" && o.id) mine.push({ ...c, id: o.id, notes: str(o.notes, 2000), shared: o.shared === true });
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
    community.push({ ...c, key: o.key, recommended_by: recs, in_mine: o.in_mine === true });
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
export function fanSeats(ids: string[], fx: number, fy: number, cx: number, cy: number, sizes: number[] = []): Seat[] {
  const out = Math.atan2(fy - cy, fx - cx);
  const n = ids.length;
  const spread = Math.min(2.4, 0.42 * Math.max(1, n));
  return ids.map((id, j) => {
    const ang = out + (n === 1 ? 0 : -spread / 2 + (spread * j) / (n - 1));
    const rr = 120 + (j % 2) * 48 + Math.floor(j / 8) * 52;
    return { id, x: fx + rr * Math.cos(ang), y: fy + rr * Math.sin(ang), r: sizes[j] ?? 21 };
  });
}
