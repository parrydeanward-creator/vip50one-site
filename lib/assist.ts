import type { Commitments } from "./commitments.ts";
import type { DatedNote } from "./graph/types.ts";
import type { PlanItem } from "./plan.ts";
import { clock12, freeGaps, hm, toMin, toTime, type Block, type Busy } from "./schedule.ts";

// The rest of the Day Clock's smart planning and Pulse as a personal assistant (VIP-SUMMARY §3o.6, §3o.7,
// §3o.11, §3o.13; Parry, 6 Oct: "like a personal assistant", "pulse driving it all keeping the agent on task").
// Pure, the Brain's copy of the rules: a missed block slides to the next free gap and the agent is told; the
// week's commitments become today's work; and the small things a great assistant does (prep before an
// appointment, when to leave, "how did it go?", a use for a short gap, a card bought before the birthday, the
// day's wrap). Pulse acts only on the agent's own plan, always shows what it will do first, and never
// contacts anyone.

// ---- missed blocks move by themselves (§3o.6) -------------------------------------------------------

export interface Moved {
  id: string;
  title: string;
  from: string;
  to: string;
}

/** Blocks not ticked by their end slide to the next free gap today; fixed ones never move; what can't fit
 * moves to tomorrow. The note says so in one line. */
export function slide(blocks: Block[], busy: Busy[], hours: { start: string; end: string }, now: string): { blocks: (Block & { movedFrom?: string })[]; moved: Moved[]; tomorrow: Block[]; note: string | null } {
  const n = toMin(now);
  const missed = blocks.filter((b) => !b.done && b.kind !== "custom" && toMin(b.end) <= n);
  if (!missed.length) return { blocks, moved: [], tomorrow: [], note: null };
  const stay = blocks.filter((b) => !missed.includes(b));
  const taken: Busy[] = [...busy, ...stay.map((b) => ({ start: b.start, end: b.end, title: b.title, source: "fixed" as const }))];
  // blocks keep their own buffer rule: appointments get 10 minutes either side, our own blocks none
  const gaps = freeGaps(hours, taken, toTime(n)).map(([s, e]) => [s, e] as [number, number]);
  const out: (Block & { movedFrom?: string })[] = [...stay];
  const moved: Moved[] = [];
  const tomorrow: Block[] = [];
  for (const b of missed) {
    const len = toMin(b.end) - toMin(b.start);
    const k = gaps.findIndex(([s, e]) => e - s >= len);
    if (k < 0) {
      tomorrow.push(b);
      continue;
    }
    const s = gaps[k][0];
    gaps.splice(k, 1, ...([[s + len, gaps[k][1]]] as [number, number][]).filter(([a, z]) => z - a >= 5));
    out.push({ ...b, start: toTime(s), end: toTime(s + len), movedFrom: b.start });
    moved.push({ id: b.id, title: b.title, from: b.start, to: toTime(s) });
  }
  out.sort((a, b) => toMin(a.start) - toMin(b.start));
  const bits = [
    ...moved.map((m) => `${m.title} to ${clock12(m.to)}`),
    ...(tomorrow.length ? [`${tomorrow.length === 1 ? tomorrow[0].title : `${tomorrow.length} blocks`} to tomorrow`] : []),
  ];
  return { blocks: out, moved, tomorrow, note: `Moved ${bits.join(", ")}.` };
}

// ---- the week's commitments become today's work (§3o.7) ---------------------------------------------

const PER: Partial<Record<string, { kind: PlanItem["kind"]; min: number; word: [string, string] }>> = {
  call: { kind: "call", min: 6, word: ["call", "calls"] },
  text: { kind: "text", min: 3, word: ["text", "texts"] },
  video_text: { kind: "text", min: 5, word: ["video text", "video texts"] },
  handwritten_note: { kind: "note", min: 5, word: ["handwritten note", "handwritten notes"] },
  face_to_face: { kind: "meeting", min: 60, word: ["face-to-face", "face-to-faces"] },
  drop_by: { kind: "meeting", min: 20, word: ["drop-by", "drop-bys"] },
  social: { kind: "other", min: 3, word: ["social touch", "social touches"] },
};

/** Weekdays left this week, today included (Monday to Friday; on a weekend, none). */
export function weekdaysLeft(today: string): number {
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 Sunday
  return dow >= 1 && dow <= 5 ? 6 - dow : 0;
}

/** Today's share of each counted commitment still short this week: "15 calls" on a Wednesday with 6 done
 * is 3 calls today. Coffees and drop-bys land on whole days ("two coffees" on two days). */
export function commitmentWork(c: Commitments | null, today: string): PlanItem[] {
  const week = c?.week;
  const days = weekdaysLeft(today);
  if (!week || !days) return [];
  const out: PlanItem[] = [];
  for (const it of week.items) {
    const per = PER[it.kind];
    if (!per || it.target == null || it.result) continue;
    const short = Math.max(0, it.target - (it.count ?? 0));
    if (!short) continue;
    const n = Math.ceil(short / days);
    out.push({
      ref: `cm:${it.id}`,
      product: "go",
      kind: per.kind,
      // the kind first, so the few words that fit on the clock face say what it is
      title: `${cap(per.word[1])}: ${n} today, ${short} to go this week (commitment)`,
      contactId: null,
      link: null,
      minutes: Math.min(120, n * per.min),
      done: false,
      urgency: "today",
    });
  }
  return out;
}

// ---- Pulse as a personal assistant (§3o.13) ---------------------------------------------------------

export type AssistKind = "prep" | "leave" | "howgo" | "gap" | "ahead" | "wrap" | "week";

export interface Assist {
  key: string; // stable, to remember an answer
  kind: AssistKind;
  title: string;
  lines: string[];
  action?: { label: string; block: { title: string; start: string; end: string; date: string } }; // one tap adds it to the agent's own plan
  ask?: boolean; // "How did it go?": a note box
  appt?: { start: string; title: string }; // the appointment a "How did it go?" note is filed on (§3o.3 v1.37)
}

const APPT: readonly Busy["source"][] = ["calendar", "one_event", "open_house", "showing", "listing_appointment", "fixed"];

/** What to have ready, by what the appointment is. Facts the Brain has; the rest says where it comes from. */
function prepLines(b: Busy): string[] {
  const t = (b.title ?? "").toLowerCase();
  if (b.source === "listing_appointment" || /listing|cma|seller/.test(t))
    return ["The address, your history with the seller and your notes, in ONE MOVE.", "Comparables come here once the MLS is connected."];
  if (b.source === "showing" || /show(ing)?s?\b|tour/.test(t)) return ["The homes in order and the route, in Showly.", "What the buyers said Yes and No to so far."];
  if (b.source === "open_house" || /open house/.test(t)) return ["Sign-in ready in ONE Open.", "Visitors go to ONE MOVE tagged by the house."];
  if (/coffee|lunch|breakfast|drinks|meet/.test(t)) return ["Call Prep for who you're meeting: last talk, family, their favourites.", "One thing to ask, and one way to help."];
  return ["What it's for, and what you want from it."];
}

// a drive or commute the agent typed as an appointment ("Drive home.") gets no prep and no "How did it go?"
const isMeet = (b: Busy) => APPT.includes(b.source) && !!b.title && !/^\s*(drive|driving|commute|travel)\b/i.test(b.title);

/** The cards for right now, most pressing first. `answered` holds the "How did it go?" keys already done. */
export function assistNow(input: {
  date: string;
  now: string;
  hours: { start: string; end: string };
  busy: Busy[];
  blocks: Block[];
  later: { title: string }[];
  dated?: DatedNote[];
  vipsNoVideo?: number;
  answered?: Set<string>;
  commitments?: Commitments | null;
}): Assist[] {
  const n = toMin(input.now);
  const out: Assist[] = [];
  const appts = input.busy.filter(isMeet).sort((a, b) => toMin(a.start) - toMin(b.start));
  const drives = input.busy.filter((b) => b.source === "travel");

  // Leave by: a drive the agent told Pulse about, before an appointment, starting within the hour.
  for (const d of drives) {
    const s = toMin(d.start);
    if (s < n - 5 || s - n > 60) continue;
    const to = appts.find((a) => toMin(a.start) >= toMin(d.end) - 1 && toMin(a.start) - toMin(d.end) <= 30);
    out.push({
      key: `leave:${d.start}`,
      kind: "leave",
      title: `Leave by ${clock12(d.start)}${to ? ` for ${to.title}` : ""}`,
      lines: [`${toMin(d.end) - s} minutes' drive${s - n > 0 ? `, in ${s - n} minutes` : ", now"}.`, "Drive time from what you told Pulse; traffic comes later."],
    });
  }

  // Prep: an appointment starting within 30 minutes (ready 10 minutes ahead, shown a little earlier).
  for (const a of appts) {
    const s = toMin(a.start);
    if (s < n || s - n > 30) continue;
    out.push({ key: `prep:${a.start}`, kind: "prep", title: `Next: ${a.title} at ${clock12(a.start)}`, lines: prepLines(a) });
  }

  // How did it go: an appointment that ended in the last three hours, not answered yet.
  for (const a of appts) {
    const e = toMin(a.end);
    const key = `howgo:${input.date}:${a.start}:${a.title}`;
    if (e > n || n - e > 180 || input.answered?.has(key)) continue;
    const tomorrow = nextDay(input.date);
    out.push({
      key,
      kind: "howgo",
      title: `How did ${a.title} go?`,
      lines: ["A line or two for your notes. Nothing is sent."],
      ask: true,
      appt: { start: a.start, title: a.title! },
      action: { label: "Thank-you text tomorrow 9:00", block: { title: `Thank-you text: ${a.title}`.slice(0, 80), start: "09:00", end: "09:15", date: tomorrow } },
    });
  }

  // A use for a short free gap (15 to 45 minutes) coming up in the next two hours.
  const taken: Busy[] = [...input.busy, ...input.blocks.map((b) => ({ start: b.start, end: b.end, title: b.title, source: "fixed" as const }))];
  const gap = freeGaps(input.hours, taken, input.now).find(([s, e]) => e - s >= 15 && e - s <= 45 && s - n <= 120);
  if (gap) {
    const len = gap[1] - gap[0];
    const what = input.later[0]?.title ?? (input.vipsNoVideo ? `${Math.min(input.vipsNoVideo, Math.floor(len / 5))} video texts to VIPs who haven't had one this month` : null);
    if (what)
      out.push({
        key: `gap:${toTime(gap[0])}`,
        kind: "gap",
        title: `${hm(len)} free at ${clock12(toTime(gap[0]))}`,
        lines: [`Pulse suggests: ${what.replace(/\.$/, "")}.`],
        action: { label: "Put it there", block: { title: what.slice(0, 80), start: toTime(gap[0]), end: toTime(gap[0] + Math.min(len, 30)), date: input.date } },
      });
  }

  // Remembers ahead: a birthday or anniversary in 3 to 7 days gets a card errand two days before.
  for (const d of input.dated ?? []) {
    if (!/birthday|anniversary/i.test(d.what)) continue;
    const days = daysBetween(input.date, d.at.slice(0, 10));
    if (days < 3 || days > 7) continue;
    const by = addDays(d.at.slice(0, 10), -2);
    out.push({
      key: `ahead:${d.id}:${d.at.slice(0, 10)}`,
      kind: "ahead",
      title: `${d.what.replace(/\.$/, "")} in ${days} days`,
      lines: [`A card in the mail by ${weekday(by)} gets there in time.`],
      action: { label: `Card errand ${weekday(by)}`, block: { title: `Card: ${d.what}`.slice(0, 80), start: "12:30", end: "12:45", date: by } },
    });
    if (out.filter((x) => x.kind === "ahead").length >= 2) break;
  }

  // The day's wrap, from 30 minutes before the end of the working day.
  if (n >= toMin(input.hours.end) - 30) {
    const done = input.blocks.filter((b) => b.done).length;
    const open = input.blocks.filter((b) => !b.done);
    out.push({
      key: `wrap:${input.date}`,
      kind: "wrap",
      title: "Your day",
      lines: [
        `${done} of ${input.blocks.length} blocks done.`,
        open.length ? `Left: ${open.map((b) => b.title).slice(0, 3).join(", ")}${open.length > 3 ? ` and ${open.length - 3} more` : ""}.` : "Everything planned is done.",
      ],
    });
  }

  // Sunday evening: the week ahead.
  const dow = new Date(`${input.date}T12:00:00Z`).getUTCDay();
  if (dow === 0 && n >= 16 * 60) {
    const items = input.commitments?.week?.items ?? [];
    out.push({
      key: `week:${input.date}`,
      kind: "week",
      title: "Your week ahead",
      lines: items.length ? items.slice(0, 5).map((i) => i.text) : ["Set up to five commitments tomorrow morning; Pulse spreads them across the week."],
    });
  }
  const order: AssistKind[] = ["leave", "prep", "howgo", "gap", "ahead", "wrap", "week"];
  // one card per key: the same appointment twice (two calendars) must not leave a card "Not now" can't clear
  const seen = new Set<string>();
  return out.filter((c) => !seen.has(c.key) && (seen.add(c.key), true)).sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
const DAY = 86_400_000;
const at = (d: string) => Date.parse(`${d}T12:00:00Z`);
export const addDays = (d: string, k: number) => new Date(at(d) + k * DAY).toISOString().slice(0, 10);
export const nextDay = (d: string) => addDays(d, 1);
export const daysBetween = (a: string, b: string) => Math.round((at(b) - at(a)) / DAY);
const weekday = (d: string) => new Date(at(d)).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
