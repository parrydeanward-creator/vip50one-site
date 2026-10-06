"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DayItem } from "@/lib/day.ts";
import { todayIn } from "@/lib/hwc.ts";
import { planUrl, putBody, suggest, type Plan, type PlanItem } from "@/lib/plan.ts";
import { buildDay, customItem, customKey, customsOn, dayPutBody, dayUrl, denverNow, readDay, toMin, type Block, type Busy, type Custom, type DayPlan } from "@/lib/schedule.ts";

// The day as Pulse plans it (VIP-SUMMARY §3o), shared by the Day Clock and the Brain's Next line and
// chimes. ONE MOVE's day route first; until it answers, the Brain builds the day itself from what is
// pulsing, the agent's own blocks and working hours, with the same rules (lib/schedule.ts).

const HOURS = { start: "08:00", end: "17:30" };
// The demo agent's appointments, so the example plans round something real.
const DEMO_BUSY: Busy[] = [
  { start: "10:00", end: "11:00", title: "Listing appointment, 418 Oak Lane", source: "listing_appointment" },
  { start: "14:00", end: "14:45", title: "Showing with the Parks", source: "showing" },
];
const approvedKey = (date: string) => `one.dayplan.${date}`;

type Stored = Custom & { date: string };
const readLocal = <T,>(key: string, fallback: T): T => {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null");
    return v ?? fallback;
  } catch {
    return fallback;
  }
};

export interface Day {
  date: string;
  now: string | null; // null until the page is in the browser
  hours: { start: string; end: string };
  busy: Busy[];
  plan: DayPlan;
  approvedAt: string | null;
  fromMove: boolean;
  customs: Custom[];
  addBlock: (c: Omit<Custom, "id">) => Promise<string>;
  removeBlock: (id: string) => void;
  approve: () => Promise<string>;
  replan: () => void;
}

export function useDay({ today, planned, live, doneRefs, onPlan }: { today: DayItem[]; planned: Plan | null; live: boolean; doneRefs: Set<string>; onPlan: (p: Plan) => void }): Day {
  const date = useMemo(() => todayIn(), []);
  // The clock starts in the browser (the server's minute may differ). Planning starts from the time the
  // agent opened the page, so the plan stays put while they look at it; the example agent after hours
  // shows the whole day.
  const [now, setNow] = useState<string | null>(null);
  const [from, setFrom] = useState<string | null>(null);
  useEffect(() => {
    setNow(denverNow());
    setFrom(denverNow());
    const t = setInterval(() => setNow(denverNow()), 20_000);
    return () => clearInterval(t);
  }, []);
  const [stored, setStored] = useState<Stored[]>([]);
  const [approved, setApproved] = useState<{ at: string; blocks: Block[]; freeMin?: number; plannedMin?: number } | null>(null);
  const [move, setMove] = useState<ReturnType<typeof readDay>>(null);
  useEffect(() => {
    setStored(readLocal<Stored[]>(customKey, []));
    const a = readLocal<{ at: string; blocks: Block[]; freeMin?: number; plannedMin?: number } | null>(approvedKey(date), null);
    if (a && Array.isArray(a.blocks)) setApproved(a);
    if (!live) return;
    fetch(`${dayUrl}?date=${date}`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setMove(readDay(j)))
      .catch(() => {}); // ONE MOVE's day route is not live yet: the Brain plans the day itself
  }, [date, live]);

  const customs = useMemo(() => customsOn(stored, date), [stored, date]);
  const hours = move?.hours ?? HOURS;
  const busy = useMemo(() => (move ? move.busy : live ? [] : DEMO_BUSY), [move, live]);
  const isDone = useCallback((b: Block) => b.done || (b.refs.length > 0 && b.refs.every((r) => doneRefs.has(r))), [doneRefs]);

  const plan = useMemo<DayPlan>(() => {
    const fixed = (move?.approvedAt && move.blocks.length ? move.blocks : approved?.blocks) ?? null;
    if (fixed) {
      const blocks = fixed.map((b) => ({ ...b, done: isDone(b) }));
      // the agent's own fixed blocks are time taken, not work planned (as buildDay counts them)
      const work = blocks.filter((b) => b.kind !== "custom").reduce((t, b) => t + toMin(b.end) - toMin(b.start), 0);
      const taken = [...busy, ...blocks.filter((b) => b.kind === "custom")].reduce((t, b) => t + toMin(b.end) - toMin(b.start), 0);
      const fromMove = !!(move?.approvedAt && move.blocks.length);
      return { blocks, later: [], plannedMin: fromMove ? work : approved?.plannedMin ?? work, freeMin: fromMove ? Math.max(work, toMin(hours.end) - toMin(hours.start) - taken) : approved?.freeMin ?? work };
    }
    const base: PlanItem[] = planned?.items.length ? planned.items.filter((p) => !p.ref.startsWith("blk:")) : suggest(today);
    const items = [...base, ...customs.map(customItem)].map((p) => ({ ...p, done: p.done || doneRefs.has(p.ref) }));
    const notBefore = from && (live || toMin(from) < toMin(hours.end) - 60) ? from : undefined;
    const out = buildDay({ hours, busy, items, notBefore });
    return { ...out, blocks: out.blocks.map((b) => ({ ...b, done: isDone(b) })) };
  }, [move, approved, busy, hours, planned, today, customs, doneRefs, from, isDone]);

  const saveStored = (next: Stored[]) => {
    setStored(next);
    try {
      localStorage.setItem(customKey, JSON.stringify(next));
    } catch {}
  };
  const unapprove = () => {
    setApproved(null);
    try {
      localStorage.removeItem(approvedKey(date));
    } catch {}
  };

  const addBlock = async (c: Omit<Custom, "id">): Promise<string> => {
    const id = `${Date.now().toString(36)}`;
    saveStored([...stored, { ...c, id, date }]);
    unapprove();
    if (!live) return "Added. Example agent: in your account it goes on your calendar too.";
    try {
      const r = await fetch(`${dayUrl}/block`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: `${c.title} ${c.start} to ${c.end}${c.repeat === "weekdays" ? " every weekday" : c.repeat === "daily" ? " every day" : ""}`, confirmed: { title: c.title, start: c.start, end: c.end, repeat: c.repeat } }) });
      return r.ok ? "Added, and on your calendar." : "Added on this computer. It reaches your calendar once ONE GO's calendar update is live.";
    } catch {
      return "Added on this computer. It reaches your calendar once ONE GO's calendar update is live.";
    }
  };
  const removeBlock = (id: string) => {
    saveStored(stored.filter((c) => c.id !== id));
    unapprove();
  };

  // Looks good: keep this day as it is, and send its order to ONE GO as Today's plan (§3l) so the phone
  // works the same list in the same order.
  const planRef = useRef(plan);
  planRef.current = plan;
  const approve = async (): Promise<string> => {
    const { blocks, freeMin, plannedMin } = planRef.current;
    const at = new Date().toISOString();
    setApproved({ at, blocks, freeMin, plannedMin });
    try {
      localStorage.setItem(approvedKey(date), JSON.stringify({ at, blocks, freeMin, plannedMin }));
    } catch {}
    const byRef = new Map<string, PlanItem>([...(planned?.items ?? []), ...suggest(today), ...customs.map(customItem)].map((p) => [p.ref, p]));
    const items: PlanItem[] = [];
    for (const b of blocks)
      b.refs.forEach((r, i) => {
        const p = byRef.get(r);
        if (p) items.push({ ...p, at: i === 0 ? b.start : null, done: p.done || doneRefs.has(r) });
      });
    const next: Plan = { date, sentAt: at, start: blocks[0]?.start ?? hours.start, items };
    onPlan(next);
    if (!live) return "Example agent: in your account this goes to your calendar and to ONE GO.";
    const send = (url: string, body: unknown) => fetch(url, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.ok).catch(() => false);
    const [dayOk, planOk] = await Promise.all([send(dayUrl, dayPutBody(date, blocks)), send(planUrl, putBody(next))]);
    if (dayOk) return "Done. Your day is on your calendar and in ONE GO.";
    if (planOk) return "Sent to ONE GO. Your calendar follows once ONE GO's calendar update is live.";
    return "Kept on this computer. Your phone and calendar get it once ONE GO's update is live.";
  };

  return { date, now, hours, busy, plan, approvedAt: (move?.approvedAt ?? approved?.at) || null, fromMove: !!move, customs, addBlock, removeBlock, approve, replan: unapprove };
}
