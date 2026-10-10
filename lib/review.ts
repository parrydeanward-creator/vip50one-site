import { GROUP_TITLE, groupOf, type Win } from "./wins.ts";
import { mondayOf } from "./habits.ts";
import { reportLine, unseen, type PulseReport } from "./pulseReport.ts";
import type { GraphEdge, GraphNode } from "./graph/types.ts";
import { MONTH_BOXES } from "./contact.ts";
import { audit } from "./audit.ts";
import type { Commitments } from "./commitments.ts";
import type { VipPerson, VipRoster } from "./vips.ts";

// Weekly Review in ONE YOU (PULSE-ROADMAP "ONE YOU"; Parry approved, 6 Oct): the week in one place on the
// desktop. The score against the 100 minimum, the VIP touches falling behind, the VIP-50 not reached this
// month, commitments kept, goal pace, and three things for next week that Pulse writes from those facts.
// Facts only: nothing here is sent to anyone, and Pulse never marks anything done.

export const REVIEW_NODE = "go-review";
export const WEEK_MINIMUM = 100; // Parry, 30 Sep: the weekly standard is 100 (was 150)

export type ReviewKey = "score" | "wins" | "pulse" | "touches" | "untouched" | "commitments" | "goals";
export type Level = "now" | "today" | null;

export interface Goal {
  label: string;
  line: string; // "3 of 12"
  behind: boolean;
  pace?: string | null; // "On pace for this point in the year: 4"
}

export interface ReviewIn {
  today: string; // YYYY-MM-DD, Mountain
  week: { score: number; minimum: number } | null;
  roster: VipRoster | null;
  commitments: Commitments | null;
  goals: Goal[];
  /** Wins (§3t), when ONE MOVE answers; the review shows this week's (PULSE-ROADMAP relationship #8). */
  wins?: Win[] | null;
  /** "Pulse did this" (LEADS §6.1), when ONE MOVE answers. */
  pulse?: PulseReport | null;
}

export interface Card {
  key: ReviewKey;
  title: string;
  big: string; // what the orb shows
  line: string; // one line under it
  level: Level; // red now / yellow today / still green (null and good) — the pulse rule
  good: boolean;
  rows: { text: string; sub?: string }[]; // the side panel
}

export interface Review {
  cards: Card[];
  next: string[]; // three things for next week, facts only
}

const first = (p: VipPerson) => (p.first_name?.trim() || p.name.split(/\s+/)[0] || p.name).slice(0, 30);
const names = (ps: VipPerson[], n = 3) => {
  const shown = ps.slice(0, n).map(first);
  const more = ps.length - shown.length;
  return more > 0 ? `${shown.join(", ")} and ${more} more` : shown.length > 1 ? `${shown.slice(0, -1).join(", ")} and ${shown.at(-1)}` : shown[0] ?? "";
};

/** How far through the month today is, 0..1 (a touch "falls behind" when it trails this). */
export function monthShare(today: string): number {
  const [y, m, d] = today.split("-").map(Number);
  if (!y || !m || !d) return 0;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Math.min(1, d / days);
}

/** Oldest last touch first; never-touched first of all. */
const byOldest = (a: VipPerson, b: VipPerson) => (a.last_touch_on ?? "").localeCompare(b.last_touch_on ?? "");

const ONE_OF: Record<string, string> = { Closings: "Closing", Referrals: "Referral", "Five-star reviews": "Five-star review", "Weeks at 100": "Week at 100", Badges: "Badge", "Goals reached": "Goal reached" };

export function review(i: ReviewIn): Review {
  const cards: Card[] = [];
  const next: string[] = [];

  // The weekly score against the minimum (daily + weekly tracker points; Parry, 30 Sep).
  if (i.week) {
    const { score, minimum } = i.week;
    const gap = Math.max(0, minimum - score);
    cards.push({
      key: "score",
      title: "Weekly score",
      big: String(score),
      line: gap ? `${gap} short of ${minimum}` : `Above the ${minimum} minimum`,
      level: gap ? "today" : null,
      good: !gap,
      rows: [
        { text: `${score} points this week`, sub: `The minimum is ${minimum}: daily tracker points plus the weekly bonus boxes.` },
        gap ? { text: `${gap} to go`, sub: "Each daily box and weekly bonus box counts toward it." } : { text: "Minimum reached", sub: "Everything above it is extra." },
      ],
    });
  }

  // VIP-50 touches this month: the ones falling behind the month, and who has had none at all.
  if (i.roster && i.roster.vip50.length) {
    const a = audit(i.roster);
    const share = monthShare(i.today);
    const month = a.touches.filter((t) => t.kind === "month");
    const behind = month.filter((t) => t.total && t.done / t.total < share).sort((x, y) => x.done / x.total - y.done / y.total);
    cards.push({
      key: "touches",
      title: "VIP touches",
      big: `${Math.round(a.coverage * 100)}%`,
      line: behind.length ? `${behind.length} ${behind.length === 1 ? "touch is" : "touches are"} behind the month` : "Every touch is keeping pace",
      level: behind.length ? "today" : null,
      good: !behind.length,
      rows: month.map((t) => ({
        text: `${t.label}: ${t.done} of ${t.total}`,
        sub: t.total && t.done / t.total < share ? `Behind: ${Math.round(share * 100)}% of the month has gone` : "Keeping pace",
      })),
    });
    const none = i.roster.vip50.filter((p) => !MONTH_BOXES.some(([k]) => p.month?.[k])).sort(byOldest);
    cards.push({
      key: "untouched",
      title: "Not reached",
      big: String(none.length),
      line: none.length ? `VIP-50 with no touch this month` : "Every VIP-50 touched this month",
      level: none.length && share > 0.5 ? "now" : none.length ? "today" : null,
      good: !none.length,
      rows: none.map((p) => ({ text: p.name, sub: p.last_touch_on ? `Last touch ${p.last_touch_on}` : "No touch on record" })),
    });
    if (none.length) next.push(`Reach the ${none.length} VIP-50 you haven't touched this month, starting with ${names(none)}.`);
    const weakest = behind[0];
    if (weakest && next.length < 3) {
      const left = weakest.missing.length;
      next.push(`${weakest.label}: ${left} of your VIP-50 still need one this month${left ? `, such as ${names([...weakest.missing].sort(byOldest), 2)}` : ""}.`);
    }
  }

  // Commitments: last week's results and the 8-week keep rate (§3n).
  if (i.commitments) {
    const c = i.commitments;
    const lw = c.lastWeek;
    const n = lw ? lw.kept + lw.partly + lw.missed : 0;
    const rate = c.keepRate8w;
    cards.push({
      key: "commitments",
      title: "Commitments",
      big: rate == null ? (n ? `${lw!.kept}/${n}` : "–") : `${Math.round(rate * 100)}%`,
      line: n ? `Last week: ${lw!.kept} kept, ${lw!.partly} partly, ${lw!.missed} missed` : "No week checked in yet",
      level: lw && lw.missed > lw.kept ? "today" : null,
      good: !!n && lw!.missed === 0,
      rows: [
        rate != null ? { text: `You keep ${Math.round(rate * 100)}% of your commitments`, sub: "Over the last 8 weeks." } : { text: "No keep rate yet", sub: "It starts after your first check-in." },
        c.streak ? { text: `${c.streak}-week streak`, sub: "Weeks in a row you checked in." } : { text: "No streak yet" },
        ...(c.week?.items ?? []).map((it) => ({ text: it.text, sub: it.result ? `This week: ${it.result}` : "This week: not checked in" })),
      ],
    });
    if (lw && lw.missed && next.length < 3) next.push(`Set commitments you can keep: last week ${lw.missed} of ${n} were missed.`);
  }

  // Goals: pace for this point in the agent's own goal year.
  if (i.goals.length) {
    const behind = i.goals.filter((g) => g.behind);
    cards.push({
      key: "goals",
      title: "Goals",
      big: behind.length ? `${behind.length} behind` : "On pace",
      line: behind.length ? behind.map((g) => g.label).join(", ") : "Every goal is on pace",
      level: behind.length ? "today" : null,
      good: !behind.length,
      rows: i.goals.map((g) => ({ text: `${g.label}: ${g.line}`, sub: g.pace ?? undefined })),
    });
    if (behind[0] && next.length < 3) next.push(`${behind[0].label} is behind pace (${behind[0].line}).`);
  }

  if (i.week && i.week.score < i.week.minimum && next.length < 3) next.push(`Reach ${i.week.minimum} next week: this week ended at ${i.week.score}.`);
  // This week's wins (§3t): good news only, never a pulse (Parry: "good news never nags").
  if (i.wins) {
    const mon = mondayOf(i.today);
    const mine = i.wins.filter((w) => w.at >= mon && w.at <= i.today).sort((a, b) => b.at.localeCompare(a.at));
    const by = new Map<string, number>();
    for (const w of mine) by.set(GROUP_TITLE[groupOf(w.kind)], (by.get(GROUP_TITLE[groupOf(w.kind)]) ?? 0) + 1);
    const at = cards.findIndex((c) => c.key === "score");
    cards.splice(at + 1, 0, {
      key: "wins",
      title: "Wins",
      big: String(mine.length),
      line: mine.length ? [...by].map(([t, n]) => `${n} ${(n === 1 ? ONE_OF[t] ?? t : t).toLowerCase()}`).join(", ") : "None logged this week yet",
      level: null,
      good: mine.length > 0,
      rows: mine.length ? mine.slice(0, 8).map((w) => ({ text: w.title, sub: w.detail ?? undefined })) : [{ text: "Log a closing or a referral in ONE MOVE and it shows here." }],
    });
  }
  // "Pulse did this" (LEADS §6.1): yellow only while a hand-back is unopened; held sends are listed with their reason.
  if (i.pulse) {
    const p = i.pulse;
    const open = unseen(p);
    cards.push({
      key: "pulse",
      title: "Pulse did this",
      big: String(p.sent),
      line: reportLine(p),
      level: open ? "today" : null,
      good: !open,
      rows: [
        { text: p.summary },
        ...p.handbacks.slice(0, 5).map((h) => ({ text: `Handed back: ${h.contact}, ${h.about.toLowerCase()}`, sub: h.excerpt ? `"${h.excerpt}"` : undefined })),
        ...p.held.map((h) => ({ text: `Held back: ${h.words}`, sub: `${h.count} ${h.count === 1 ? "send" : "sends"}` })),
        ...p.autopilot.slice(0, 5).map((a) => ({ text: `Sent: ${a.contact} (${a.worker})`, sub: a.what ?? undefined })),
        ...(p.touches ? [{ text: p.touches }] : []),
      ],
    });
    if (open && next.length < 3) next.push(`Answer what Pulse handed back: ${p.handbacks.filter((h) => !h.seen).map((h) => h.contact).slice(0, 3).join(", ")}.`);
    if (p.held.some((h) => /brokerage address/i.test(h.words)) && next.length < 3) next.push("Add your brokerage address in My Profile so your marketing emails can go out.");
  }
  if (!next.length) next.push("Keep the same rhythm next week: every number above is on track.");
  return { cards, next: next.slice(0, 3) };
}

/** ONE YOU's Weekly Review orb: pulses with the worst level among its cards. */
export function withReviewNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, r: Review | null): G {
  const go = g.nodes.find((n) => n.id === "go");
  const nodes = g.nodes.filter((n) => n.id !== REVIEW_NODE);
  const edges = g.edges.filter((e) => e.target !== REVIEW_NODE);
  if (!go || go.locked || !r || !r.cards.length) return { ...g, nodes, edges };
  const now = r.cards.filter((c) => c.level === "now").length;
  const today = r.cards.filter((c) => c.level === "today").length;
  nodes.push({
    id: REVIEW_NODE,
    type: "feature",
    label: "Weekly Review",
    secondaryLabel: now + today ? `${now + today} ${now + today === 1 ? "thing needs" : "things need"} you` : "Your week is on track",
    parentId: "go",
    product: "go",
    importance: 1.03,
    status: now ? "action" : today ? "attention" : "healthy",
    summary: "Your week in one place: score, VIP touches, who you haven't reached, commitments and goals, and three things for next week.",
  });
  edges.push({ id: `go>${REVIEW_NODE}`, source: "go", target: REVIEW_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

/** Goals for the review, from ONE YOU's goal orbs (live.ts builds them from vip_summary). */
export function goalsFromGraph(nodes: GraphNode[]): Goal[] {
  return nodes
    .filter((n) => n.parentId === "go-goals" && n.type === "goal" && n.secondaryLabel && n.secondaryLabel !== "No goal set")
    .map((n) => ({ label: n.label, line: n.secondaryLabel!, behind: n.status === "attention", pace: n.pace?.headline ?? null }));
}

/** The demo agent's week, so the sales demo shows a review. */
export function demoRoster(): VipRoster {
  const names = ["Jen Alvarez", "Marcus Lee", "Amy Chen", "Dave Kim", "Sara Ortiz", "Tom Price", "Lena Brooks", "Raj Patel", "Mia Stone", "Cole Hart", "Ana Ruiz", "Ben Fox"];
  const vip50: VipPerson[] = names.map((name, k) => ({
    id: `00000000-0000-4000-8000-${String(k).padStart(12, "0")}`,
    name,
    month: k < 3 ? ({} as Record<string, boolean>) : { call: k % 2 === 0, video_text: k % 3 !== 0, social: true, newsletter: k > 6, mixer: false },
    last_touch_on: k < 3 ? `2026-08-${10 + k}` : `2026-10-0${1 + (k % 5)}`,
  }));
  return { cap: 75, vip50, vip100: [] };
}
