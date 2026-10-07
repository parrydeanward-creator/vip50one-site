import type { GraphEdge, GraphNode } from "./graph/types.ts";
import type { Commitments, Draft, Kind } from "./commitments.ts";

// Pulse Coach (VIP-SUMMARY §3q; Parry, 7 Oct: "pulse coach I like how can we beef that up", then yes): a weekly
// read on the agent's own numbers over the last eight weeks: trends, the weekday that works and the one that goes
// quiet, the "you" habits, the commitment keep rate, and one focus for next week the agent can make a commitment.
// Rules only, from the agent's own numbers; nothing is made up, sent or set for the agent.

export const PULSE_COACH_NODE = "go-pulse-coach";
export const historyUrl = (weeks = 8, agent?: string) => `https://move.vip50one.com/api/brain/history?weeks=${weeks}${agent ? `&agent=${encodeURIComponent(agent)}` : ""}`;
export const nextCommitKey = "one.cm.next"; // the focus the agent chose, first in Monday's starters

export const TOUCHES = ["call", "video_text", "text", "social", "handwritten_note", "face_to_face", "drop_by", "newsletter", "mixer"] as const;
export type Touch = (typeof TOUCHES)[number];
export const HABITS = ["made_bed", "affirmations", "gratitudes", "exercise", "positive_reading"] as const;
export type Habit = (typeof HABITS)[number];

export interface Week {
  start: string;
  score: number | null;
  minimum: number;
  counts: Record<Touch, number>;
  habits: Record<Habit, number>;
  hwc: { hot: number; warm: number; cold: number };
}
export interface History {
  weeks: Week[];
  weekdays: { dow: number; avg: number }[];
}

const TOUCH_WORD: Record<Touch, [string, string]> = {
  call: ["call", "calls"],
  video_text: ["video text", "video texts"],
  text: ["text", "texts"],
  social: ["social touch", "social touches"],
  handwritten_note: ["handwritten note", "handwritten notes"],
  face_to_face: ["face-to-face", "face-to-faces"],
  drop_by: ["drop-by", "drop-bys"],
  newsletter: ["newsletter", "newsletters"],
  mixer: ["mixer invite", "mixer invites"],
};
const HABIT_WORD: Record<Habit, string> = { made_bed: "Made bed", affirmations: "Affirmations", gratitudes: "Gratitude", exercise: "Exercise", positive_reading: "Reading" };
const WORDS: Record<number, string> = { 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven" };
const DAY = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
// The touches a commitment can count (§3n): the focus becomes one of these.
const COMMIT_KIND: Partial<Record<Touch, Kind>> = { call: "call", video_text: "video_text", text: "text", social: "social", handwritten_note: "handwritten_note", face_to_face: "face_to_face", drop_by: "drop_by" };

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
const isDay = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** A §3q.1 answer, checked; null when it is not one. Oldest week first. */
export function readHistory(j: unknown): History | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.weeks)) return null;
  const weeks: Week[] = [];
  for (const w of r.weeks as Record<string, unknown>[]) {
    if (!w || !isDay(w.start)) continue;
    const c = (w.counts ?? {}) as Record<string, unknown>;
    const h = (w.habits ?? {}) as Record<string, unknown>;
    const x = (w.hwc ?? {}) as Record<string, unknown>;
    weeks.push({
      start: w.start,
      score: typeof w.score === "number" && Number.isFinite(w.score) ? w.score : null,
      minimum: typeof w.minimum === "number" && w.minimum > 0 ? w.minimum : 100,
      counts: Object.fromEntries(TOUCHES.map((k) => [k, num(c[k])])) as Record<Touch, number>,
      habits: Object.fromEntries(HABITS.map((k) => [k, Math.min(7, num(h[k]))])) as Record<Habit, number>,
      hwc: { hot: num(x.hot), warm: num(x.warm), cold: num(x.cold) },
    });
  }
  weeks.sort((a, b) => a.start.localeCompare(b.start));
  const weekdays = (Array.isArray(r.weekdays) ? (r.weekdays as Record<string, unknown>[]) : [])
    .filter((d) => d && Number.isInteger(d.dow) && (d.dow as number) >= 1 && (d.dow as number) <= 7)
    .map((d) => ({ dow: d.dow as number, avg: num(d.avg_points) }));
  return weeks.length ? { weeks, weekdays } : null;
}

export type ReadKey = "trend" | "touches" | "days" | "habits" | "keep" | "focus";
export interface Part {
  key: ReadKey;
  title: string;
  big: string;
  line: string;
  rows: { text: string; sub?: string }[];
  level: "today" | null; // yellow when it needs the agent; the rest still green
  good: boolean;
}
export interface Read {
  headline: string; // the one line in the middle
  parts: Part[];
  focus: (Draft & { why: string }) | null;
}

const monthDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
const plural = (k: Touch, n: number) => TOUCH_WORD[k][n === 1 ? 0 : 1];

/** Runs of change in the last weeks: how many weeks in a row a touch has fallen (or risen), ending last week. */
export function run(series: number[], dir: -1 | 1): number {
  let n = 0;
  for (let i = series.length - 1; i > 0; i--) {
    if (Math.sign(series[i] - series[i - 1]) === dir) n++;
    else break;
  }
  return n;
}

/** The weekly read (§3q). `last` is the most recent full week; the current, unfinished week is left out. With
 *  `who`, it is a coach's read of an agent they coach (§3n.4), in the third person. */
export function pulseRead(h: History, c: Commitments | null, today: string, who?: string): Read | null {
  const your = who ? "their" : "your";
  const Your = who ? "Their" : "Your";
  const full = h.weeks.filter((w) => addDays(w.start, 7) <= today);
  if (!full.length) return null;
  const last = full[full.length - 1];
  const prev = full.slice(0, -1);
  const parts: Part[] = [];
  let focus: Read["focus"] = null;

  // Trend: the weekly score against the minimum, and the best week since when.
  const scored = full.filter((w) => w.score != null);
  const met = (() => {
    let n = 0;
    for (let i = full.length - 1; i >= 0 && full[i].score != null && full[i].score! >= full[i].minimum; i--) n++;
    return n;
  })();
  let headline = who ? `${who}'s week, read by Pulse` : "Your week, read by Pulse";
  if (last.score != null) {
    const beaten = [...prev].reverse().find((w) => w.score != null && w.score >= last.score!);
    const best = prev.length && !beaten ? `Best week in ${full.length} weeks` : beaten && prev.indexOf(beaten) < prev.length - 1 ? `Best week since ${monthDay(beaten.start)}` : null;
    headline = best ?? (last.score >= last.minimum ? `${last.score}: above the ${last.minimum}` : `${last.score}: ${last.minimum - last.score} short of ${last.minimum}`);
    parts.push({
      key: "trend",
      title: "Weekly score",
      big: String(last.score),
      line: met ? `${met} ${met === 1 ? "week" : "weeks in a row"} at ${last.minimum} or more` : `Last week ended ${last.minimum - last.score} short of ${last.minimum}`,
      rows: scored.map((w) => ({ text: `Week of ${monthDay(w.start)}: ${w.score}`, sub: w.score! >= w.minimum ? "At or above the minimum" : `${w.minimum - w.score!} short` })).reverse(),
      level: last.score < last.minimum ? "today" : null,
      good: last.score >= last.minimum,
    });
  }

  // Touches: the one falling longest, the one rising longest, and zeros.
  const series = (k: Touch) => full.map((w) => w.counts[k]);
  const falling = TOUCHES.map((k) => ({ k, n: run(series(k), -1) })).filter((x) => x.n >= 2).sort((a, b) => b.n - a.n);
  const rising = TOUCHES.map((k) => ({ k, n: run(series(k), 1) })).filter((x) => x.n >= 2).sort((a, b) => b.n - a.n);
  const zeros = (["face_to_face", "handwritten_note", "drop_by", "video_text"] as Touch[]).filter((k) => full.slice(-2).every((w) => w.counts[k] === 0));
  const touchRows = TOUCHES.filter((k) => full.some((w) => w.counts[k] > 0)).map((k) => {
    const s = series(k);
    const avg = s.slice(0, -1).reduce((t, x) => t + x, 0) / Math.max(1, s.length - 1);
    return { text: `${cap(TOUCH_WORD[k][1])}: ${last.counts[k]} last week`, sub: s.length > 1 ? `${Your} ${s.length - 1}-week average is ${Math.round(avg * 10) / 10}` : undefined };
  });
  const drop = falling[0];
  parts.push({
    key: "touches",
    title: "Touches",
    big: String(TOUCHES.reduce((t, k) => t + last.counts[k], 0)),
    line: drop
      ? `${cap(TOUCH_WORD[drop.k][1])} dropped ${WORDS[drop.n] ?? drop.n} weeks running`
      : zeros[0]
        ? `No ${TOUCH_WORD[zeros[0]][1]} in two weeks`
        : rising[0]
          ? `${cap(TOUCH_WORD[rising[0].k][1])} up ${rising[0].n} weeks running`
          : "Steady across the board",
    rows: touchRows,
    level: drop || zeros.length ? "today" : null,
    good: !drop && !zeros.length,
  });

  // Weekdays: the best day and the quiet one.
  const days = [...h.weekdays].filter((d) => d.dow <= 5).sort((a, b) => b.avg - a.avg);
  if (days.length >= 2) {
    const best = days[0], quiet = days[days.length - 1];
    const gap = best.avg - quiet.avg;
    parts.push({
      key: "days",
      title: `${Your} week's shape`,
      big: DAY[best.dow].slice(0, 3),
      line: gap >= 5 ? `${DAY[best.dow]} is ${your} best day; ${DAY[quiet.dow]} goes quiet` : `Even across the week: ${DAY[best.dow]} just ahead`,
      rows: [...h.weekdays].sort((a, b) => a.dow - b.dow).map((d) => ({ text: `${DAY[d.dow]}: ${Math.round(d.avg)} points`, sub: d.dow === best.dow ? `${Your} best day` : d.dow === quiet.dow && gap >= 5 ? `${Your} quiet day` : undefined })),
      level: gap >= 10 ? "today" : null,
      good: gap < 10,
    });
  }

  // Habits: the "you" boxes, days out of seven last week.
  const habitDays = HABITS.map((k) => ({ k, n: last.habits[k] }));
  const weak = habitDays.filter((x) => x.n <= 2);
  parts.push({
    key: "habits",
    title: `${Your} habits`,
    big: `${Math.round((habitDays.reduce((t, x) => t + x.n, 0) / (HABITS.length * 7)) * 100)}%`,
    line: weak.length ? `${weak.map((x) => HABIT_WORD[x.k]).join(", ")}: two days or fewer` : "Every habit on most days",
    rows: habitDays.map((x) => ({ text: `${HABIT_WORD[x.k]}: ${x.n} of 7 days` })),
    level: weak.length >= 3 ? "today" : null,
    good: !weak.length,
  });

  // Commitments: the keep rate (§3n).
  if (c && (c.keepRate8w != null || c.lastWeek)) {
    const lw = c.lastWeek;
    const n = lw ? lw.kept + lw.partly + lw.missed : 0;
    parts.push({
      key: "keep",
      title: "Commitments",
      big: c.keepRate8w != null ? `${Math.round(c.keepRate8w * 100)}%` : `${lw!.kept}/${n}`,
      line: lw && n ? `Last week ${lw.kept} kept, ${lw.partly} partly, ${lw.missed} missed` : "No week checked in yet",
      rows: [
        c.keepRate8w != null ? { text: who ? `${who} keeps ${Math.round(c.keepRate8w * 100)}% of what they commit to` : `You keep ${Math.round(c.keepRate8w * 100)}% of what you commit to`, sub: "Over the last 8 weeks." } : { text: "No keep rate yet" },
        c.streak ? { text: `${c.streak}-week check-in streak` } : { text: "No check-in streak yet" },
      ],
      level: lw && lw.missed > lw.kept ? "today" : null,
      good: !!lw && lw.missed === 0,
    });
  }

  // One focus: the touch falling longest (or missing), as a commitment the agent can choose.
  const pick = drop?.k ?? zeros[0] ?? null;
  if (pick && COMMIT_KIND[pick]) {
    const avg = Math.max(...full.map((w) => w.counts[pick]));
    const target = Math.max(pick === "face_to_face" || pick === "drop_by" ? 2 : 3, Math.min(avg, pick === "call" ? 25 : 10));
    focus = { text: `${target} ${plural(pick, target)} next week`, kind: COMMIT_KIND[pick]!, target, why: drop ? `${cap(TOUCH_WORD[pick][1])} have dropped ${WORDS[drop.n] ?? drop.n} weeks running; ${your} best week had ${avg}.` : `No ${TOUCH_WORD[pick][1]} in two weeks.` };
  } else if (last.score != null && last.score < last.minimum) {
    focus = { text: `Reach ${last.minimum} next week`, kind: "yes_no", target: null, why: `Last week ended at ${last.score}.` };
  }
  if (focus)
    parts.push({ key: "focus", title: "One focus", big: "1", line: focus.text, rows: [{ text: focus.text, sub: focus.why }], level: null, good: true });
  return { headline, parts, focus };
}

/** The Pulse Coach orb under ONE YOU: yellow when part of the read needs the agent. */
export function withPulseCoachNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, r: Read | null): G {
  const go = g.nodes.find((n) => n.id === "go");
  const nodes = g.nodes.filter((n) => n.id !== PULSE_COACH_NODE);
  const edges = g.edges.filter((e) => e.target !== PULSE_COACH_NODE);
  if (!go || go.locked || !r) return { ...g, nodes, edges };
  const need = r.parts.filter((p) => p.level).length;
  nodes.push({
    id: PULSE_COACH_NODE,
    type: "feature",
    label: "Pulse Coach",
    secondaryLabel: r.focus ? `Focus: ${r.focus.text}` : r.headline,
    parentId: "go",
    product: "go",
    importance: 1.0,
    status: need ? "attention" : "healthy",
    summary: "A weekly read on your own numbers: what's rising, what's slipping, your best day, your habits, and one focus for next week.",
  });
  edges.push({ id: `go>${PULSE_COACH_NODE}`, source: "go", target: PULSE_COACH_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

/** The example agent's eight weeks, so the sales demo shows a read. */
export function demoHistory(today: string, seed = 0): History {
  // seed > 0: an example agent you coach, a little different from the example you (each one its own shape).
  const k = 1 - (seed % 5) * 0.09;
  const n = (x: number) => Math.round(x * k);
  const monday = addDays(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7));
  const f2f = [4, 3, 4, 3, 3, 2, 1, 0];
  const weeks: Week[] = Array.from({ length: 8 }, (_, i) => ({
    start: addDays(monday, -7 * (8 - i)),
    score: n([96, 104, 110, 98, 112, 105, 118, 92][i]),
    minimum: 100,
    counts: { call: n([18, 20, 22, 19, 24, 21, 25, 17][i]), video_text: [8, 9, 7, 10, 9, 11, 12, 9][i], text: 6, social: [5, 4, 6, 5, 6, 5, 7, 4][i], handwritten_note: [2, 3, 2, 2, 3, 1, 2, 1][i], face_to_face: f2f[i], drop_by: [1, 1, 2, 1, 1, 0, 1, 0][i], newsletter: 1, mixer: i % 2 },
    habits: { made_bed: 6, affirmations: 4, gratitudes: 5, exercise: [4, 3, 4, 3, 2, 3, 2, 2][i], positive_reading: [3, 2, 3, 2, 2, 1, 2, 1][i] },
    hwc: { hot: 4, warm: 3, cold: 2 },
  }));
  return { weeks, weekdays: [{ dow: 1, avg: 24 }, { dow: 2, avg: 27 }, { dow: 3, avg: 22 }, { dow: 4, avg: 19 }, { dow: 5, avg: 11 }, { dow: 6, avg: 5 }, { dow: 7, avg: 3 }] };
}

const DAYMS = 86_400_000;
export const addDays = (d: string, k: number) => new Date(Date.parse(`${d}T12:00:00Z`) + k * DAYMS).toISOString().slice(0, 10);
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
