import { MOVE_URL } from "./host.ts";
import type { GraphEdge, GraphNode } from "./graph/types.ts";

// VIP-SUMMARY §3ab (v1.65, 10 Oct; Pulse roadmap #24): past clients likely to move. ONE Property sets the level from
// property facts only (years since the last sale, listed and not sold, area turnover) and labels it "Suggested". The
// agent's own life-event notes show beside it and never raise it (family status is a protected class). Only the agent
// sees this; it is never sent to the contact or shown to a coach or team. No pulse: it is a nudge, not a deadline.

export const LIKELY_NODE = "move-likely";
export const moveLikelyUrl = `${MOVE_URL}/api/brain/move-likely`;
export const notUsefulUrl = `${MOVE_URL}/api/brain/move-likely/not-useful`;

export type Level = "high" | "medium" | "low";
export interface Person { contactId: string; name: string; level: Level | null; label: string; reasons: string[]; youNoted: { event: string; at: string }[] }
export interface MoveLikely { ready: boolean; updatedAt: string | null; people: Person[]; lowCount: number; missingHome: { contactId: string; name: string }[] }

const str = (v: unknown, max = 200): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const LEVELS: Level[] = ["high", "medium", "low"];
const RANK: Record<string, number> = { high: 0, medium: 1, none: 2, low: 3 };

/** Keep only well-formed parts; a wrong shape is refused (null: no orb). */
export function readMoveLikely(raw: unknown): MoveLikely | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.people)) return null;
  const people: Person[] = (r.people as unknown[]).flatMap((p) => {
    if (!p || typeof p !== "object") return [];
    const o = p as Record<string, unknown>;
    const contactId = str(o.contact_id, 80);
    const name = str(o.name, 120);
    if (!contactId || !name) return [];
    const level = LEVELS.includes(o.level as Level) ? (o.level as Level) : null;
    const reasons = Array.isArray(o.reasons) ? (o.reasons as unknown[]).map((x) => str(x, 120)).filter((x): x is string => !!x).slice(0, 5) : [];
    const youNoted = Array.isArray(o.you_noted)
      ? (o.you_noted as unknown[]).flatMap((x) => {
          if (!x || typeof x !== "object") return [];
          const e = str((x as Record<string, unknown>).event, 40);
          const at = str((x as Record<string, unknown>).at, 40);
          return e && at ? [{ event: e, at }] : [];
        })
      : [];
    return [{ contactId, name, level, label: str(o.label, 30) ?? "Suggested", reasons, youNoted }];
  });
  people.sort((a, b) => RANK[a.level ?? "none"] - RANK[b.level ?? "none"] || a.name.localeCompare(b.name));
  const missingHome = Array.isArray(r.missing_home)
    ? (r.missing_home as unknown[]).flatMap((m) => {
        if (!m || typeof m !== "object") return [];
        const o = m as Record<string, unknown>;
        return str(o.contact_id, 80) && str(o.name, 120) ? [{ contactId: str(o.contact_id, 80)!, name: str(o.name, 120)! }] : [];
      })
    : [];
  const low = typeof r.low_count === "number" && Number.isFinite(r.low_count) ? Math.max(0, Math.round(r.low_count)) : 0;
  return { ready: r.ready === true, updatedAt: str(r.updated_at, 40), people, lowCount: low, missingHome };
}

/** "High", "Medium", "Low", or "No MLS history yet" when ONE Property has no record of the house. */
export const levelWord = (l: Level | null) => (l ? l[0].toUpperCase() + l.slice(1) : "No MLS history yet");

const EVENT_WORD: Record<string, string> = { baby: "new baby", wedding: "wedding", new_job: "new job", retirement: "retiring", empty_nest: "kids left home", new_home: "new home", loss: "a loss", hard_time: "a hard time" };
/** "you noted: new baby" from the agent's own notes (§3y); shown beside the level, never in it. */
export const notedLine = (p: Person) => (p.youNoted.length ? `you noted: ${p.youNoted.map((n) => EVENT_WORD[n.event] ?? n.event.replace(/_/g, " ")).join(", ")}` : null);

/** The touch: a check-in, never a pitch. */
export const touchLine = (p: Person) => `Check in with ${p.name.split(" ")[0]}: ask how the house is working for them now. No pitch.`;

/** People after "Not useful" (hidden 90 days by ONE MOVE), before it answers again. */
export const withoutPerson = (m: MoveLikely, contactId: string): MoveLikely => ({ ...m, people: m.people.filter((p) => p.contactId !== contactId) });

/** The orb under ONE MOVE: a gold opportunity dot when someone is High; never a pulse. */
export function withMoveLikelyNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, m: MoveLikely | null): G {
  const move = g.nodes.find((n) => n.id === "move");
  const nodes = g.nodes.filter((n) => n.id !== LIKELY_NODE);
  const edges = g.edges.filter((e) => e.target !== LIKELY_NODE);
  if (!move || move.locked || !m) return { ...g, nodes, edges };
  const high = m.people.filter((p) => p.level === "high").length;
  const medium = m.people.filter((p) => p.level === "medium").length;
  nodes.push({
    id: LIKELY_NODE,
    type: "feature",
    label: "Likely to move",
    secondaryLabel: !m.ready ? "Starts when the MLS feed is live" : high || medium ? [high ? `${high} high` : null, medium ? `${medium} medium` : null].filter(Boolean).join(" · ") + " · past clients" : "No past clients flagged",
    parentId: "move",
    product: "move",
    importance: m.ready && high ? 0.85 : 0.5,
    status: m.ready && high ? "opportunity" : undefined,
    summary: "Past clients whose homes suggest a move may be coming, from the home's facts only. A nudge to check in; only you see it.",
  });
  edges.push({ id: `move>${LIKELY_NODE}`, source: "move", target: LIKELY_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

/** The example agent's past clients. */
export function demoMoveLikely(): MoveLikely {
  return readMoveLikely({
    ready: true,
    updated_at: "2026-10-06T08:00:00Z",
    people: [
      { contact_id: "r6", name: "Dave Ortiz", level: "high", label: "Suggested", reasons: ["owned 11 years", "area turnover high"], you_noted: [{ event: "empty_nest", at: "2026-09-10" }] },
      { contact_id: "r3", name: "Sara Lee", level: "medium", label: "Suggested", reasons: ["owned 8 years"], you_noted: [{ event: "wedding", at: "2026-09-20" }] },
      { contact_id: "r9", name: "Tom Becker", level: "high", label: "Suggested", reasons: ["listed and not sold in the last 2 years", "owned 6 years"], you_noted: [] },
      { contact_id: "r8", name: "Kim Nguyen", level: null, label: "Suggested", reasons: [], you_noted: [] },
    ],
    low_count: 14,
    missing_home: [{ contact_id: "r7", name: "Amy Chen" }],
  })!;
}
