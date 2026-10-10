import { MOVE_URL } from "./host.ts";
import type { GraphEdge, GraphNode } from "./graph/types.ts";

// VIP-SUMMARY §3aa (v1.63, 10 Oct; Pulse roadmap #20): Market Pulse, the sixth monthly touch. On the 1st ONE MOVE
// fills one fixed note per VIP from ONE Property's month for their zip (no AI until URE answers question 2); the agent
// reads the exact text and sends it. The Brain draws the orb (yellow from the 1st until every note is sent) and the
// list. Nothing is sent unless the agent presses Send (or switched the Autopilot worker on in ONE MOVE).

export const MARKET_NODE = "move-market-pulse";
export const marketPulseUrl = `${MOVE_URL}/api/brain/market-pulse`;
export const marketSendUrl = `${MOVE_URL}/api/brain/market-pulse/send`;

export interface Numbers { new: number | null; pending: number | null; sold: number | null; dom: number | null; monthsSupply: number | null; medianList: number | null }
export interface Vip { id: string; name: string; email: string | null; note: string; sentAt: string | null }
export interface Area { area: string; label: string; numbers: Numbers; periodLine: string; credit: string; vips: Vip[] }
/** `month` is the finished month the numbers cover (September's numbers, sent in October). */
export interface MarketPulse { month: string; ready: boolean; areas: Area[]; missing: { id: string; name: string }[] }

const str = (v: unknown, max = 200): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Keep only well-formed parts; a wrong shape is refused (null: no orb). A VIP without a note is left out. */
export function readMarketPulse(raw: unknown): MarketPulse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const month = str(r.month, 10);
  if (!month || !/^\d{4}-\d{2}/.test(month) || !Array.isArray(r.areas)) return null;
  const areas: Area[] = [];
  for (const a of r.areas as unknown[]) {
    if (!a || typeof a !== "object") continue;
    const o = a as Record<string, unknown>;
    const area = str(o.area, 60);
    if (!area) continue;
    const n = (o.numbers ?? {}) as Record<string, unknown>;
    const vips: Vip[] = Array.isArray(o.vips)
      ? (o.vips as unknown[]).flatMap((v) => {
          if (!v || typeof v !== "object") return [];
          const x = v as Record<string, unknown>;
          const id = str(x.id, 80);
          const name = str(x.name, 120);
          const note = str(x.note, 2000);
          if (!id || !name || !note) return [];
          return [{ id, name, email: str(x.email, 200), note, sentAt: str(x.sent_at, 40) }];
        })
      : [];
    areas.push({
      area,
      label: str(o.label, 80) ?? area,
      numbers: { new: num(n.new), pending: num(n.pending), sold: num(n.sold), dom: num(n.dom), monthsSupply: num(n.months_supply), medianList: num(n.median_list) },
      periodLine: str(o.period_line, 300) ?? "",
      credit: str(o.credit, 300) ?? "",
      vips,
    });
  }
  const missing = Array.isArray(r.missing_address)
    ? (r.missing_address as unknown[]).flatMap((m) => {
        if (!m || typeof m !== "object") return [];
        const x = m as Record<string, unknown>;
        return str(x.id, 80) && str(x.name, 120) ? [{ id: str(x.id, 80)!, name: str(x.name, 120)! }] : [];
      })
    : [];
  return { month: month.slice(0, 7), ready: r.ready === true, areas, missing };
}

export const allVips = (m: MarketPulse) => m.areas.flatMap((a) => a.vips);
export const toSend = (m: MarketPulse) => allVips(m).filter((v) => !v.sentAt);

/** "October 2026" for "2026-10". */
export function monthWords(month: string): string {
  return new Date(`${month}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** The few numbers worth a line, in plain words: "61 new · 48 under contract · 21 days on market". */
export function numbersLine(n: Numbers): string {
  const parts: string[] = [];
  if (n.new != null) parts.push(`${n.new} new`);
  if (n.pending != null) parts.push(`${n.pending} under contract`);
  if (n.sold != null) parts.push(`${n.sold} sold`);
  if (n.dom != null) parts.push(`${n.dom} days on market`);
  if (n.monthsSupply != null) parts.push(`${n.monthsSupply} months of supply`);
  return parts.join(" · ");
}

/** The note as sent: the agent's template, then the period and source lines exactly as ONE Property gave them. */
export function fullNote(v: Vip, a: Area): string {
  return [v.note, a.periodLine, a.credit].filter(Boolean).join("\n\n");
}

export const sendBody = (contactId: string) => ({ contact_id: contactId, channel: "email" as const });

/** The month after one note is sent, before ONE MOVE answers again. */
export function withSent(m: MarketPulse, contactId: string, at: string): MarketPulse {
  return { ...m, areas: m.areas.map((a) => ({ ...a, vips: a.vips.map((v) => (v.id === contactId && !v.sentAt ? { ...v, sentAt: at } : v)) })) };
}

/** The Market Pulse orb under ONE MOVE: yellow while notes wait (§3aa.7), a still ring once all are sent. */
export function withMarketPulseNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, m: MarketPulse | null): G {
  const move = g.nodes.find((n) => n.id === "move");
  const nodes = g.nodes.filter((n) => n.id !== MARKET_NODE);
  const edges = g.edges.filter((e) => e.target !== MARKET_NODE);
  if (!move || move.locked || !m) return { ...g, nodes, edges };
  const all = allVips(m);
  const left = toSend(m).length;
  nodes.push({
    id: MARKET_NODE,
    type: "feature",
    label: "Market Pulse",
    secondaryLabel: !m.ready ? "Starts when the MLS feed is live" : left ? `${left} of ${all.length} to send · ${monthWords(m.month)}` : all.length ? `All ${all.length} sent · ${monthWords(m.month)}` : "No VIPs with an area yet",
    parentId: "move",
    product: "move",
    importance: m.ready && left ? 0.96 : 0.55,
    status: m.ready && left ? "attention" : m.ready && all.length ? "healthy" : undefined,
    summary: "Each VIP's own market, once a month, ready for you to send. The sixth monthly touch.",
  });
  edges.push({ id: `move>${MARKET_NODE}`, source: "move", target: MARKET_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

/** The finished month before `today` ("2026-09" on 10 Oct 2026): the month the numbers cover. */
export function lastMonth(today: string): string {
  const [y, m] = today.slice(0, 7).split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** The example agent's month: two zips, five VIPs, two already sent this month, one VIP with no address. */
export function demoMarketPulse(today: string): MarketPulse {
  const month = lastMonth(today);
  const sent = today.slice(0, 7);
  const note = (first: string, place: string) =>
    `Hi ${first}, here is what ${place} did last month: 61 new listings, 48 went under contract, and homes sold in 21 days on average. Want the details for your street?\n\nParry`;
  const period = `For the period ${monthWords(month)}. Figures are for the month shown and may change.`;
  const credit = "Source: UtahRealEstate.com. Information deemed reliable but not guaranteed.";
  return readMarketPulse({
    month,
    ready: true,
    areas: [
      { area: "84020", label: "Draper 84020", numbers: { new: 61, pending: 48, sold: 39, dom: 21, months_supply: 2.4, median_list: 715000 }, period_line: period, credit,
        vips: [
          { id: "r1", name: "Jane Smith", email: "jane@example.com", note: note("Jane", "Draper 84020"), sent_at: null },
          { id: "r3", name: "Sara Lee", email: "sara@example.com", note: note("Sara", "Draper 84020"), sent_at: `${sent}-02T16:00:00Z` },
          { id: "r6", name: "Dave Ortiz", email: null, note: note("Dave", "Draper 84020"), sent_at: null },
        ] },
      { area: "84092", label: "Sandy 84092", numbers: { new: 44, pending: 37, sold: 31, dom: 18, months_supply: 2.1, median_list: 649000 }, period_line: period, credit,
        vips: [
          { id: "r2", name: "Mike Torres", email: "mike@example.com", note: note("Mike", "Sandy 84092"), sent_at: null },
          { id: "r5", name: "Linda Park", email: "linda@example.com", note: note("Linda", "Sandy 84092"), sent_at: `${sent}-01T15:30:00Z` },
        ] },
    ],
    missing_address: [{ id: "r7", name: "Amy Chen" }],
  })!;
}
