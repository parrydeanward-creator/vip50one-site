import type { VipPerson, VipRoster } from "./vips.ts";

// VIP swap coach (PULSE-ROADMAP relationship #6): who might move into or out of the VIP-50, and why, from what ONE
// MOVE already sends (the roster, §3d) and who has referred (§3r). Plain rules only. The agent decides every move
// through the swap they already confirm; nothing moves by itself, and a swap starts no onboarding (Parry: no).

export const QUIET_DAYS = 120; // no touch this long: worth a look
export const SETTLE_DAYS = 90; // a new VIP gets this long before Pulse questions it
export const MAX_PAIRS = 3;

export interface Why {
  p: VipPerson;
  words: string;
  score: number;
}
export interface Suggestions {
  out: Why[];
  into: Why[];
  /** When the VIP-50 is full: swap pairs, strongest first. */
  pairs: { out: Why; into: Why }[];
  /** Open spots: move straight in. */
  open: number;
}

const days = (from: string | null | undefined, today: string) => {
  if (!from) return null;
  const d = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${from.slice(0, 10)}T12:00:00Z`)) / 86_400_000);
  return Number.isFinite(d) ? d : null;
};
const done = (p: VipPerson) => (typeof p.month_done === "number" ? p.month_done : Object.values(p.month ?? {}).filter(Boolean).length);

/** Who is worth a look, and why. `referred` maps contact id to how many referrals they sent. */
export function swapSuggestions(roster: VipRoster, today: string, referred: Map<string, number> = new Map()): Suggestions {
  const out: Why[] = [];
  for (const p of roster.vip50) {
    if ((referred.get(p.id) ?? 0) > 0) continue; // never suggest moving out someone who sends business
    const on = days(p.promoted_at, today);
    if (on != null && on < SETTLE_DAYS) continue; // still settling in
    const quiet = days(p.last_touch_on, today);
    if (quiet != null && quiet < QUIET_DAYS) continue;
    out.push({ p, words: quiet == null ? "Never touched since joining your VIP-50" : `No touch in ${quiet} days`, score: quiet ?? 10_000 });
  }
  out.sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name));

  const into: Why[] = [];
  for (const p of roster.vip100) {
    const sent = referred.get(p.id) ?? 0;
    const recent = days(p.last_touch_on, today);
    const n = done(p);
    if (sent > 0) into.push({ p, words: `Sent you ${sent} ${sent === 1 ? "referral" : "referrals"}`, score: 1000 + sent * 100 - (recent ?? 365) });
    else if (n >= 3) into.push({ p, words: `${n} touches this month already`, score: 500 + n * 10 });
    else if (recent != null && recent <= 30) into.push({ p, words: recent <= 1 ? "In touch this week" : `In touch ${recent} days ago`, score: 300 - recent });
  }
  into.sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name));

  const open = Math.max(0, roster.cap - roster.vip50.length);
  const pairs = open ? [] : out.slice(0, MAX_PAIRS).flatMap((o, k) => (into[k] ? [{ out: o, into: into[k] }] : []));
  return { out: out.slice(0, 10), into: into.slice(0, 10), pairs, open };
}

/** One line for the drawer's heading. */
export function coachLine(s: Suggestions): string | null {
  if (s.open && s.into.length) return `${s.open} open ${s.open === 1 ? "spot" : "spots"}: ${s.into.length} worth moving in`;
  if (s.pairs.length) return `${s.pairs.length} ${s.pairs.length === 1 ? "swap" : "swaps"} worth a look`;
  if (s.out.length) return `${s.out.length} quiet in your VIP-50`;
  return null;
}
