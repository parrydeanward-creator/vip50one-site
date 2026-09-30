import { candidates, rulesAnswer } from "./ask.ts";
import { pathTo, type GraphIndex } from "./graph/model.ts";
import type { ChangeNote } from "./graph/types.ts";

// The morning fly-through and "Since you were last here" (ONE-BRAIN.md §4):
// which three things the camera visits, whether this is the first visit of the
// day, and which orbs ring out because something changed. No drawing here.

export const TOUR_STOPS = 3;
const TZ = "America/Denver"; // agents' local day until agent time zones exist (VIP-SUMMARY §2)

// Today's top three: the people and items ONE already recommends, then what
// needs the agent most. Same facts as the morning note and Ask ONE.
export function morningTop(ix: GraphIndex, n = TOUR_STOPS): string[] {
  const ok = new Set(candidates(ix).map((c) => c.id));
  const out: string[] = [];
  const add = (id: string | undefined) => {
    if (id && ok.has(id) && !out.includes(id)) out.push(id);
  };
  for (const node of ix.graph.nodes) for (const r of node.recommendations ?? []) add(r.targetId);
  for (const r of rulesAnswer("What needs my attention today?", ix).results) add(r.id);
  return out.slice(0, n);
}

export function localDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

// The fly-through plays on the first visit of each local day.
export function firstVisitToday(lastVisit: string | null, now: Date): boolean {
  if (!lastVisit) return true;
  const last = new Date(lastVisit);
  if (Number.isNaN(last.getTime())) return true;
  return localDay(last) !== localDay(now);
}

// What changed since the last visit, newest first. With no previous visit,
// everything the products flagged counts.
export function changesSince(changes: ChangeNote[] | undefined, lastVisit: string | null, ix: GraphIndex): ChangeNote[] {
  const since = lastVisit ? new Date(lastVisit).getTime() : 0;
  return (changes ?? [])
    .filter((c) => ix.byId.has(c.id) && (!since || Number.isNaN(since) || new Date(c.at).getTime() > since))
    .sort((a, b) => b.at.localeCompare(a.at));
}

// The product orbs to ring on the top-level map: the product each change came
// from, once each, if the agent has it.
export function orbsToPing(changes: ChangeNote[], ix: GraphIndex): string[] {
  const out: string[] = [];
  for (const c of changes) {
    const orb = ix.byId.get(c.product);
    if (orb && orb.type === "product" && !orb.locked && !out.includes(orb.id)) out.push(orb.id);
  }
  return out;
}

// The product orb a node sits under (for the caption's colour and name).
export function productOf(ix: GraphIndex, id: string): string | undefined {
  return pathTo(ix, id).find((n) => n.type === "product")?.id;
}

// "Since yesterday at 6:12 PM" style label for the panel.
export function sinceLabel(lastVisit: string | null, now: Date): string {
  if (!lastVisit) return "Since yesterday";
  const d = new Date(lastVisit);
  if (Number.isNaN(d.getTime())) return "Since yesterday";
  const time = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(d);
  const day = localDay(d), today = localDay(now);
  const yesterday = localDay(new Date(now.getTime() - 86400_000));
  if (day === today) return `Since ${time} today`;
  if (day === yesterday) return `Since yesterday at ${time}`;
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long" }).format(d);
  return `Since ${wd} at ${time}`;
}
