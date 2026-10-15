import type { GraphEdge, GraphNode } from "./graph/types.ts";

// REZEN.md §3a (Parry, 14 Oct): what the agent ticked to pass through from reZEN, as a reZEN orb under ONE YOU with two
// inside it (ONE YOU's ring is full, so one orb there, not two). Revenue
// share: paid, pending and the last 12 months. My network: its size by tier and the front line (names and status only).
// Both quiet green: money and network never nag. They show only once that box has come through.

export const REZEN_NODE = "go-rezen";
export const REVSHARE_NODE = "go-revshare";
export const NETWORK_NODE = "go-network";

export interface RevMonth { label: string; earnings: number }
export interface Revshare { paid: number | null; pending: number | null; contributions: number | null; months: RevMonth[]; readAt: string | null }
export interface FrontAgent { name: string; status: string | null; since: string | null; network: number | null }
export interface Network { total: number | null; tiers: { tier: number; size: number }[]; front: FrontAgent[]; readAt: string | null }

type O = Record<string, unknown>;
const obj = (v: unknown): O | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as O) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown, max = 80) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const list = (v: unknown): O[] => (Array.isArray(v) ? v.map(obj).filter((x): x is O => !!x) : []);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function box(read: unknown, key: string): { data: O; at: string | null } | null {
  const b = obj(obj(read)?.[key]);
  const data = obj(b?.data);
  return data ? { data, at: str(b?.read_at, 40) } : null;
}

/** The revenue share box from GET /api/brain/rezen's `read`, or null when it has not come through. */
export function readRevshare(read: unknown): Revshare | null {
  const b = box(read, "revshare");
  if (!b) return null;
  const months = list(b.data.months)
    .map((m) => ({ y: num(m.year), m: num(m.month), e: num(m.earnings) }))
    .filter((m): m is { y: number; m: number; e: number } => m.y !== null && m.m !== null && m.m >= 1 && m.m <= 12 && m.e !== null)
    .sort((a, b) => a.y - b.y || a.m - b.m)
    .slice(-12)
    .map((m) => ({ label: `${MONTHS[m.m - 1]} ${String(m.y).slice(2)}`, earnings: m.e }));
  return { paid: num(b.data.paid), pending: num(b.data.pending), contributions: num(b.data.pending_contributions), months, readAt: b.at };
}

/** The network box, or null. Front line: names and status only, the agent's own sponsor tree. */
export function readNetwork(read: unknown): Network | null {
  const b = box(read, "network");
  if (!b) return null;
  return {
    total: num(b.data.total),
    tiers: list(b.data.tiers).map((t) => ({ tier: num(t.tier), size: num(t.size) })).filter((t): t is { tier: number; size: number } => t.tier !== null && t.size !== null).sort((a, b) => a.tier - b.tier),
    front: list(b.data.front_line).map((a) => ({ name: str(a.name) ?? "", status: str(a.status, 30), since: str(a.since, 40), network: num(a.network) })).filter((a) => a.name).slice(0, 60),
    readAt: b.at,
  };
}

export const dollars = (n: number | null) => (n === null ? "—" : `$${Math.round(n).toLocaleString("en-US")}`);

export function revLine(r: Revshare): string {
  return [`${dollars(r.paid)} paid`, r.pending ? `${dollars(r.pending)} pending` : null].filter(Boolean).join(" · ");
}

export function netLine(n: Network): string {
  const active = n.front.filter((a) => (a.status ?? "").toUpperCase() === "ACTIVE").length;
  return [n.total !== null ? `${n.total} ${n.total === 1 ? "agent" : "agents"}` : null, n.front.length ? `${active} of ${n.front.length} front line active` : null].filter(Boolean).join(" · ") || "Your network";
}

export function withRezenNodes<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, r: Revshare | null, n: Network | null): G {
  const mine = (id: string) => id === REZEN_NODE || id === REVSHARE_NODE || id === NETWORK_NODE;
  const nodes = g.nodes.filter((x) => !mine(x.id));
  const edges = g.edges.filter((e) => !mine(e.target));
  const go = g.nodes.find((x) => x.id === "go");
  if (!go || go.locked || (!r && !n)) return { ...g, nodes, edges };
  nodes.push({
    id: REZEN_NODE, type: "feature", label: "reZEN", secondaryLabel: [r ? revLine(r) : null, n ? netLine(n) : null].filter(Boolean).join(" · "),
    parentId: "go", product: "go", importance: 0.95, status: "healthy",
    summary: "What you chose to bring in from reZEN in My Profile: revenue share and your network. Read only.",
  });
  edges.push({ id: `go>${REZEN_NODE}`, source: "go", target: REZEN_NODE, relationshipType: "belongs_to", strength: 0.8 });
  const add = (id: string, label: string, line: string, summary: string) => {
    nodes.push({ id, type: "feature", label, secondaryLabel: line, parentId: REZEN_NODE, product: "go", importance: 0.8, status: "healthy", summary });
    edges.push({ id: `${REZEN_NODE}>${id}`, source: REZEN_NODE, target: id, relationshipType: "belongs_to", strength: 0.8 });
  };
  if (r) add(REVSHARE_NODE, "Revenue share", revLine(r), "From reZEN, as you chose in My Profile: what is paid, what is pending, month by month.");
  if (n) add(NETWORK_NODE, "My network", netLine(n), "From reZEN, as you chose in My Profile: your network by tier and your front line. Names and status only.");
  return { ...g, nodes, edges };
}

export const demoRezenRead = () => ({
  revshare: { read_at: "2026-10-14T20:00:00Z", data: { paid: 4820, pending: 610, pending_contributions: 3, months: [{ year: 2026, month: 7, earnings: 380 }, { year: 2026, month: 8, earnings: 455 }, { year: 2026, month: 9, earnings: 520 }] } },
  network: { read_at: "2026-10-14T20:00:00Z", data: { total: 14, tiers: [{ tier: 1, size: 5 }, { tier: 2, size: 9 }], front_line: [{ name: "Jen Alvarez", status: "ACTIVE", since: "2025-03-01", network: 4 }, { name: "Dave Ruiz", status: "INACTIVE", since: "2025-09-12", network: 0 }] } },
});
