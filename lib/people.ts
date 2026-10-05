import { MOVE_URL } from "./host.ts";
import { faceUrl } from "./vips.ts";

// VIP-SUMMARY §3k (v1.18, Parry 4 Oct "yes c"): Contacts in ONE Brain. ONE MOVE
// keeps the contacts, the groups, Pulse's rules and the field catalogue
// (vip50-web-crm#66); the Brain draws whatever it is sent and asks. A new field
// or section in ONE MOVE's catalogue shows here with no Brain change.

export const peopleUrl = `${MOVE_URL}/api/brain/people`;

export type GroupKind = "tier" | "source";
export interface PeopleGroup { key: string; label: string; kind: GroupKind; count: number; needsYou: number }
export interface Gaps { vipNoBirthday: number; toSort: number; possibleDuplicates: number }
export interface Groups { total: number; needsYou: number; groups: PeopleGroup[]; gaps: Gaps }

export interface PersonItem {
  id: string;
  name: string;
  firstName: string | null;
  photo: string | null;
  tier: string | null;
  cls: "hot" | "warm" | "cold" | null;
  source: string | null;
  lastTouchOn: string | null;
  pulse: string | null;
}
export interface PeoplePage { total: number; items: PersonItem[]; next: string | null }

export type FieldType = "text" | "date" | "phone" | "email" | "url" | "number" | "list" | "money" | "choice";
export interface Field { key: string; label: string; type: FieldType; value: string | number | string[] | null; editable: boolean; choices?: string[] }
export interface Section { key: string; label: string; summary: string | null; fields: Field[] }
export interface Person {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  photo: string | null;
  phone: string | null;
  email: string | null;
  tier: string | null;
  cls: string | null;
  stage: string | null;
  tags: string[];
  source: string | null;
  pulse: { line: string; nextStep: "call" | "text" | "card" | null } | null;
  sections: Section[];
  timelineCount: number;
}

export type EventKind = "call" | "text" | "email" | "note" | "touch" | "task" | "open_house" | "listing" | "showing" | "web" | "deal" | "other";
export interface TimelineEvent { at: string; kind: EventKind; product: string; title: string; detail: string | null }
export interface Timeline { events: TimelineEvent[]; next: string | null }

const str = (v: unknown, max = 300): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
const KEY = /^[a-z0-9_]{1,40}$/;
const ID = /^[0-9a-f-]{36}$/i;
const CURSOR = /^[A-Za-z0-9_=-]{1,200}$/;

/** §3k.1. Null when the answer is not the contract's shape (the Brain then shows Classic). */
export function readGroups(j: unknown): Groups | null {
  if (!j || typeof j !== "object") return null;
  const o = j as Record<string, unknown>;
  if (!Array.isArray(o.groups)) return null;
  const groups: PeopleGroup[] = [];
  for (const g of o.groups) {
    if (!g || typeof g !== "object") continue;
    const r = g as Record<string, unknown>;
    const key = typeof r.key === "string" && KEY.test(r.key) ? r.key : null;
    const label = str(r.label, 40);
    if (!key || !label || groups.some((x) => x.key === key)) continue;
    groups.push({ key, label, kind: r.kind === "source" ? "source" : "tier", count: num(r.count), needsYou: num(r.needs_you) });
  }
  if (!groups.length) return null;
  const gp = (o.gaps && typeof o.gaps === "object" ? o.gaps : {}) as Record<string, unknown>;
  return {
    total: num(o.total),
    needsYou: num(o.needs_you),
    groups,
    gaps: { vipNoBirthday: num(gp.vip_no_birthday), toSort: num(gp.to_sort), possibleDuplicates: num(gp.possible_duplicates) },
  };
}

const CLS = ["hot", "warm", "cold"] as const;
function item(r: Record<string, unknown>): PersonItem | null {
  const id = typeof r.id === "string" && ID.test(r.id) ? r.id : null;
  const name = str(r.name, 120);
  if (!id || !name) return null;
  const pulse = r.pulse && typeof r.pulse === "object" ? str((r.pulse as Record<string, unknown>).reason, 120) : null;
  return {
    id,
    name,
    firstName: str(r.first_name, 60),
    photo: faceUrl(str(r.photo, 800)),
    tier: str(r.tier, 20),
    cls: CLS.includes(r.class as (typeof CLS)[number]) ? (r.class as PersonItem["cls"]) : null,
    source: str(r.source_label, 80),
    lastTouchOn: typeof r.last_touch_on === "string" && /^\d{4}-\d{2}-\d{2}/.test(r.last_touch_on) ? r.last_touch_on.slice(0, 10) : null,
    pulse,
  };
}

/** §3k.2. */
export function readPage(j: unknown): PeoplePage | null {
  if (!j || typeof j !== "object" || !Array.isArray((j as Record<string, unknown>).items)) return null;
  const o = j as Record<string, unknown>;
  const items = (o.items as unknown[]).flatMap((r) => (r && typeof r === "object" ? [item(r as Record<string, unknown>)].filter((x): x is PersonItem => !!x) : []));
  const next = typeof o.next_cursor === "string" && CURSOR.test(o.next_cursor) ? o.next_cursor : null;
  return { total: Math.max(num(o.total), items.length), items, next };
}

const TYPES: FieldType[] = ["text", "date", "phone", "email", "url", "number", "list", "money", "choice"];
function field(r: Record<string, unknown>): Field | null {
  const key = typeof r.key === "string" && KEY.test(r.key) ? r.key : null;
  const label = str(r.label, 60);
  const type = TYPES.includes(r.type as FieldType) ? (r.type as FieldType) : null;
  if (!key || !label || !type) return null;
  let value: Field["value"] = null;
  if (type === "list") value = Array.isArray(r.value) ? r.value.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.slice(0, 200)) : null;
  else if (type === "number" || type === "money") value = typeof r.value === "number" && Number.isFinite(r.value) ? r.value : null;
  else value = str(r.value, 4000);
  const choices = type === "choice" && Array.isArray(r.choices) ? r.choices.filter((c): c is string => typeof c === "string").slice(0, 40) : undefined;
  return { key, label, type, value, editable: r.editable === true, ...(choices ? { choices } : {}) };
}

/** §3k.3: any sections and fields ONE MOVE sends, in its order. */
export function readPerson(j: unknown): Person | null {
  if (!j || typeof j !== "object") return null;
  const o = j as Record<string, unknown>;
  const id = typeof o.id === "string" && ID.test(o.id) ? o.id : null;
  const name = str(o.name, 120);
  if (!id || !name || !Array.isArray(o.sections)) return null;
  const sections: Section[] = [];
  for (const s of o.sections) {
    if (!s || typeof s !== "object") continue;
    const r = s as Record<string, unknown>;
    const key = typeof r.key === "string" && KEY.test(r.key) ? r.key : null;
    const label = str(r.label, 60);
    if (!key || !label || !Array.isArray(r.fields)) continue;
    const fields = r.fields.flatMap((x) => (x && typeof x === "object" ? [field(x as Record<string, unknown>)].filter((y): y is Field => !!y) : []));
    sections.push({ key, label, summary: str(r.summary, 80), fields });
  }
  const p = o.pulse && typeof o.pulse === "object" ? (o.pulse as Record<string, unknown>) : null;
  const step = p?.next_step;
  return {
    id,
    name,
    firstName: str(o.first_name, 60),
    lastName: str(o.last_name, 60),
    photo: faceUrl(str(o.photo, 800)),
    phone: str(o.phone, 40),
    email: str(o.email, 200),
    tier: str(o.tier, 20),
    cls: str(o.class, 10),
    stage: str(o.stage, 60),
    tags: Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === "string" && !!t.trim()).slice(0, 30) : [],
    source: str(o.source_label, 80),
    pulse: p && str(p.line, 200) ? { line: str(p.line, 200)!, nextStep: step === "call" || step === "text" || step === "card" ? step : null } : null,
    sections,
    timelineCount: num(o.timeline_count),
  };
}

const KINDS: EventKind[] = ["call", "text", "email", "note", "touch", "task", "open_house", "listing", "showing", "web", "deal", "other"];
/** §3k.6. */
export function readTimeline(j: unknown): Timeline | null {
  if (!j || typeof j !== "object" || !Array.isArray((j as Record<string, unknown>).events)) return null;
  const o = j as Record<string, unknown>;
  const events: TimelineEvent[] = [];
  for (const e of o.events as unknown[]) {
    if (!e || typeof e !== "object") continue;
    const r = e as Record<string, unknown>;
    const at = typeof r.at === "string" && /^\d{4}-\d{2}-\d{2}/.test(r.at) ? r.at : null;
    const title = str(r.title, 200);
    if (!at || !title) continue;
    events.push({ at, kind: KINDS.includes(r.kind as EventKind) ? (r.kind as EventKind) : "other", product: str(r.product, 20) ?? "move", title, detail: str(r.detail, 600) });
  }
  const next = typeof o.next_cursor === "string" && CURSOR.test(o.next_cursor) ? o.next_cursor : null;
  return { events, next };
}

/** §3k.2 query: one group or all, a search, a sort, a page. */
export function listUrl(o: { group?: string | null; q?: string; sort?: "pulse" | "name" | "recent"; cursor?: string | null; limit?: number }): string {
  const p = new URLSearchParams();
  if (o.group && KEY.test(o.group)) p.set("group", o.group);
  const q = o.q?.trim();
  if (q) p.set("q", q.slice(0, 100));
  p.set("sort", o.sort ?? "pulse");
  if (o.cursor && CURSOR.test(o.cursor)) p.set("cursor", o.cursor);
  p.set("limit", String(Math.max(1, Math.min(100, o.limit ?? 40))));
  return `${peopleUrl}?${p.toString()}`;
}
export const personUrl = (id: string) => `${peopleUrl}/${encodeURIComponent(id)}`;
export const timelineUrl = (id: string, cursor?: string | null) => `${personUrl(id)}/timeline${cursor && CURSOR.test(cursor) ? `?cursor=${encodeURIComponent(cursor)}` : ""}`;

// ---- showing and editing values -----------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-03-05" -> "Mar 5, 2026"; "--03-05" (no year) -> "Mar 5". */
export function showDate(v: string): string {
  const m = /^(\d{4}|-)-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return v;
  const mo = MONTHS[Number(m[2]) - 1];
  if (!mo) return v;
  return m[1] === "-" ? `${mo} ${Number(m[3])}` : `${mo} ${Number(m[3])}, ${m[1]}`;
}

/** A field's value as the agent reads it; null when empty (a gap). */
export function showValue(f: Field): string | null {
  const v = f.value;
  if (v == null) return null;
  if (Array.isArray(v)) return v.length ? v.join(", ") : null;
  if (f.type === "date" && typeof v === "string") return showDate(v);
  if (f.type === "money" && typeof v === "number") return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (typeof v === "number") return v.toLocaleString("en-US");
  return v;
}

/** What the edit box starts with. Dates as MM-DD-YYYY (or MM-DD), the way agents type them. */
export function editText(f: Field): string {
  const v = f.value;
  if (v == null) return "";
  if (Array.isArray(v)) return v.join("\n");
  if (f.type === "date" && typeof v === "string") {
    const m = /^(\d{4}|-)-(\d{2})-(\d{2})$/.exec(v);
    if (m) return m[1] === "-" ? `${m[2]}-${m[3]}` : `${m[2]}-${m[3]}-${m[1]}`;
  }
  return String(v);
}

/**
 * The typed text in the shape §3k.4 takes, or a plain-words problem. Empty clears.
 * Dates: MM-DD-YYYY, MM/DD/YY, MM-DD (no year) or YYYY-MM-DD.
 */
export function editValue(f: Field, text: string): { value: string | number | string[] | null } | { error: string } {
  const t = text.trim();
  if (!t) return { value: null };
  switch (f.type) {
    case "list":
      return { value: t.split(/\n|,/).map((x) => x.trim()).filter(Boolean) };
    case "number":
    case "money": {
      const n = Number(t.replace(/[$,\s]/g, ""));
      return Number.isFinite(n) && n >= 0 ? { value: n } : { error: `${f.label} must be a number.` };
    }
    case "choice":
      return f.choices?.includes(t) ? { value: t } : { error: `${f.label} must be one of: ${(f.choices ?? []).join(", ")}.` };
    case "date": {
      let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
      if (m) return realDate(+m[1], +m[2], +m[3], f.label);
      m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(t);
      if (m) {
        let y = +m[3];
        if (m[3].length === 2) y += y > (new Date().getFullYear() % 100) + 1 ? 1900 : 2000;
        return realDate(y, +m[1], +m[2], f.label);
      }
      m = /^(\d{1,2})[-/.](\d{1,2})$/.exec(t);
      if (m) return realDate(null, +m[1], +m[2], f.label);
      return { error: `${f.label}: type the date as MM-DD-YYYY, or MM-DD if you don't know the year.` };
    }
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? { value: t } : { error: `${f.label} doesn't look like an email address.` };
    case "url":
      return /^https?:\/\//i.test(t) || /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(t) ? { value: t } : { error: `${f.label} doesn't look like a web address.` };
    default:
      return { value: t };
  }
}

function realDate(y: number | null, m: number, d: number, label: string): { value: string } | { error: string } {
  const yy = y ?? 2000; // a leap year, so Feb 29 is allowed with no year
  const dt = new Date(Date.UTC(yy, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d || yy < 1900 || yy > 2100) return { error: `${label} is not a real date.` };
  const mm = String(m).padStart(2, "0"), dd = String(d).padStart(2, "0");
  return { value: y == null ? `--${mm}-${dd}` : `${y}-${mm}-${dd}` };
}

/** How many fields in a section are empty: the gaps Pulse can ask about. */
export const gapsIn = (s: Section) => s.fields.filter((f) => showValue(f) == null).length;

/** The colour of each group orb (tiers warm, "came from" cool). */
const COLORS: Record<string, string> = {
  vip50: "#f5c542",
  vip100: "#ffb347",
  hwc: "#ff6b4a",
  past_clients: "#7ee081",
  sphere: "#2fb7a3",
  to_sort: "#ff9ec4",
  open_house: "#5aa9ff",
  lofty: "#b07cff",
  website: "#4dd0e1",
  marquee: "#e8d48a",
  showly: "#ff8a3d",
  imported: "#9fb3d9",
  other: "#9aa4bf",
};
export const groupColor = (key: string) => COLORS[key] ?? "#9aa4bf";

/** The section orbs round a person (contact, family, home...). */
const SECTION_COLORS: Record<string, string> = {
  contact: "#2fb7a3",
  relationship: "#f5c542",
  about: "#ff9ec4",
  family: "#ff8a3d",
  home: "#7ee081",
  searching: "#5aa9ff",
  work: "#b07cff",
  online: "#4dd0e1",
  touches: "#ffb347",
  permissions: "#9aa4bf",
};
export const sectionColor = (key: string) => SECTION_COLORS[key] ?? "#9fb3d9";

/** "Hot", "VIP-50", "Lofty"... the small line under a name. */
export function personTag(p: { tier: string | null; cls: string | null; source: string | null }): string {
  const tier = p.tier === "vip50" ? "VIP-50" : p.tier === "vip100" ? "VIP-100" : null;
  const cls = p.cls ? p.cls[0].toUpperCase() + p.cls.slice(1) : null;
  return [tier, cls, !tier && !cls ? p.source : null].filter(Boolean).join(" · ");
}
