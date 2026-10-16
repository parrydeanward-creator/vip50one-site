import { mondayOf } from "./habits.ts";

// Wins (VIP-SUMMARY §3t; Parry approved ONE YOU's tools, 6 Oct: "every closing, referral, thank-you and five-star
// moment in one place"). Read only, from MASTER; nothing is sent. A win newer than the agent's last look glows gold
// (the special-day glow), never red: good news never nags.

const MOVE_URL = "https://move.vip50one.com";
/** The retired ONE YOU orb (Parry, 16 Oct: Wins moved into the Scoreboard as "This week's wins"). */
export const WINS_NODE = "go-wins";
export const winsUrl = (days = 365, agent?: string) => `${MOVE_URL}/api/brain/wins?days=${days}${agent ? `&agent=${encodeURIComponent(agent)}` : ""}`;
export const MAX_WINS = 200;

export type WinKind = "closing" | "referral" | "referral_closed" | "five_star" | "week_100" | "badge" | "goal_reached";
/** The orbs round the middle; a referral that closed sits with referrals. */
export type WinGroup = "closing" | "referral" | "five_star" | "week_100" | "badge" | "goal_reached";
export const GROUPS: WinGroup[] = ["closing", "referral", "five_star", "week_100", "badge", "goal_reached"];
export const GROUP_TITLE: Record<WinGroup, string> = {
  closing: "Closings",
  referral: "Referrals",
  five_star: "Five-star reviews",
  week_100: "Weeks at 100",
  badge: "Badges",
  goal_reached: "Goals reached",
};
const KINDS: WinKind[] = ["closing", "referral", "referral_closed", "five_star", "week_100", "badge", "goal_reached"];
export const groupOf = (k: WinKind): WinGroup => (k === "referral_closed" ? "referral" : k);

export interface Win {
  kind: WinKind;
  at: string;
  title: string;
  detail: string | null;
  contactId: string | null;
  amount: number | null;
  /** A five-star review brought in from another site with no written date: dated by the day it came in, so it never
   * counts as this week's win (Parry, 16 Oct, audit 3.3.1: "a review counts in the week it was written"). */
  imported?: boolean;
}
export interface Wins {
  wins: Win[];
  counts: Record<WinGroup, number>;
}

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const amt = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
const isKind = (v: unknown): v is WinKind => typeof v === "string" && (KINDS as string[]).includes(v);
/** This many five-star reviews on one day with no written date is an import, not a week's reviews (15 Oct: 35 at once). */
export const IMPORT_BATCH = 5;

/** A §3t.1 answer, checked; null when it is not one. Counts are MASTER's when sent, else counted from the list. */
export function readWins(j: unknown): Wins | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.wins)) return null;
  const wins: Win[] = [];
  for (const x of r.wins as Record<string, unknown>[]) {
    // A review is dated by the day it was written when ONE MOVE sends it (`reviewed_on`, GO/MOVE 16 Oct; `written_on`
    // the earlier name), else the day it came in.
    const written = x?.kind === "five_star" ? day(x?.reviewed_on ?? x?.written_on) : null;
    const at = written ?? day(x?.at), title = str(x?.title, 90);
    if (!at || !title || !isKind(x.kind)) continue;
    const w: Win = { kind: x.kind, at, title, detail: str(x.detail, 120), contactId: str(x.contact_id, 60), amount: amt(x.amount) };
    if (x.kind === "five_star" && !written) w.imported = false;
    wins.push(w);
  }
  // Five-star reviews with no written date that came in together are an import (audit 3.3.1).
  const undated = new Map<string, number>();
  for (const w of wins) if (w.imported === false) undated.set(w.at, (undated.get(w.at) ?? 0) + 1);
  for (const w of wins) {
    if (w.imported === false && (undated.get(w.at) ?? 0) >= IMPORT_BATCH) w.imported = true;
    else delete w.imported;
  }
  wins.sort((a, b) => b.at.localeCompare(a.at));
  const sent = (r.counts && typeof r.counts === "object" ? r.counts : {}) as Record<string, unknown>;
  const counts = {} as Record<WinGroup, number>;
  for (const g of GROUPS) {
    const n = sent[g];
    counts[g] = typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.round(n) : wins.filter((w) => groupOf(w.kind) === g && w.kind !== "referral_closed").length;
  }
  return { wins: wins.slice(0, MAX_WINS), counts };
}

export const total = (w: Wins) => GROUPS.reduce((s, g) => s + w.counts[g], 0);
export const inGroup = (w: Wins, g: WinGroup) => w.wins.filter((x) => groupOf(x.kind) === g);

/** Wins dated after the agent's last look (`seen`, a date). None before a first look counts as new. */
export function newSince(w: Wins, seen: string | null): Win[] {
  return seen ? w.wins.filter((x) => x.at > seen) : [];
}

/** This week's wins (Monday to today) for the Weekly Review, and the imported reviews that came in this week. One list
 * for every screen: the Wins orb counts the year from the same `Wins` (Parry, 16 Oct, audit 3.4.2). */
export function thisWeek(list: Win[], today: string): { mine: Win[]; imported: Win[] } {
  const mon = mondayOf(today);
  const inWeek = list.filter((w) => w.at >= mon && w.at <= today).sort((a, b) => b.at.localeCompare(a.at));
  return { mine: inWeek.filter((w) => !w.imported), imported: inWeek.filter((w) => w.imported) };
}

export function winsLine(w: Wins): string {
  const n = total(w);
  if (!n) return "Your wins will gather here";
  return `${n} ${n === 1 ? "win" : "wins"} this year`;
}

/** What the Scoreboard's "This week's wins" counts (Parry, 16 Oct: "badges earned this week, new five-star reviews this
 * week, new referrals and closings this week"). Weeks at 100 and goals reached stay in the year's list. */
export const WEEK_WIN_KINDS: WinKind[] = ["badge", "five_star", "referral", "referral_closed", "closing"];

/** This week's wins, the one list the Scoreboard and the Weekly Review both read (Parry, 16 Oct: "Weekly Review's Wins
 * number reads from that same source, so the two can never disagree"). Reviews count in the week they were written. */
export function weekWins(list: Win[], today: string): { mine: Win[]; imported: Win[] } {
  const { mine, imported } = thisWeek(list, today);
  return { mine: mine.filter((w) => WEEK_WIN_KINDS.includes(w.kind)), imported };
}

/** ONE MOVE's own "this week" (vip50-web-crm#278): `GET /api/brain/wins?week=this`, Monday to today in Mountain time,
 * five-star reviews already dated by the day they were written (undated imports left out by ONE MOVE). */
export const weekWinsUrl = (agent?: string) => `${MOVE_URL}/api/brain/wins?week=this${agent ? `&agent=${encodeURIComponent(agent)}` : ""}`;

export interface WeekWinsLive {
  from: string;
  to: string;
  wins: Win[];
}

/** A `?week=this` answer (`{days, from, to, wins[], counts}`), checked; null when it is not one. Keeps only the kinds
 * "This week's wins" counts, dated inside from..to, newest first. No import guess here: ONE MOVE has dated the reviews. */
export function readWeekWins(j: unknown): WeekWinsLive | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  const from = day(r.from), to = day(r.to);
  if (!from || !to || from > to || !Array.isArray(r.wins)) return null;
  const wins: Win[] = [];
  for (const x of r.wins as Record<string, unknown>[]) {
    if (!x || typeof x !== "object") continue;
    const at = day(x.at), title = str(x.title, 90);
    if (!at || !title || !isKind(x.kind) || !WEEK_WIN_KINDS.includes(x.kind) || at < from || at > to) continue;
    wins.push({ kind: x.kind, at, title, detail: str(x.detail, 120), contactId: str(x.contact_id, 60), amount: amt(x.amount) });
  }
  wins.sort((a, b) => b.at.localeCompare(a.at));
  return { from, to, wins: wins.slice(0, MAX_WINS) };
}

/** The one list "This week's wins" and the Weekly Review's Wins card read: ONE MOVE's week when it answered for this
 * week, else this week counted from the year's list (the demo, or ONE MOVE not answering the week yet). */
export function weekWinsFrom(live: WeekWinsLive | null | undefined, year: Win[] | null | undefined, today: string): { mine: Win[]; imported: Win[] } | null {
  if (live && live.from === mondayOf(today)) return { mine: live.wins.filter((w) => w.at <= today), imported: year ? weekWins(year, today).imported : [] };
  return year ? weekWins(year, today) : null;
}

/** Where a win lives, for its row's link on the Scoreboard. */
export type WinHome = "badges" | "review" | "referrals" | "goals";
export const winHome = (k: WinKind): WinHome => (k === "badge" ? "badges" : k === "five_star" ? "review" : k === "referral" || k === "referral_closed" ? "referrals" : "goals");

const addDays = (d: string, k: number) => new Date(Date.parse(`${d}T12:00:00Z`) + k * 86_400_000).toISOString().slice(0, 10);
const short = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Example wins for the demo dashboard. */
export function demoWins(today: string): Wins {
  const w = (kind: WinKind, ago: number, title: string, detail: string | null = null, contactId: string | null = null, amount: number | null = null): Win => ({
    kind, at: addDays(today, -ago), title, detail, contactId, amount,
  });
  // a week is won on its Sunday and named by its Monday
  const wk = (weeksAgo: number, score: number) => {
    const mon = addDays(mondayOf(today), -7 * weeksAgo);
    return { kind: "week_100" as const, at: addDays(mon, 6), title: `Week of ${short(mon)}: ${score}`, detail: null, contactId: null, amount: null };
  };
  return readWins({
    wins: [
      w("five_star", 1, "Jane Smith", "Made the whole move feel easy. Answered every call, even on a Sunday.", "r1"),
      w("referral", 2, "Mike Torres sent you Sara Kent", null, "r2"),
      wk(1, 112),
      w("closing", 8, "Closed 1482 Maple Ridge Dr", "Buyer side · $455,000", "r3", 455000),
      w("badge", 9, "Ten-week streak"),
      wk(2, 104),
      w("referral", 12, "David Park sent you Tom Lee", null, "r4"),
      w("goal_reached", 20, "Referrals goal reached: 6 of 6"),
      w("referral_closed", 26, "Ben Ortiz closed (sent by Jane Smith)", "$425,000", "r1", 425000),
      w("closing", 26, "Closed 77 Juniper Ct", "Seller side · $425,000", null, 425000),
      wk(4, 101),
      w("closing", 61, "Closed 309 Canyon View Rd", "Buyer side · $389,000", "r2", 389000),
      w("five_star", 64, "Ann Ruiz", "Ten out of ten. We will never use anyone else.", "r3"),
      w("badge", 90, "First VIP-50 fully touched"),
    ],
  })!;
}
