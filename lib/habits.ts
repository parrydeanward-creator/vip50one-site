import type { GraphEdge, GraphNode } from "./graph/types.ts";
import type { DailyDay } from "./daily.ts";
import type { History } from "./pulseCoach.ts";

// The Habits ring (Parry, 7 Oct: "love the habits ring"). The "you" boxes of the Daily Tracker (made bed,
// affirmations, gratitude, exercise, macros, reading) as a ring that fills each morning. The boxes and their points
// are ONE MOVE's (VIP-SUMMARY §3e); the Brain draws them and sends a tick, the same as the Daily Tracker. The ring
// pulses yellow until today's habits are done, then rests green (Follow the pulse, 5 Oct).

export const HABITS_NODE = "go-habits";
export const HABIT_SECTION = "habits";

export interface HabitToday {
  key: string;
  label: string;
  done: boolean;
  /** Days ticked this week so far (Monday on), from Pulse Coach's history; null when not known. */
  week: number | null;
}

/** Today's habits, from the Daily Tracker's "habits" section, with this week's days where the history has them. */
export function habitsToday(day: DailyDay | null, history: History | null, today: string): HabitToday[] {
  const sec = day?.sections.find((s) => s.key === HABIT_SECTION);
  if (!sec) return [];
  const monday = mondayOf(today);
  const thisWeek = history?.weeks.find((w) => w.start === monday) ?? null;
  return sec.boxes.map((b) => {
    const counted = thisWeek && b.key in thisWeek.habits ? (thisWeek.habits as Record<string, number>)[b.key] : null;
    // history may not have caught today's tick yet: never show fewer days than today's box implies
    const week = counted == null ? null : Math.max(counted, b.done ? 1 : 0);
    return { key: b.key, label: b.label, done: b.done, week };
  });
}

export const doneCount = (h: HabitToday[]) => h.filter((x) => x.done).length;

/** "4 of 6 habits today" / "All 6 habits done today". */
export function habitsLine(h: HabitToday[]): string {
  const n = doneCount(h);
  return n === h.length ? `All ${h.length} habits done today` : `${n} of ${h.length} habits today`;
}

/** The Habits orb under ONE YOU: yellow until today's habits are all done, then green. */
export function withHabitsNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, h: HabitToday[] | null): G {
  const go = g.nodes.find((n) => n.id === "go");
  const nodes = g.nodes.filter((n) => n.id !== HABITS_NODE);
  const edges = g.edges.filter((e) => e.target !== HABITS_NODE);
  if (!go || go.locked || !h || !h.length) return { ...g, nodes, edges };
  const left = h.length - doneCount(h);
  nodes.push({
    id: HABITS_NODE,
    type: "feature",
    label: "Habits",
    secondaryLabel: habitsLine(h),
    parentId: "go",
    product: "go",
    importance: 1.0,
    status: left ? "attention" : "healthy",
    summary: left ? `${left} of your morning habits still to tick today. They count on your Daily Tracker.` : "Every habit done today.",
  });
  edges.push({ id: `go>${HABITS_NODE}`, source: "go", target: HABITS_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

export function mondayOf(d: string): string {
  const t = Date.parse(`${d}T12:00:00Z`);
  const dow = (new Date(t).getUTCDay() + 6) % 7; // 0 = Monday
  return new Date(t - dow * 86_400_000).toISOString().slice(0, 10);
}

/** Example habits for the demo dashboard. */
export function demoHabitsDay(today: string): DailyDay {
  const b = (key: string, label: string, done: boolean) => ({ key, label, points: 1, done });
  return {
    date: today,
    score: 3,
    max: 40,
    week: { score: 62, minimum: 100 },
    sections: [
      {
        key: HABIT_SECTION,
        label: "Daily Habits",
        boxes: [b("made_bed", "Made Bed", true), b("affirmations", "Affirmations", true), b("gratitudes", "Gratitudes", true), b("exercise", "Exercise", false), b("tracked_macros", "Tracked Macros", false), b("positive_reading", "Positive Reading", false)],
      },
    ],
  };
}
