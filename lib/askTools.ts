// Ask Pulse about the whole business (walker 14 Oct; Parry: "pulse is supposed to be able to answer questions"). Pulse
// may call these read-only lookups while it answers. Each one reads the signed-in agent's own MASTER rows with the
// agent's own session AND an explicit user_id filter (MASTER also lets admins read every contact, and the leaderboard
// read every tracker, so row-level security alone is not enough). Nothing here writes, sends or changes anything.
// This file is the plain part: the tool list, the input checks and the shaping. lib/server/askData.ts runs the reads.

export interface ToolPerson {
  contact_id: string;
  name: string;
  phone: string | null;
  facts: string[];
}

export interface ToolResult {
  summary: string;
  people?: ToolPerson[];
  rows?: Record<string, unknown>[];
}

export const PEOPLE_MAX = 25;

export const TOUCH_TYPES = ["any", "call", "text", "note", "face_to_face", "drop_by", "social", "mixer", "newsletter"] as const;
export type TouchKind = (typeof TOUCH_TYPES)[number];
/** contact_touches.touch_type values each kind covers. */
export const TOUCH_DB: Record<Exclude<TouchKind, "any">, string[]> = {
  call: ["call"],
  text: ["video_text", "text"],
  note: ["handwritten_note", "note"],
  face_to_face: ["face_to_face"],
  drop_by: ["drop_by"],
  social: ["social"],
  mixer: ["mixer"],
  newsletter: ["newsletter"],
};
export const TIERS = ["vip", "vip50", "vip100", "all"] as const;
export type Tier = (typeof TIERS)[number];
export const tierValues = (t: Tier): string[] | null => (t === "vip" ? ["vip50", "vip100"] : t === "all" ? null : [t]);

/** The tools Pulse may call (Claude tool use). Descriptions are what the model reads. */
export const ASK_TOOLS = [
  {
    name: "contacts_not_touched",
    description: "People the agent has NOT touched in the last N days, oldest first. touch_type narrows it to one kind of touch (call, text = video text or text, note = handwritten note, face_to_face, drop_by, social, mixer, newsletter); 'any' means no touch of any kind. tier: 'vip' (VIP-50 and VIP-100, the default), 'vip50', 'vip100' or 'all' contacts.",
    input_schema: { type: "object", properties: { days: { type: "integer", minimum: 1, maximum: 730 }, touch_type: { type: "string", enum: [...TOUCH_TYPES] }, tier: { type: "string", enum: [...TIERS] } }, required: ["days"] },
  },
  {
    name: "find_contacts",
    description: "Find the agent's contacts by name, or by tier, Hot/Warm/Cold stage, where they came from (source, e.g. 'open house', 'Showly', 'website') or tag. Up to 25.",
    input_schema: { type: "object", properties: { name: { type: "string" }, tier: { type: "string", enum: [...TIERS] }, stage: { type: "string", enum: ["hot", "warm", "cold"] }, source: { type: "string" }, tag: { type: "string" } } },
  },
  {
    name: "special_days",
    description: "Birthdays, spouse birthdays, wedding anniversaries and home anniversaries in the next N days (0 = today only), for VIP-50 and VIP-100 by default or all contacts.",
    input_schema: { type: "object", properties: { days_ahead: { type: "integer", minimum: 0, maximum: 60 }, tier: { type: "string", enum: [...TIERS] } } },
  },
  {
    name: "pipeline",
    description: "Hot (closing within 0-3 months), Warm (3-12) and Cold (12+) business: the people in each class with their next follow-up date and price range.",
    input_schema: { type: "object", properties: { class: { type: "string", enum: ["hot", "warm", "cold", "all"] } } },
  },
  {
    name: "open_house_visitors",
    description: "People who came to the agent's open houses (and listing sign-ins) in the last N days, with the address and day.",
    input_schema: { type: "object", properties: { days: { type: "integer", minimum: 1, maximum: 365 } } },
  },
  {
    name: "tasks",
    description: "The agent's open tasks: 'today', 'overdue' or 'week' (the next 7 days).",
    input_schema: { type: "object", properties: { range: { type: "string", enum: ["today", "overdue", "week"] } }, required: ["range"] },
  },
  {
    name: "tracker",
    description: "Daily tracker points per day for the last N days (the weekly minimum is 100), and logged touches by kind in that time.",
    input_schema: { type: "object", properties: { days: { type: "integer", minimum: 1, maximum: 90 } } },
  },
  {
    name: "goals",
    description: "The agent's goals for their goal year (closings, referrals, GCI), the year's start date, and referrals received and closed so far this goal year, with names.",
    input_schema: { type: "object", properties: {} },
  },
] as const;
export type ToolName = (typeof ASK_TOOLS)[number]["name"];
export const isTool = (n: string): n is ToolName => ASK_TOOLS.some((t) => t.name === n);

const clampInt = (v: unknown, lo: number, hi: number, dflt: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : dflt);
const pick = <T extends string>(v: unknown, list: readonly T[], dflt: T): T => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : dflt);
const text = (v: unknown, max = 60) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** The checked input for each tool: anything out of range falls back to a safe default. */
export function toolInput(name: ToolName, raw: unknown) {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  switch (name) {
    case "contacts_not_touched":
      return { days: clampInt(r.days, 1, 730, 30), touch_type: pick(r.touch_type, TOUCH_TYPES, "any"), tier: pick(r.tier, TIERS, "vip") };
    case "find_contacts":
      return { name: text(r.name), tier: pick(r.tier, TIERS, "all"), stage: pick(r.stage, ["hot", "warm", "cold", "any"] as const, "any"), source: text(r.source), tag: text(r.tag) };
    case "special_days":
      return { days_ahead: clampInt(r.days_ahead, 0, 60, 7), tier: pick(r.tier, TIERS, "vip") };
    case "pipeline":
      return { class: pick(r.class, ["hot", "warm", "cold", "all"] as const, "all") };
    case "open_house_visitors":
      return { days: clampInt(r.days, 1, 365, 14) };
    case "tasks":
      return { range: pick(r.range, ["today", "overdue", "week"] as const, "today") };
    case "tracker":
      return { days: clampInt(r.days, 1, 90, 7) };
    case "goals":
      return {};
  }
}

/** "%" and "_" are wildcards in ilike, and "," and ")" break an or() filter: keep a search to plain words. */
export const likeSafe = (s: string) => s.replace(/[%_,()*\\]/g, " ").replace(/\s+/g, " ").trim();

export const nameOf = (c: { first_name?: unknown; last_name?: unknown }) =>
  [c.first_name, c.last_name].filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim()).join(" ") || "Unnamed contact";

/** YYYY-MM-DD in Denver (agents' default zone). */
export function denverDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). */
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

/** The next time a yearly date (birthday, anniversary) falls on or after `today`, and how many years it marks. */
export function nextYearly(date: string, today: string): { on: string; years: number | null } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return null;
  const y = Number(today.slice(0, 4));
  for (const year of [y, y + 1]) {
    let mmdd = `${m[2]}-${m[3]}`;
    if (mmdd === "02-29" && !(year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0))) mmdd = "02-28";
    const on = `${year}-${mmdd}`;
    if (on >= today) {
      const born = Number(m[1]);
      return { on, years: born > 1900 && born < year ? year - born : null };
    }
  }
  return null;
}

export const SPECIAL = [
  ["birthday", "Birthday"],
  ["spouse_birthday", "Spouse's birthday"],
  ["anniversary", "Wedding anniversary"],
  ["home_purchase_date", "Home anniversary"],
] as const;

/** Special days in [today, today + daysAhead], soonest first. */
export function specialDays(rows: Record<string, unknown>[], today: string, daysAhead: number): ToolPerson[] {
  const end = addDays(today, daysAhead);
  const hits: { on: string; p: ToolPerson }[] = [];
  for (const c of rows) {
    for (const [col, label] of SPECIAL) {
      const v = c[col];
      if (typeof v !== "string") continue;
      const n = nextYearly(v, today);
      if (!n || n.on > end) continue;
      const when = n.on === today ? "today" : n.on === addDays(today, 1) ? "tomorrow" : `on ${n.on}`;
      const what = label === "Birthday" || label === "Spouse's birthday" ? label : n.years ? `${label} (${n.years} years)` : label;
      hits.push({ on: n.on, p: { contact_id: String(c.id), name: nameOf(c), phone: phoneOf(c), facts: [`${what} ${when}`] } });
    }
  }
  return hits.sort((a, b) => a.on.localeCompare(b.on)).map((h) => h.p);
}

export const phoneOf = (c: Record<string, unknown>): string | null => {
  const v = typeof c.phone_e164 === "string" && c.phone_e164 ? c.phone_e164 : typeof c.phone === "string" ? c.phone : "";
  const digits = v.replace(/[^\d+]/g, "");
  return digits.replace(/\D/g, "").length >= 10 ? digits : null;
};

/** The people not touched since `cutoff`, oldest last touch first. `touched` holds every contact touched since. */
export function notTouched(rows: Record<string, unknown>[], touched: Set<string>, cutoff: string, kind: TouchKind, lastOfKind: Map<string, string>): ToolPerson[] {
  const out: { last: string; p: ToolPerson }[] = [];
  for (const c of rows) {
    const id = String(c.id);
    if (touched.has(id)) continue;
    const anyLast = typeof c.last_touch_date === "string" ? c.last_touch_date.slice(0, 10) : null;
    if (kind === "any" && anyLast && anyLast >= cutoff) continue;
    const last = kind === "any" ? anyLast : lastOfKind.get(id) ?? null;
    const word = kind === "any" ? "touch" : kind.replace(/_/g, " ");
    const facts = [last ? `Last ${word} ${last}` : `No ${word} logged`];
    if (c.contact_tier === "vip50") facts.push("VIP-50");
    else if (c.contact_tier === "vip100") facts.push("VIP-100");
    out.push({ last: last ?? "", p: { contact_id: id, name: nameOf(c), phone: phoneOf(c), facts } });
  }
  return out.sort((a, b) => a.last.localeCompare(b.last)).map((x) => x.p);
}

/** Cap the list sent to the model, saying how many there are in all. */
export function capped(summary: string, people: ToolPerson[]): ToolResult {
  return { summary: people.length > PEOPLE_MAX ? `${summary} (${people.length} in all; the first ${PEOPLE_MAX} shown)` : summary, people: people.slice(0, PEOPLE_MAX) };
}

/** Hot/Warm/Cold from the stage text, whatever its case. */
export const classOf = (stage: unknown): "hot" | "warm" | "cold" | null => {
  const s = typeof stage === "string" ? stage.trim().toLowerCase() : "";
  return s === "hot" || s === "warm" || s === "cold" ? s : null;
};

/** "$450k-$600k" */
export function priceRange(min: unknown, max: unknown): string | null {
  const k = (v: unknown) => (typeof v === "number" && v > 0 ? (v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M` : `$${Math.round(v / 1000)}k`) : null);
  const a = k(min), b = k(max);
  return a && b ? `${a}-${b}` : a ? `from ${a}` : b ? `up to ${b}` : null;
}
