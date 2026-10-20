import type { GraphEdge, GraphNode } from "./graph/types.ts";
import { needsOf } from "./needs.ts";
import { CALENDAR_NODE, PLAN_NODE } from "./plan.ts";
import { POWER_NODE } from "./powerHour.ts";
import { HABITS_NODE } from "./habits.ts";
import { WEEK_NODE } from "./commitments.ts";
import { REVIEW_NODE } from "./review.ts";
import { CHALLENGE_NODE, GOALS_NODE, SCORE_NODE } from "./oneYou.ts";
import { REFERRALS_NODE } from "./referrals.ts";
import { COACH_NODE } from "./coach.ts";
import { REVIEW_CALLS_NODE } from "./reviewCalls.ts";
import { ADS_NODE } from "./siteAlerts.ts";
import { GROWTH_NODE } from "./growthOrb.ts";
import { ASK_AI_NODE } from "./aiCheck.ts";
import { movePageId } from "./moveMenu.ts";

// ONE YOU in groups (Parry, 19 Oct: "yes on your plan for one you. and hot/warm/cold under today"). The 14 tools round
// ONE YOU become Today, This week and Goals, plus Coaching for a coach. Your ads moves under ONE GROWTH; Ask AI about you
// moves to My Profile. Each tool keeps its own builder, id, data and what it opens: this pass only moves them into their
// group, last, after every builder has run (components/brain/Brain.tsx runs it on every graph it sets). A group orb has no
// need of its own: lib/needs.ts adds up its tools, so it pulses with the most urgent of them and carries their count, and
// ONE YOU's total stays the sum of the same tools.

export const TODAY_GROUP = "you-today";
export const WEEK_GROUP = "you-week";
export const GOALS_GROUP = "you-goals";
export const COACHING_GROUP = "you-coaching";

/** Hot/Warm/Cold: ONE MOVE's page orb on a signed-in map, the example agent's own orb on the demo. */
export const HWC_IDS = [movePageId("/hot-warm-cold"), "move-9"] as const;

export type YouGroupKey = "today" | "week" | "goals" | "coaching";
export interface YouGroup {
  key: YouGroupKey;
  id: string;
  label: string;
  /** The tools inside, in their order round the group. */
  kids: readonly string[];
  importance: number;
  summary: string;
}

export const YOU_GROUPS: readonly YouGroup[] = [
  {
    key: "today",
    id: TODAY_GROUP,
    label: "Today",
    kids: [PLAN_NODE, CALENDAR_NODE, POWER_NODE, "go-today", HABITS_NODE, ...HWC_IDS],
    importance: 1.1,
    summary: "Your day: Plan my day, your Calendar, Power Hour, today's VIP touches, your habits and Hot/Warm/Cold.",
  },
  {
    key: "week",
    id: WEEK_GROUP,
    label: "This week",
    kids: [WEEK_NODE, REVIEW_NODE, SCORE_NODE],
    importance: 1.09,
    summary: "Your week: your commitments, the Weekly Review and the Scoreboard.",
  },
  {
    key: "goals",
    id: GOALS_GROUP,
    label: "Goals",
    kids: [GOALS_NODE, REFERRALS_NODE, CHALLENGE_NODE],
    importance: 1.08,
    summary: "Your year: your goals and pace, your referrals and the 90-Day Challenge.",
  },
  {
    key: "coaching",
    id: COACHING_GROUP,
    label: "Coaching",
    kids: [COACH_NODE, REVIEW_CALLS_NODE],
    importance: 1.07,
    summary: "The agents you coach, and the review calls for the done-for-you add-ons.",
  },
];

export const YOU_GROUP_IDS: ReadonlySet<string> = new Set(YOU_GROUPS.map((g) => g.id));
export const isYouGroup = (id: string) => YOU_GROUP_IDS.has(id);

/** The group a ONE YOU tool sits in, or null. */
export function groupOf(id: string): YouGroup | null {
  return YOU_GROUPS.find((g) => g.kids.includes(id)) ?? null;
}

const things = (n: number) => `${n} ${n === 1 ? "thing needs" : "things need"} you`;

/** The line under a group orb, in the subs' own style. `behind`: goals behind pace (Goals only). */
export function groupLine(key: YouGroupKey, count: number, behind = 0): string {
  if (key === "today") return count ? things(count) : "All done today";
  if (key === "week") return count ? things(count) : "Your week is on track";
  if (key === "goals") return !count ? "On pace" : behind === count ? `${behind} behind pace` : things(count);
  return count ? things(count) : "All good";
}

/**
 * Put ONE YOU's tools in their groups. Idempotent: run it on any graph, as often as it is set. A group shows only while
 * one of its tools is on the map (Coaching: only for a coach, or an admin with Review calls, so neither tool is lost).
 */
export function groupOneYou<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G): G {
  const go = g.nodes.find((n) => n.id === "go");
  // Ask AI about you lives in My Profile now (Parry, 19 Oct): never an orb.
  let nodes = g.nodes.filter((n) => !isYouGroup(n.id) && n.id !== ASK_AI_NODE);
  let edges = g.edges.filter((e) => !isYouGroup(e.source) && !isYouGroup(e.target) && e.target !== ASK_AI_NODE);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const parentOf = new Map<string, string>();
  // Your ads goes under ONE GROWTH; without an open Growth orb it stays where it was, so it is never lost.
  const growth = byId.get(GROWTH_NODE);
  if (byId.has(ADS_NODE) && growth && !growth.locked) parentOf.set(ADS_NODE, GROWTH_NODE);
  if (go && !go.locked) {
    const listed = new Set(YOU_GROUPS.flatMap((x) => x.kids));
    for (const grp of YOU_GROUPS) {
      // a tool already inside another listed tool (the walk-through's page orb inside the example Hot/Warm/Cold) stays there
      const here = grp.kids.filter((id) => {
        const n = byId.get(id);
        return n && !(n.parentId && listed.has(n.parentId) && byId.has(n.parentId));
      });
      if (!here.length) continue;
      nodes.push({ id: grp.id, type: "category", label: grp.label, parentId: "go", product: "go", importance: grp.importance, summary: grp.summary });
      for (const id of here) parentOf.set(id, grp.id);
    }
  }
  if (parentOf.size) {
    nodes = nodes.map((n) => {
      const p = parentOf.get(n.id);
      if (!p) return n;
      const order = groupOf(n.id)?.kids.indexOf(n.id) ?? -1;
      return {
        ...n,
        parentId: p,
        // the group's own order round it; the Growth pieces keep theirs, with Your ads first while something needs it
        importance: order >= 0 ? 1 - order * 0.03 : n.importance,
        product: p === GROWTH_NODE ? "growth" : n.product,
      };
    });
    const moved = new Set(parentOf.keys());
    edges = edges.filter((e) => !(e.relationshipType === "belongs_to" && moved.has(e.target)));
    for (const [id, p] of parentOf) edges.push({ id: `${p}>${id}`, source: p, target: id, relationshipType: "belongs_to", strength: 1 });
    for (const grp of YOU_GROUPS) if (nodes.some((n) => n.id === grp.id)) edges.push({ id: `go>${grp.id}`, source: "go", target: grp.id, relationshipType: "belongs_to", strength: 1 });
  }
  // the groups' line: what their tools add up to (their pulse, red beats yellow beats green, is lib/needs.ts's)
  const needs = needsOf(nodes);
  nodes = nodes.map((n) => {
    const grp = YOU_GROUPS.find((x) => x.id === n.id);
    if (!grp) return n;
    const need = needs.get(n.id);
    const behind = grp.key === "goals" ? nodes.filter((k) => k.parentId === GOALS_NODE && k.type === "goal" && k.status === "attention").length : 0;
    // no status of its own: its pulse and colour come from lib/needs.ts (so a group is never one of "Today's three")
    return { ...n, secondaryLabel: groupLine(grp.key, need?.count ?? 0, behind) };
  });
  return { ...g, nodes, edges };
}
