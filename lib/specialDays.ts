import type { SummaryEnvelope, SummaryItem } from "./live.ts";

// Special days (VIP-SUMMARY, MASTER `vip_summary.special_days`, vip50-web-crm#65):
// every birthday and anniversary of the agent's VIP-50 and VIP-100, and of their
// spouse, children and pets, plus home anniversaries, in the next 14 days.
// MASTER already sends the VIP's own birthday and anniversary as items (30 days);
// this adds the family, pets and home, puts the age or the years on every one,
// and says who to light up in gold today.

export type SpecialKind =
  | "birthday"
  | "spouse_birthday"
  | "child_birthday"
  | "pet_birthday"
  | "anniversary"
  | "home_anniversary";

export interface SpecialDay {
  contact_id: string;
  name: string;          // whose day it is (the child, the pet, the spouse, or the VIP)
  contact_name: string;  // the VIP
  kind: SpecialKind;
  date: string;          // YYYY-MM-DD, this year's (or next year's) day
  days_until: number;
  years: number | null;  // null when the year is not known (stored as 1904)
  pet_type?: string | null;
}

const KINDS: readonly SpecialKind[] = ["birthday", "spouse_birthday", "child_birthday", "pet_birthday", "anniversary", "home_anniversary"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const CRM = "https://move.vip50one.com";

/** Only well-formed rows, soonest first. Anything odd is dropped, never guessed. */
export function specialDaysOf(env: SummaryEnvelope | null | undefined): SpecialDay[] {
  const raw = (env as { special_days?: unknown } | null | undefined)?.special_days;
  if (!Array.isArray(raw)) return [];
  const out: SpecialDay[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const d = r as Record<string, unknown>;
    const kind = d.kind as SpecialKind;
    const name = typeof d.name === "string" ? d.name.trim() : "";
    const contact = typeof d.contact_name === "string" ? d.contact_name.trim() : "";
    const days = Number(d.days_until);
    if (!KINDS.includes(kind) || typeof d.contact_id !== "string" || !UUID.test(d.contact_id)) continue;
    if (typeof d.date !== "string" || !YMD.test(d.date) || !Number.isInteger(days) || days < 0) continue;
    if (!name && !contact) continue;
    const years = d.years == null ? null : Number(d.years);
    out.push({
      contact_id: d.contact_id,
      name: (name || contact).slice(0, 60),
      contact_name: (contact || name).slice(0, 60),
      kind,
      date: d.date,
      days_until: days,
      years: years != null && Number.isInteger(years) && years > 0 && years < 130 ? years : null,
      pet_type: kind === "pet_birthday" && typeof d.pet_type === "string" && d.pet_type.trim() ? d.pet_type.trim().toLowerCase().slice(0, 20) : null,
    });
  }
  return out.sort((a, b) => a.days_until - b.days_until);
}

/** "turns 43", "49 years", "12 years in the home"; empty when the year is unknown. */
export function yearsLine(d: SpecialDay): string {
  if (d.years == null) return "";
  if (d.kind === "anniversary") return `${d.years} ${d.years === 1 ? "year" : "years"} married`;
  if (d.kind === "home_anniversary") return `${d.years} ${d.years === 1 ? "year" : "years"} in the home`;
  return `turns ${d.years}`;
}

/** "Today", "Tomorrow", "Tue Oct 06". */
export function whenLine(d: SpecialDay): string {
  if (d.days_until === 0) return "Today";
  if (d.days_until === 1) return "Tomorrow";
  const [y, m, day] = d.date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day));
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit", timeZone: "UTC" }).replace(",", "");
}

const LABEL: Record<SpecialKind, string> = {
  birthday: "Birthday",
  spouse_birthday: "Spouse's birthday",
  child_birthday: "Child's birthday",
  pet_birthday: "Pet's birthday",
  anniversary: "Anniversary",
  home_anniversary: "Home anniversary",
};

/** Whose family member it is: "Mike Smith's spouse", "Mike Smith's dog". */
function whose(d: SpecialDay): string {
  if (d.kind === "spouse_birthday") return `${d.contact_name}'s spouse`;
  if (d.kind === "child_birthday") return `${d.contact_name}'s child`;
  if (d.kind === "pet_birthday") return `${d.contact_name}'s ${d.pet_type ?? "pet"}`;
  return "";
}

/** One plain sentence, for Ask Pulse and the morning note. */
export function specialSentence(d: SpecialDay): string {
  const when = d.days_until === 0 ? "today" : d.days_until === 1 ? "tomorrow" : `on ${whenLine(d)}`;
  const yrs = d.years != null;
  switch (d.kind) {
    case "birthday":
      return yrs ? `${d.name} turns ${d.years} ${when}.` : `${d.name}'s birthday is ${when}.`;
    case "anniversary":
      return yrs ? `${d.name}'s ${ordinal(d.years!)} wedding anniversary is ${when}.` : `${d.name}'s wedding anniversary is ${when}.`;
    case "home_anniversary":
      return yrs ? `${d.name} has been in the home ${d.years} ${d.years === 1 ? "year" : "years"} ${when}.` : `${d.name}'s home anniversary is ${when}.`;
    default:
      return `${d.name} (${whose(d)}) ${yrs ? `turns ${d.years}` : "has a birthday"} ${when}.`;
  }
}

export function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
}

/**
 * The summary with special days folded in: MASTER's own birthday and
 * anniversary items get the age or years; the family, pets and home become
 * items of their own, in the same "Birthdays and anniversaries" group.
 */
export function withSpecialDays(env: SummaryEnvelope | null): SummaryEnvelope | null {
  if (!env?.found) return env;
  const days = specialDaysOf(env);
  if (!days.length) return env;
  const items = (env.items ?? []).map((it) => {
    if (it.kind !== "birthday" || !it.contact_id) return it;
    const own = /^anniversary/i.test(it.title) ? "anniversary" : "birthday";
    const d = days.find((x) => x.kind === own && x.contact_id === it.contact_id && x.date === it.due);
    const extra = d ? yearsLine(d) : "";
    return extra ? { ...it, detail: [it.detail, extra].filter(Boolean).join(" · ") } : it;
  });
  const have = new Set(items.map((i) => i.id));
  for (const d of days) {
    if (d.kind === "birthday" || d.kind === "anniversary") {
      // MASTER sends these as items already; only add one it left out.
      if (items.some((i) => i.kind === "birthday" && i.contact_id === d.contact_id && i.due === d.date)) continue;
    }
    const id = `go:special:${d.kind}:${d.contact_id}:${d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${d.date}`;
    if (have.has(id)) continue;
    have.add(id);
    const item: SummaryItem = {
      id,
      kind: "birthday",
      title: `${LABEL[d.kind]}: ${d.name}`,
      detail: [whose(d), whenLine(d), yearsLine(d)].filter(Boolean).join(" · "),
      urgency: d.days_until <= 1 ? "today" : "soon",
      due: d.date,
      why: [specialSentence(d), `${d.contact_name} is on your VIP list.`],
      link: `${CRM}/contacts/${d.contact_id}`,
      seen: null,
      contact_id: d.contact_id,
    };
    items.push(item);
  }
  return { ...env, items };
}

/** The VIPs to light up in gold: anyone with a special day today (theirs or their family's). */
export function celebrateIds(env: SummaryEnvelope | null | undefined): Set<string> {
  return new Set(specialDaysOf(env).filter((d) => d.days_until === 0).map((d) => d.contact_id));
}
