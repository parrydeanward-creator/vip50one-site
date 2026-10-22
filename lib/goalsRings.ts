import { GOAL_WORD, behindPace, fmtGoal, money, perWeekWords, yearShare, type GoalFacts, type GoalKey } from "./goals.ts";
import { CHANCE, settlesOn, type ForecastPerson } from "./forecast.ts";
import { dealName, type Deal, type Side } from "./deals.ts";
import type { Referrals } from "./referrals.ts";
import type { LooksPerson } from "./looksHot.ts";

// Goals as three rings (Parry, 22 Oct: "mix of A and C", vip50-ecosystem research/mockups/goals). Pure: the numbers on
// each ring card (by today, on pace to finish, to get there), the goal year's week, the Pulse line over the rings, the
// "Likely next" deals (from C) and the "This week, to get back on pace" moves (from A). Every row comes from data the
// Brain already holds for the agent (their goals, deals, Hot list, Referrals and Looks Hot); nothing here is invented.

const DAY = 86_400_000;
const at = (s: string) => Date.parse(`${s.slice(0, 10)}T12:00:00Z`);
const isDay = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s);
/** Below this share of the year a projection says too little (lib/goals.ts uses the same 4%). */
const EARLY = 0.04;

export type RingState = "none" | "early" | "behind" | "on" | "ahead" | "reached";
export const STATE_WORD: Record<RingState, string> = {
  none: "No goal set",
  early: "Just started",
  behind: "Behind pace",
  on: "On pace",
  ahead: "Ahead",
  reached: "Goal reached",
};

export interface Ring {
  key: GoalKey;
  word: string;
  value: number;
  max: number | null;
  /** 0..1 of the goal done (the gold arc). */
  done: number;
  /** 0..1 of the goal where the agent would be by today (the faint arc and the white tick); null without a goal year. */
  mark: number | null;
  /** Where the agent would be by today: MASTER's pace when it gives one, else the goal times the share of the year. */
  byToday: number | null;
  /** At this rate, the goal year ends here; null in the first weeks or without a goal year. */
  finish: number | null;
  /** "1 every 2 weeks", "$12,673 a week", "Goal reached". */
  toGetThere: string | null;
  state: RingState;
}

/** The numbers on one ring card. Counts are whole numbers ("By today you'd be at 3.9" reads as about 4). */
export function ring(g: GoalFacts, today: string): Ring {
  const value = Math.max(0, g.value ?? 0);
  const base = { key: g.key, word: GOAL_WORD[g.key], value };
  if (g.max == null || g.max <= 0) return { ...base, max: null, done: 0, mark: null, byToday: null, finish: null, toGetThere: null, state: "none" };
  const max = g.max;
  const done = Math.min(1, value / max);
  const y = yearShare(g.from, g.to, today);
  const whole = Math.round;
  if (value >= max) return { ...base, max, done, mark: y ? Math.min(1, (g.pace ?? max * y.share) / max) : null, byToday: y ? whole(g.pace ?? max * y.share) : null, finish: null, toGetThere: "Goal reached", state: "reached" };
  const left = max - value;
  if (!y) return { ...base, max, done, mark: null, byToday: null, finish: null, toGetThere: `${fmtGoal(g.key, left)} to go`, state: "on" };
  const byToday = whole(g.pace ?? max * y.share);
  const toGetThere = perWeekWords(g.key, left, y.weeksLeft).replace(/^about /, "");
  const mark = Math.min(1, byToday / max);
  if (y.share < EARLY) return { ...base, max, done, mark, byToday, finish: null, toGetThere, state: "early" };
  const finish = g.key === "gci_goal" ? Math.round(value / y.share / 1000) * 1000 : Math.round(value / y.share);
  const state: RingState = behindPace(g, today) ? "behind" : finish >= max * 1.05 && value > byToday ? "ahead" : "on";
  return { ...base, max, done, mark, byToday, finish, toGetThere, state };
}

/** "$45.6K", "$500K", "$1.2M": the big number inside the GCI ring. Counts as they are. */
export function ringBig(key: GoalKey, n: number): string {
  if (key !== "gci_goal") return String(Math.round(n));
  if (n >= 1_000_000) return `$${trim(n / 1_000_000)}M`;
  if (n >= 1000) return `$${trim(n / 1000)}K`;
  return money(n);
}
const trim = (x: number) => (x >= 100 ? String(Math.round(x)) : String(Math.round(x * 10) / 10));

/** The goal year as the chip shows it, and which week of it today is ("week 16 of 52"). */
export function goalYear(goals: GoalFacts[], today: string): { from: string; to: string; week: number; weeks: number } | null {
  const g = goals.find((x) => isDay(x.from) && isDay(x.to));
  if (!g || !isDay(today)) return null;
  const s = at(g.from!), e = at(g.to!);
  if (!(e > s)) return null;
  const weeks = Math.max(1, Math.round((e - s + DAY) / (7 * DAY)));
  const week = Math.min(weeks, Math.max(1, Math.floor((at(today) - s) / (7 * DAY)) + 1));
  return { from: g.from!.slice(0, 10), to: g.to!.slice(0, 10), week, weeks };
}

const NUM_WORD = ["No", "One", "Two", "All three"];
/** The Pulse line over the rings: how many goals are behind or on pace, and where the agent would be by today. */
export function pulseLine(rings: Ring[]): { lead: string; rest: string; behind: number } | null {
  const set = rings.filter((r) => r.state !== "none");
  if (!set.length) return null;
  const behind = set.filter((r) => r.state === "behind").length;
  const lead =
    behind === 0
      ? set.length === 1 ? "Your goal is on pace." : `${set.length === 3 ? "All three" : "Both"} goals are on pace.`
      : behind === set.length && set.length > 1
        ? `${set.length === 3 ? "All three" : "Both"} goals are behind pace.`
        : `${NUM_WORD[behind] ?? behind} ${behind === 1 ? "goal is" : "goals are"} behind pace.`;
  const parts = set.filter((r) => r.byToday != null).map((r) => (r.key === "gci_goal" ? money(r.byToday!) : `${r.byToday} ${r.word.toLowerCase()}`));
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
  const rest = list ? `You'd be at ${list} by today.` : "";
  return { lead, rest, behind };
}

// ---- Likely next (option C): real deals that close the gap, soonest first ---------------------------------------

export interface LikelyRow {
  id: string;
  name: string;
  side: Side | null;
  /** "Under contract · closes Nov 8", "Hot · on your Hot list". */
  stage: string;
  /** The day it is expected to close, when known. */
  on: string | null;
  /** Expected GCI: the deal's own GCI when ONE MOVE gives it, else the forecast's (chance times the average). */
  gci: number;
  /** True when the GCI is the forecast's estimate rather than the deal's own number. */
  est: boolean;
  kind: "contract" | "hot";
  contactId: string | null;
}

const hundred = (n: number) => Math.round(n / 100) * 100;
const shortDay = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });

/** Deals under contract by settlement day (soonest first, no date last), then the agent's Hot people. Only the agent's
 * own deals and Hot list: nothing is added for a live agent who has none (the panel then offers "Add a deal"). */
export function likelyNext(deals: Deal[] | null, hot: ForecastPerson[] | null, avgGci: number, today: string, max = 5): LikelyRow[] {
  const open = (deals ?? []).filter((d) => d.status === "under_contract").map((d) => ({ d, on: settlesOn(d) }));
  open.sort((a, b) => (a.on ?? "9999").localeCompare(b.on ?? "9999"));
  const rows: LikelyRow[] = open.map(({ d, on }) => ({
    id: `deal:${d.id}`,
    name: dealName(d),
    side: d.side,
    stage: on ? `Under contract · ${on < today ? "settlement was" : "closes"} ${shortDay(on)}` : "Under contract",
    on,
    gci: typeof d.gci === "number" && d.gci > 0 ? d.gci : hundred(avgGci * CHANCE.contract),
    est: !(typeof d.gci === "number" && d.gci > 0),
    kind: "contract",
    contactId: d.contact?.id ?? null,
  }));
  const inDeals = new Set(open.map(({ d }) => d.contact?.id).filter(Boolean));
  for (const p of hot ?? []) {
    if (p.cls !== "hot" || (p.contactId && inDeals.has(p.contactId))) continue;
    rows.push({ id: `hot:${p.contactId ?? p.name}`, name: p.name, side: null, stage: "Hot · on your Hot list", on: null, gci: hundred(avgGci * CHANCE.hot), est: true, kind: "hot", contactId: p.contactId });
  }
  return rows.slice(0, max);
}

export const SIDE_SHORT: Record<Side, string> = { buy: "buyer", sell: "seller", both: "buyer and seller" };

// ---- This week, to get back on pace (option A) -------------------------------------------------------------------

export interface WeekMove {
  key: "ask" | "hot" | "sellers";
  title: string;
  sub: string;
  /** The people behind the move; each opens their contact when ONE MOVE gave the record. */
  people: { name: string; contactId: string | null }[];
}

/** Two or three moves, each backed by the agent's own lists: referral asks (Referrals' ready-to-ask, else its
 * candidates), Hot people to follow up, and Looks Hot likely sellers. A move with no one behind it is left out. */
export function weekMoves(refs: Referrals | null, hot: ForecastPerson[] | null, looks: LooksPerson[] | null): WeekMove[] {
  const out: WeekMove[] = [];
  const asks: WeekMove["people"] = refs?.readyToAsk?.length
    ? refs.readyToAsk.map((r) => ({ name: r.firstName, contactId: r.id }))
    : (refs?.candidates ?? []).map((c) => ({ name: c.name, contactId: c.id }));
  if (asks.length) {
    const p = asks.slice(0, 3);
    out.push({ key: "ask", title: `Ask ${p.length} of your VIP-50 for a referral`, sub: "Opens Referrals, ready to ask", people: p });
  }
  const h = (hot ?? []).filter((p) => p.cls === "hot");
  if (h.length) {
    out.push({ key: "hot", title: `Follow up your ${h.length} Hot ${h.length === 1 ? "person" : "people"}`, sub: "Opens your Hot list, ready to call", people: h.slice(0, 3).map((p) => ({ name: p.name, contactId: p.contactId })) });
  }
  const sellers = (looks ?? []).filter((p) => p.kind === "seller");
  if (sellers.length) {
    out.push({ key: "sellers", title: "Book 1 listing appointment", sub: `${sellers.length} ${sellers.length === 1 ? "person looks" : "people look"} ready to sell`, people: sellers.slice(0, 3).map((p) => ({ name: p.name, contactId: p.contactId })) });
  }
  return out;
}

/** Monday of today's week (the key a ticked move is kept under, so ticks clear each week). */
export function weekOf(today: string): string {
  const t = new Date(`${today.slice(0, 10)}T12:00:00Z`);
  const back = (t.getUTCDay() + 6) % 7;
  return new Date(t.getTime() - back * DAY).toISOString().slice(0, 10);
}
