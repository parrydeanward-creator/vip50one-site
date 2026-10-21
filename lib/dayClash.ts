// The organic calendar's clash ask (ONE-CALENDAR.md §3 rule 3; ONE MOVE routes vip50-web-crm#354, #355). Saving a block with
// `ask: true` on top of an appointment the agent booked answers 409 {question, clash:{with}}; the agent chooses: move the
// new one, move the other one, or keep both. Pure, so tests/dayClash.test.ts can pin the rules.

export type ClashChoice = "new" | "other" | "both";
export interface ClashAsk { question: string; with: string }
export type ClashAnswer =
  | { kind: "ask"; ask: ClashAsk }
  | { kind: "ok"; note: string | null }
  | { kind: "other" }; // anything unexpected: the old behaviour stays

const text = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** The answer to POST /api/brain/day/block sent with ask: true. */
export function readClashAnswer(status: number, j: unknown): ClashAnswer {
  const r = (j && typeof j === "object" ? j : {}) as Record<string, unknown>;
  if (status === 409) {
    const c = r.clash && typeof r.clash === "object" ? (r.clash as Record<string, unknown>) : null;
    const w = text(c?.with, 120);
    const q = text(r.question, 300);
    if (!w && !q) return { kind: "other" };
    return { kind: "ask", ask: { question: q ?? `This overlaps ${w}. Keep both?`, with: w ?? "another appointment" } };
  }
  if (status >= 200 && status < 300) return { kind: "ok", note: text(r.note, 300) };
  return { kind: "other" };
}

/** The `note` of POST /api/brain/day/clash with push: true ("Power Hour moved to 2:00 PM."), else null. */
export function readPushNote(j: unknown): string | null {
  return j && typeof j === "object" ? text((j as Record<string, unknown>).note, 300) : null;
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toHM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const up5 = (m: number) => Math.ceil(m / 5) * 5;

/** The next open slot of the same length at or after the clash's end, inside working hours; null when none is left. */
export function nextOpenSlot(busy: { start: string; end: string }[], hours: { start: string; end: string }, start: string, end: string): { start: string; end: string } | null {
  const len = toMin(end) - toMin(start);
  if (!(len > 0)) return null;
  const limit = toMin(hours.end);
  const spans = busy.map((b) => [toMin(b.start), toMin(b.end)] as const);
  for (let s = up5(Math.max(toMin(end), toMin(hours.start))); s + len <= limit; s += 5) {
    if (!spans.some(([a, b]) => s < b && a < s + len)) return { start: toHM(s), end: toHM(s + len) };
  }
  return null;
}
