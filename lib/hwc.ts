import { MOVE_URL } from "./host.ts";

// VIP-SUMMARY §3h (v1.12): Hot/Warm/Cold drawn natively in ONE Brain. The
// list, the classes and the daily-box credit are ONE MOVE's (vip50-web-crm#57);
// the Brain draws, opens the phone, and asks before moving anyone.

export type HwcClass = "hot" | "warm" | "cold";
export const CLASSES: { key: HwcClass; label: string; color: string; box: string }[] = [
  { key: "hot", label: "Hot", color: "#ff5a4f", box: "Hot Contact" },
  { key: "warm", label: "Warm", color: "#f5a742", box: "Warm Contact" },
  { key: "cold", label: "Cold", color: "#5aa9ff", box: "Cold Contact" },
];
export const CLASS_OF = Object.fromEntries(CLASSES.map((c) => [c.key, c])) as Record<HwcClass, (typeof CLASSES)[number]>;

export interface HwcPerson {
  id: string;
  name: string;
  cls: HwcClass;
  phone: string | null;
  contactId: string | null;
  photo: string | null;
  lastNote: string | null;
  lastNoteAt: string | null;
  addedAt: string | null;
  // §3h.6-7 (v1.16); null/empty until ONE MOVE sends them
  notes: HwcNote[];
  lastTouchAt: string | null;
  classSince: string | null;
  previousClass: HwcClass | null;
  dueOn: string | null;
  followUpOn: string | null;
  followUpBy: "agent" | "pulse" | null;
}
export interface HwcNote { id: string; note: string; at: string | null }
export interface Reminder { id: string; cls: HwcClass; dueOn: string; daysOver: number; why: string }
export interface Pick { id: string; cls: HwcClass; reason: string }
export interface Hwc {
  date: string;
  today: Record<HwcClass, boolean>;
  people: HwcPerson[];
  /** Pulse's due list: ONE MOVE's when it sends one, else worked out here from the dates. */
  reminders: Reminder[];
  picks: Pick[];
  /** True when the reminders came from ONE MOVE (§3h.7), false when the Brain worked them out. */
  fromMove: boolean;
}

export const hwcUrl = `${MOVE_URL}/api/brain/hwc`;

const isClass = (v: unknown): v is HwcClass => v === "hot" || v === "warm" || v === "cold";
const str = (v: unknown, max = 300) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export function readHwc(raw: unknown): Hwc | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.people)) return null;
  const t = (r.today ?? {}) as Record<string, unknown>;
  const people: HwcPerson[] = [];
  for (const p of r.people as unknown[]) {
    if (!p || typeof p !== "object") continue;
    const o = p as Record<string, unknown>;
    const name = str(o.name, 120);
    if (typeof o.id !== "string" || !o.id || !name || !isClass(o.class)) continue;
    const notes: HwcNote[] = Array.isArray(o.notes)
      ? (o.notes as unknown[])
          .filter((n): n is Record<string, unknown> => !!n && typeof n === "object" && typeof (n as { id?: unknown }).id === "string" && typeof (n as { note?: unknown }).note === "string")
          .slice(0, 50)
          .map((n) => ({ id: n.id as string, note: (n.note as string).slice(0, 2000), at: str(n.at, 40) }))
      : [];
    people.push({
      id: o.id,
      name,
      cls: o.class,
      phone: str(o.phone, 40),
      contactId: str(o.contact_id, 60),
      photo: str(o.photo, 800),
      lastNote: str(o.last_note, 200),
      lastNoteAt: str(o.last_note_at, 40),
      addedAt: str(o.added_at, 40),
      notes,
      lastTouchAt: str(o.last_touch_at, 40),
      classSince: str(o.class_since, 40),
      previousClass: isClass(o.previous_class) ? o.previous_class : null,
      dueOn: isDay(o.due_on) ? o.due_on : null,
      followUpOn: isDay(o.follow_up_on) ? o.follow_up_on : null,
      followUpBy: o.follow_up_by === "agent" || o.follow_up_by === "pulse" ? o.follow_up_by : null,
    });
  }
  const date = isDay(r.date) ? r.date : todayIn();
  const ids = new Set(people.map((p) => p.id));
  const fromMove = Array.isArray(r.pulse_reminders);
  const reminders: Reminder[] = fromMove
    ? (r.pulse_reminders as unknown[])
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
        .filter((x) => typeof x.id === "string" && ids.has(x.id) && isClass(x.class) && isDay(x.due_on))
        .map((x) => ({ id: x.id as string, cls: x.class as HwcClass, dueOn: x.due_on as string, daysOver: typeof x.days_over === "number" ? Math.max(0, Math.round(x.days_over)) : 0, why: str(x.why, 200) ?? "" }))
    : dueList(people, date);
  const picks: Pick[] = Array.isArray(r.pulse_picks)
    ? (r.pulse_picks as unknown[])
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
        .filter((x) => typeof x.id === "string" && ids.has(x.id) && isClass(x.class))
        .map((x) => ({ id: x.id as string, cls: x.class as HwcClass, reason: str(x.reason, 200) ?? "" }))
    : picksFrom(reminders);
  return { date, today: { hot: t.hot === true, warm: t.warm === true, cold: t.cold === true }, people, reminders, picks, fromMove };
}

const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
/** Today in Denver, as YYYY-MM-DD. */
export function todayIn(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
/** The Denver day of an ISO time. */
function dayOf(iso: string | null): string | null {
  if (!iso) return null;
  if (isDay(iso)) return iso;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : todayIn(d);
}
/** Whole days from a to b (YYYY-MM-DD). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

/** §3h.7 class windows: a touch is due this many days after the last one. */
export const WINDOW: Record<HwcClass, number> = { hot: 7, warm: 21, cold: 60 };
const RANK: Record<HwcClass, number> = { hot: 2, warm: 1, cold: 0 };

/** The last time this person was touched, as far as the Brain can tell. */
export function lastTouchDay(p: HwcPerson): string | null {
  return dayOf(p.lastTouchAt) ?? dayOf(p.lastNoteAt) ?? dayOf(p.addedAt);
}

/** When the next touch is due: ONE MOVE's date, else the follow-up date, else last touch + window. */
export function dueDay(p: HwcPerson): string | null {
  if (p.dueOn) return p.dueOn;
  if (p.followUpOn) return p.followUpOn;
  const last = lastTouchDay(p);
  return last ? addDays(last, WINDOW[p.cls]) : null;
}

/** Everyone due today or overdue, most overdue first, Hot before Warm before Cold on ties. */
export function dueList(people: HwcPerson[], today: string): Reminder[] {
  const out: Reminder[] = [];
  for (const p of people) {
    const due = dueDay(p);
    if (!due || due > today) continue;
    const last = lastTouchDay(p);
    const since = last ? daysBetween(last, today) : null;
    const why = p.followUpOn && p.followUpOn <= today
      ? `You asked to follow up${p.followUpOn === today ? " today" : ` on ${shortDay(p.followUpOn)}`}${p.lastNote ? `: ${p.lastNote}` : "."}`
      : since == null
        ? `${CLASS_OF[p.cls].label}, no touch on record.`
        : `${CLASS_OF[p.cls].label}, not touched in ${since} ${since === 1 ? "day" : "days"}.`;
    out.push({ id: p.id, cls: p.cls, dueOn: due, daysOver: daysBetween(due, today), why });
  }
  return out.sort((a, b) => b.daysOver - a.daysOver || RANK[b.cls] - RANK[a.cls]);
}

/** Pulse's three for today: the top of the due list, one per class. */
export function picksFrom(reminders: Reminder[]): Pick[] {
  const out: Pick[] = [];
  for (const c of CLASSES) {
    const r = reminders.find((x) => x.cls === c.key);
    if (r) out.push({ id: r.id, cls: r.cls, reason: r.why });
  }
  return out;
}

/** How warm a face looks: 1 just touched, falling to 0 at the end of its window. */
export function warmth(p: HwcPerson, today: string): number {
  const last = lastTouchDay(p);
  if (!last) return 0;
  return Math.max(0, Math.min(1, 1 - daysBetween(last, today) / WINDOW[p.cls]));
}

/** "up" when someone moved to a hotter class in the last 7 days, "down" for a colder one. */
export function trend(p: HwcPerson, today: string): "up" | "down" | null {
  if (!p.previousClass || !p.classSince || p.previousClass === p.cls) return null;
  const since = dayOf(p.classSince);
  if (!since || daysBetween(since, today) > 7) return null;
  return RANK[p.cls] > RANK[p.previousClass] ? "up" : "down";
}

/** "1 Mar" for a YYYY-MM-DD day. */
export function shortDay(d: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(`${d}T00:00:00Z`));
}

/** The line under a person's name about their reminder. */
export function reminderLine(p: HwcPerson, today: string): string | null {
  if (p.followUpOn) {
    const who = p.followUpBy === "pulse" ? "Pulse set a reminder" : "Reminder set";
    return `${who} for ${shortDay(p.followUpOn)}${p.followUpBy === "pulse" ? " from your note" : ""}.`;
  }
  const due = dueDay(p);
  if (!due) return null;
  const n = daysBetween(today, due);
  if (n < 0) return `Pulse: overdue by ${-n} ${n === -1 ? "day" : "days"}.`;
  if (n === 0) return "Pulse: due today.";
  return `Pulse: next touch due ${shortDay(due)}.`;
}

/** "Move Sarah to Warm?" */
export function moveQuestion(firstName: string, to: HwcClass): string {
  return `Move ${firstName} to ${CLASS_OF[to].label}?`;
}

/** The list after moving one person, before ONE MOVE answers. */
export function withMoved(h: Hwc, id: string, to: HwcClass): Hwc {
  return { ...h, people: h.people.map((p) => (p.id === id ? { ...p, cls: to } : p)) };
}

/** "2 Oct" for an ISO time, in Denver. */
export function noteDay(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", { timeZone: "America/Denver", day: "numeric", month: "short" }).format(d);
}

/** "(801) 555-1234" for a US number; anything else as stored. */
export function phoneLine(phone: string | null): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d.length === 10 ? d : null;
  return ten ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}` : phone;
}
