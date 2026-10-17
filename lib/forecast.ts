import { shortName, type Deal } from "./deals.ts";
import type { HwcClass } from "./hwc.ts";
import { money } from "./goals.ts";

// Income forecast (PULSE-ROADMAP K20): the business coming, as expected GCI by month. Built in the Brain from what it
// already has: deals under contract (their settlement month), the Hot/Warm/Cold list (Parry, 5 Oct: Hot closes within
// 0-3 months, Warm 3-12, Cold 12 and up) and the agent's average GCI per closing (the Income Map's number). ONE MOVE
// keeps no price per person, so every closing counts at that average. A forecast, never a promise: the words say so.

/** The retired ONE YOU orb (Parry, 16 Oct: the forecast is part 2 of the Goals orb, "Likely next 3 months"). */
export const FORECAST_NODE = "go-forecast";
export const MONTHS = 12;

/** How likely each kind of business is to close in its window. Plain starting numbers, Parry's to adjust. */
export const CHANCE = { contract: 0.9, hot: 0.5, warm: 0.25, cold: 0.1 } as const;
/** Months each class spreads over, counting this month as 1. Hot 1-3, Warm 4-12 (Parry's windows). */
const SPAN: Record<"hot" | "warm", [number, number]> = { hot: [1, 3], warm: [4, 12] };

export interface MonthForecast {
  /** First day of the month, YYYY-MM-01. */
  month: string;
  contract: number;
  hot: number;
  warm: number;
  total: number;
  /** Clients under contract settling this month, by first name. */
  settling: string[];
  /** Who makes the month up (Goals part 2, Parry 16 Oct): first names, with the record to open. Under contract first,
   * then the Hot people (months 1-3) when their names were given; empty when only the counts were. */
  who: Who[];
}
export interface Who {
  name: string; // first name
  contactId: string | null;
  why: "contract" | "hot" | "warm";
}
/** A person on the Hot/Warm/Cold list, as the forecast may name them. */
export interface ForecastPerson {
  cls: HwcClass;
  name: string;
  contactId: string | null;
}
export interface Forecast {
  months: MonthForecast[];
  /** Cold: expected after the next 12 months. */
  later: number;
  total12: number;
  avgGci: number;
  counts: { contract: number; hot: number; warm: number; cold: number };
}

const hundred = (n: number) => Math.round(n / 100) * 100;
const monthOf = (day: string) => `${day.slice(0, 7)}-01`;
function addMonths(month: string, k: number): string {
  const [y, m] = month.split("-").map(Number);
  const t = y * 12 + (m - 1) + k;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}-01`;
}

/** The settlement day of a deal under contract (the moved day when the form moves it), or null. */
export function settlesOn(d: Deal): string | null {
  const s = d.dates.find((x) => x.key === "settlement");
  return s ? s.effectiveOn ?? s.on : null;
}

/**
 * Expected GCI by month for the next 12 months, plus Cold as "later". Deals under contract count in their settlement
 * month (a settlement already past still counts this month: it has not been marked closed). Hot people spread evenly
 * over months 1-3, Warm over 4-12; each at its chance times the average GCI. Null when there is nothing to forecast.
 */
export function forecast(deals: Deal[] | null, classes: HwcClass[] | null, avgGci: number, today: string, people?: ForecastPerson[] | null): Forecast | null {
  const open = (deals ?? []).filter((d) => d.status === "under_contract");
  const n = { hot: 0, warm: 0, cold: 0 };
  for (const c of classes ?? []) n[c]++;
  if (!open.length && !n.hot && !n.warm && !n.cold) return null;
  const first = monthOf(today);
  const months: MonthForecast[] = Array.from({ length: MONTHS }, (_, k) => ({ month: addMonths(first, k), contract: 0, hot: 0, warm: 0, total: 0, settling: [], who: [] as Who[] }));
  for (const d of open) {
    const on = settlesOn(d);
    const idx = on ? Math.max(0, months.findIndex((m) => m.month === monthOf(on))) : 0;
    const at = on && monthOf(on) > months[MONTHS - 1].month ? MONTHS - 1 : idx;
    months[at].contract += avgGci * CHANCE.contract;
    months[at].settling.push(shortName(d));
    months[at].who.push({ name: shortName(d), contactId: d.contact?.id || null, why: "contract" });
  }
  for (const cls of ["hot", "warm"] as const) {
    const [a, b] = SPAN[cls];
    const each = (n[cls] * CHANCE[cls] * avgGci) / (b - a + 1);
    for (let k = a; k <= b; k++) months[k - 1][cls] += each;
  }
  // The Hot people by name in months 1-3 (Warm spreads over 4-12, where a name per month would mislead).
  for (const p of people ?? []) {
    if (p.cls !== "hot") continue;
    for (let k = SPAN.hot[0]; k <= SPAN.hot[1]; k++) months[k - 1].who.push({ name: p.name.split(/\s+/)[0] || p.name, contactId: p.contactId, why: "hot" });
  }
  // A forecast, so to the nearest $100; the year's total from the exact numbers so it does not add up rounding.
  const exact = months.reduce((s, m) => s + m.contract + m.hot + m.warm, 0);
  for (const m of months) {
    m.total = hundred(m.contract + m.hot + m.warm);
    m.contract = hundred(m.contract);
    m.hot = hundred(m.hot);
    m.warm = hundred(m.warm);
  }
  return {
    months,
    later: hundred(n.cold * CHANCE.cold * avgGci),
    total12: hundred(exact),
    avgGci,
    counts: { contract: open.length, ...n },
  };
}

export const monthWords = (month: string) =>
  new Date(`${month}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", year: "2-digit" }).replace(" ", " '");

/** The three months ahead, the line under the orb. */
export function forecastLine(f: Forecast): string {
  const next3 = f.months.slice(0, 3).reduce((s, m) => s + m.total, 0);
  return `About ${money(next3)} in the next 3 months`;
}

/** The example agent's classes for the demo: 3 Hot, 6 Warm, 9 Cold. */
export const demoClasses = (): HwcClass[] => [...Array(3).fill("hot"), ...Array(6).fill("warm"), ...Array(9).fill("cold")];
