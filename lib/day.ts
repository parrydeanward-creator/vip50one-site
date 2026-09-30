import type { ProductKey } from "./graph/types.ts";

// Your day (Parry, 30 Sep): ONE tells the agent exactly what to do today and
// when, watches the products as the work gets done, and compiles the day at
// the end. This file only plans and counts; nothing here draws or sends.
//
// Real data: VIP-SUMMARY items due today (their `kind` maps to a DayKind);
// an item turns done when its product reports it (a live signal), or when the
// agent ticks it.

export type DayKind = "call" | "text" | "note" | "approval" | "meeting" | "rating" | "follow_up" | "report" | "other";

export interface DayItem {
  id: string;
  nodeId: string; // the node it is about (Go to)
  product: ProductKey;
  kind: DayKind;
  what: string;
  minutes: number;
  vip?: boolean; // a VIP touch
  at?: string; // fixed time, "HH:MM" (a lunch, an appointment)
  watch?: string[]; // live signals that complete it
}

export interface Slot extends DayItem {
  start: string; // "HH:MM"
  end: string;
  done: boolean;
}

// When each kind of work goes best in a day: people first, while they pick
// up; approvals before posting time; lunch at lunch; admin in the afternoon.
export const WINDOW: Record<DayKind, string> = {
  call: "08:00",
  text: "09:30",
  approval: "10:00",
  note: "11:00",
  meeting: "12:30",
  other: "13:30",
  report: "14:00",
  rating: "15:00",
  follow_up: "16:00",
};

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const round5 = (m: number) => Math.ceil(m / 5) * 5;

// Today in order, each with a start and end. Fixed times keep their place;
// everything else takes the first free time at or after its window.
export function planDay(items: DayItem[], done: Set<string> = new Set()): Slot[] {
  const fixed = items.filter((i) => i.at).map((i) => ({ i, s: toMin(i.at!) }));
  const busy = fixed.map(({ i, s }) => [s, s + i.minutes] as const);
  const free = (s: number, len: number) => busy.every(([a, b]) => s + len <= a || s >= b);
  const flexible = items
    .filter((i) => !i.at)
    .map((i, n) => ({ i, want: toMin(WINDOW[i.kind]), n }))
    .sort((a, b) => a.want - b.want || a.n - b.n);
  const placed = fixed.map(({ i, s }) => ({ i, s }));
  for (const { i, want } of flexible) {
    let s = want;
    while (!free(s, i.minutes)) {
      const clash = busy.filter(([a, b]) => !(s + i.minutes <= a || s >= b)).map(([, b]) => b);
      s = round5(Math.max(...clash));
    }
    busy.push([s, s + i.minutes]);
    placed.push({ i, s });
  }
  return placed
    .sort((a, b) => a.s - b.s)
    .map(({ i, s }) => ({ ...i, start: toTime(s), end: toTime(s + i.minutes), done: done.has(i.id) }));
}

export interface DayRecap {
  done: number;
  total: number;
  vipTouches: number;
  minutesLeft: number;
  carry: Slot[]; // not done: moves to tomorrow
}

export function recap(slots: Slot[]): DayRecap {
  const open = slots.filter((s) => !s.done);
  return {
    done: slots.length - open.length,
    total: slots.length,
    vipTouches: slots.filter((s) => s.done && s.vip).length,
    minutesLeft: open.reduce((t, s) => t + s.minutes, 0),
    carry: open,
  };
}

// Evening in the agent's day (Mountain time): the recap leads.
export function isEvening(now: Date): boolean {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", hour: "numeric", hour12: false }).format(now));
  return h >= 17;
}

// Which of today's items a live signal completes.
export function completedBy(items: DayItem[], signalId: string): string[] {
  return items.filter((i) => i.watch?.includes(signalId)).map((i) => i.id);
}

export function clock(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
}

export function duration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
