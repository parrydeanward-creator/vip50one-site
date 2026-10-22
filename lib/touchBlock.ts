import type { Block, DayFromMove } from "./schedule.ts";
import type { DayItem } from "./day.ts";

// One Power Hour, from ONE MOVE (Parry, 22 Oct: "there are 2 power hours on the daily clock calendar ... every day mon
// thru fri the system creates specific tasks based on the users VIP-50 ... the power hour is to accomplish those
// touches ... if not then whatever is left to do needs to be rescheduled on the calendar for that day. when the user
// clicks on power hour it should populate all those auto touches (tasks) and populate them in the side bar with the
// persons name and make it clickable so when clicked it will open the contacts full page ... and then click all the
// boxes when accomplished").
//
// ONE MOVE's day (GET /api/brain/day, vip50-web-crm#371) carries the day's one Power Hour (`kind: power_hour`) and, once
// the hour has ended with touches left, one "Finish your VIP touches (n left)" block (`kind: custom`, `follow_up: true`).
// Both carry `items`. The Brain never builds a Power Hour of its own: it draws these two, and the example agent's one
// is made here in the same shape and read by the same reader (lib/schedule.ts readDay).

export interface TouchItem {
  taskId: string | null;
  ref: string;
  contactId: string | null;
  name: string;
  kind: "call" | "text" | "note";
  what: string;
  done: boolean;
}

const KINDS: readonly TouchItem["kind"][] = ["call", "text", "note"];
const str = (x: unknown, n: number) => (typeof x === "string" && x.trim() ? x.trim().slice(0, n) : null);

/** A block's `items` as ONE MOVE sends them, checked; null when the block has none. Bad rows are dropped. */
export function readTouchItems(x: unknown): TouchItem[] | null {
  if (!Array.isArray(x)) return null;
  const out: TouchItem[] = [];
  for (const r of x as Record<string, unknown>[]) {
    if (!r || typeof r !== "object") continue;
    const ref = str(r.ref, 200);
    if (!ref) continue;
    out.push({
      taskId: str(r.task_id, 64),
      ref,
      contactId: str(r.contact_id, 64),
      name: str(r.name, 80) ?? "A VIP",
      kind: KINDS.includes(r.kind as TouchItem["kind"]) ? (r.kind as TouchItem["kind"]) : "call",
      what: str(r.what, 60) ?? "Touch",
      done: r.done === true,
    });
  }
  return out;
}

export const FOLLOW_UP_PREFIX = "Finish your VIP touches";
/** A block whose touches open in the side panel: the Power Hour or its follow-up. */
export const isTouchBlock = (b: Pick<Block, "kind" | "items">): boolean => !!b.items && (b.kind === "power_hour" || b.kind === "custom");
const isFollowUpBlock = (b: Pick<Block, "kind" | "title" | "followUp">) => !!b.followUp || (b.kind === "custom" && b.title.startsWith(FOLLOW_UP_PREFIX));

/** The block's title, counted as ONE MOVE counts it: "Power Hour: 3 of 9 done", "Finish your VIP touches (6 left)". */
export function touchTitle(b: Pick<Block, "kind" | "title" | "followUp">, items: readonly TouchItem[]): string {
  const done = items.filter((i) => i.done).length;
  return isFollowUpBlock(b) ? `${FOLLOW_UP_PREFIX} (${items.length - done} left)` : `Power Hour: ${done} of ${items.length} done`;
}

/**
 * The day's touch blocks, at most one Power Hour and one follow-up. A Power Hour without items is not one ONE MOVE sent
 * (a copy the Brain once built and saved), so it is never drawn; nor is a second one. `done` overrides what ONE MOVE
 * said for a touch while its tick is on the way (or, for the example agent, for good).
 */
export function touchBlocks(blocks: readonly Block[], done: (ref: string) => boolean | undefined = () => undefined): Block[] {
  const ph = blocks.find((b) => b.kind === "power_hour" && b.items);
  const fu = blocks.find((b) => b !== ph && isTouchBlock(b) && isFollowUpBlock(b));
  return [ph, fu]
    .filter((b): b is Block => !!b)
    .map((b) => {
      const items = b.items!.map((i) => ({ ...i, done: done(i.ref) ?? i.done }));
      return { ...b, items, title: touchTitle(b, items), done: items.length > 0 && items.every((i) => i.done) };
    });
}

/** Any Power Hour or follow-up in a list of blocks (to leave out what the Brain must not draw itself). */
export const isAnyPowerBlock = (b: Pick<Block, "kind" | "title" | "followUp">) => b.kind === "power_hour" || isFollowUpBlock(b);

/** The tick body for POST /api/brain/day/done (vip50-web-crm#371): the task, or the special day's ref. */
export function tickBody(item: Pick<TouchItem, "taskId" | "ref">, done: boolean): { task_id: string; done: boolean } | { ref: string; done: boolean } {
  return item.taskId ? { task_id: item.taskId, done } : { ref: item.ref, done };
}

/** Where a name in the panel goes: the Brain's full contact page (lib/deepLink.ts), or nowhere when unlinked. */
export const contactHref = (contactId: string | null): string | null => (contactId ? `/dashboard/contacts/${contactId}` : null);

// ---- the example agent's Power Hour, in ONE MOVE's shape --------------------------------------------------------

// The example day's VIP touches (lib/graph/demo.ts) as people. Contact ids are the example contacts' own
// (lib/examples/move2.ts exampleId: Jen Alvarez 1, Dave Kim 2, Amy Chen 3, Mark Miller 6, Jane Parker 7).
const exId = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const DEMO_PEOPLE: Record<string, { name: string; contact: string | null; what: string }> = {
  "day-jen": { name: "Jen Alvarez", contact: exId(1), what: "Call" },
  "day-amy": { name: "Amy Chen", contact: exId(3), what: "Call" },
  "day-nina": { name: "Nina Brooks", contact: null, what: "Call" },
  "day-millers": { name: "The Millers", contact: exId(6), what: "Video text" },
  "day-parkers": { name: "The Parkers", contact: exId(7), what: "Social media touch" },
  "day-video": { name: "2 of your VIP-50", contact: null, what: "Video text" },
  "day-note": { name: "Dave Kim", contact: exId(2), what: "Handwritten note" },
};

/** Is this one of the example day's VIP touches (they make its one Power Hour)? */
export const demoTouch = (d: Pick<DayItem, "vip" | "kind" | "urgency">) => !!d.vip && d.urgency !== "soon" && (d.kind === "call" || d.kind === "text" || d.kind === "note");

/** The example agent's day as ONE MOVE would answer it: one Power Hour holding the example day's VIP touches, calls
 * first, at `start` (an hour long). Read with readDay like the live answer. */
export function demoDayAnswer(date: string, today: readonly DayItem[], start: string): Record<string, unknown> {
  const touches = today.filter(demoTouch).sort((a, b) => Number(a.kind !== "call") - Number(b.kind !== "call"));
  const items = touches.map((d) => {
    const ref = d.ref ?? d.id.replace(/^day:/, "");
    const p = DEMO_PEOPLE[d.id] ?? { name: d.what.replace(/[.]$/, ""), contact: d.contactId ?? null, what: d.kind === "call" ? "Call" : d.kind === "note" ? "Handwritten note" : "Text" };
    return { task_id: null, ref, contact_id: p.contact, name: p.name, kind: d.kind, what: p.what, done: false };
  });
  const [h, m] = start.split(":").map(Number);
  const end = `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return {
    date,
    hours: { start: "08:00", end: "17:30" },
    busy: [],
    blocks: items.length
      ? [{ id: "demo-power-hour", start, end, kind: "power_hour", title: `Power Hour: 0 of ${items.length} done`, refs: items.map((i) => i.ref), why: "Your VIP touches for today.", done: false, follow_up: false, items }]
      : [],
    approved_at: null,
  };
}

/** The example agent's touch blocks, through the same reader as ONE MOVE's answer. */
export function demoTouchBlocks(read: (j: unknown) => DayFromMove | null, date: string, today: readonly DayItem[], start: string): Block[] {
  return read(demoDayAnswer(date, today, start))?.blocks ?? [];
}

/** The side panel's rows (components/brain/TouchPanel.tsx): each person by name, where the name goes, what to do, and
 * whether it is ticked. */
export function panelRows(b: Pick<Block, "items">): { key: string; name: string; href: string | null; contactId: string | null; what: string; kind: TouchItem["kind"]; done: boolean; item: TouchItem }[] {
  return (b.items ?? []).map((i) => ({ key: i.ref, name: i.name, href: contactHref(i.contactId), contactId: i.contactId, what: i.what, kind: i.kind, done: i.done, item: i }));
}
