import type { GraphNode } from "./graph/types.ts";
import type { MorningNote } from "./note.ts";

// Morning Pulse on the phone (Pulse roadmap #15, VIP-SUMMARY §3ac): the same morning note the Brain shows, as plain
// text for ONE GO's home card and its 7:00 push. Nothing is sent from here; ONE GO shows it to the agent only.

export interface PhoneMorning {
  date: string;
  title: string;
  lines: string[];
  counts: { red: number; yellow: number };
  link: string;
}

export const MORNING_LINK = "https://www.vip50one.com/dashboard";
const MAX_LINES = 4;
const MAX_LINE = 160;

/** Sentences of the note, at most four, each at most 160 characters; never empty. */
export function noteLines(note: MorningNote): string[] {
  const text = [note.opening, note.note].filter((s) => typeof s === "string" && s.trim()).join(" ").replace(/\s+/g, " ").trim();
  const parts = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [];
  const lines = parts
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.length > MAX_LINE ? `${s.slice(0, MAX_LINE - 1).trimEnd()}…` : s));
  return lines.length ? lines.slice(0, MAX_LINES) : ["Your day is ready."];
}

/** Red (overdue or alert) and yellow (today) as the Brain counts them: leaf orbs only, locked products left out. */
export function needCounts(nodes: readonly GraphNode[]): { red: number; yellow: number } {
  const parents = new Set(nodes.map((n) => n.parentId).filter((p): p is string => !!p));
  let red = 0;
  let yellow = 0;
  for (const n of nodes) {
    if (n.locked || parents.has(n.id) || n.type === "core" || n.type === "product") continue;
    const w = Math.max(1, n.needCount ?? n.dueContacts?.length ?? 0);
    if (n.status === "action") red += w;
    else if (n.status === "attention") yellow += w;
  }
  return { red, yellow };
}

export function phoneMorning(note: MorningNote, nodes: readonly GraphNode[], date: string): PhoneMorning {
  return { date, title: "Morning Pulse", lines: noteLines(note), counts: needCounts(nodes), link: MORNING_LINK };
}
