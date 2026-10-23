import type { GraphEdge, GraphNode, NodeStatus } from "./graph/types.ts";

// One-tap listing launch (PULSE-ROADMAP K21, LAUNCH.md v0.2, agreed 14 Oct). The agent taps Launch once; Marquee,
// Websites, ONE Open and ONE MOVE each draft their own piece, and nothing goes out until the agent approves it there.
// MASTER keeps only the checklist; the Brain reads it from ONE MOVE's GET /api/brain/launch and draws a Launch orb under
// each launched listing. `ready` pulses yellow (a draft waits for the agent), `failed` red, the rest are quiet.

const MOVE_URL = "https://move.vip50one.com";
export const launchUrl = `${MOVE_URL}/api/brain/launch`;
export const listingsUrl = `${MOVE_URL}/api/brain/listings`;

export const PIECES = ["marquee_page", "site_page", "open_house", "ad_draft", "buyer_notes"] as const;
export type PieceKey = (typeof PIECES)[number];
export const STATES = ["requested", "drafting", "ready", "done", "skipped", "failed"] as const;
export type PieceState = (typeof STATES)[number];

export interface LaunchPiece { piece: PieceKey; state: PieceState; openUrl: string | null; note: string | null; updatedAt: string | null }
export interface Launch { id: string; listingRef: string; address: string | null; createdAt: string | null; pieces: LaunchPiece[] }

export const PIECE_NAME: Record<PieceKey, string> = {
  marquee_page: "Marquee page",
  site_page: "On your website",
  open_house: "First open house",
  ad_draft: "Just listed ad",
  buyer_notes: "Notes to your buyers",
};
const OWNER: Record<PieceKey, string> = { marquee_page: "Marquee", site_page: "Your website", open_house: "ONE Open", ad_draft: "Your website", buyer_notes: "ONE MOVE" };

const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const isPiece = (v: unknown): v is PieceKey => (PIECES as readonly unknown[]).includes(v);
const isState = (v: unknown): v is PieceState => (STATES as readonly unknown[]).includes(v);
/** Only https links to our own products or a member site; anything else is dropped. */
export function safeOpen(v: unknown): string | null {
  const s = str(v, 500);
  if (!s) return null;
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  try {
    const u = new URL(s);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function readOne(x: unknown): Launch | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  const id = str(r.id, 60), listingRef = str(r.listing_ref, 60);
  if (!id || !listingRef || !Array.isArray(r.pieces)) return null;
  const byKey = new Map<PieceKey, LaunchPiece>();
  for (const p of r.pieces as Record<string, unknown>[]) {
    if (!p || !isPiece(p.piece) || !isState(p.state) || byKey.has(p.piece)) continue;
    byKey.set(p.piece, { piece: p.piece, state: p.state, openUrl: safeOpen(p.open_url), note: str(p.note, 160), updatedAt: str(p.updated_at, 40) });
  }
  if (!byKey.size) return null;
  return { id, listingRef, address: str(r.address, 120), createdAt: str(r.created_at, 40), pieces: PIECES.filter((k) => byKey.has(k)).map((k) => byKey.get(k)!) };
}

/** GET /api/brain/launch: `{launches: [...]}`, or one launch on its own (`?listing_ref=`). Checked; null when neither. */
export function readLaunches(j: unknown): Launch[] | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (Array.isArray(r.launches)) {
    const seen = new Set<string>();
    return (r.launches as unknown[]).map(readOne).filter((l): l is Launch => !!l && !seen.has(l.listingRef) && !!seen.add(l.listingRef));
  }
  const one = readOne(r.launch ?? r);
  return one ? [one] : null;
}

/** Waiting on the agent: drafts ready to approve, and failures to look at. */
export const waiting = (l: Launch) => l.pieces.filter((p) => p.state === "ready" || p.state === "failed").length;
export const finished = (l: Launch) => l.pieces.every((p) => p.state === "done" || p.state === "skipped");

export function launchStatus(l: Launch): NodeStatus {
  if (l.pieces.some((p) => p.state === "failed")) return "action";
  if (l.pieces.some((p) => p.state === "ready")) return "attention";
  return "healthy";
}

/** One piece in plain words, for the checklist. `stale` = still `requested` 30 minutes after the launch (LAUNCH §5). */
export function pieceWords(p: LaunchPiece, stale = false): string {
  if (p.note && p.state !== "done") return p.note;
  switch (p.state) {
    case "requested": return stale ? `${OWNER[p.piece]} has not picked this up yet. Open it to start.` : "Asked for";
    case "drafting": return "Pulse is drafting it";
    case "ready": return p.piece === "buyer_notes" ? "Ready for you to send" : "Ready for you to approve";
    case "done": return p.note ?? (p.piece === "buyer_notes" ? "Sent or cleared by you" : p.piece === "site_page" ? "On your website" : "Approved by you");
    case "skipped": return "Not this time";
    case "failed": return "Something went wrong";
  }
}

export function launchLine(l: Launch): string {
  const n = waiting(l);
  if (n) return `${n} ${n === 1 ? "piece" : "pieces"} ready for you`;
  if (finished(l)) return "All done";
  const open = l.pieces.filter((p) => p.state !== "done" && p.state !== "skipped").length;
  return `${open} ${open === 1 ? "piece" : "pieces"} being drafted`;
}

export const listingNode = (ref: string) => `marquee:listing:${ref}`;
export const launchNode = (ref: string) => `marquee:launch:${ref}`;
/** The listing a listing orb or its Launch orb is about, or null for any other orb. */
export function launchRefOf(nodeId: string): string | null {
  const m = /^marquee:(?:listing|launch):(.+)$/.exec(nodeId);
  return m ? m[1] : null;
}
/** Put one launch (just made, or re-read) into the list, replacing the old one for that listing. */
export const upsertLaunch = (list: Launch[] | null, l: Launch): Launch[] => [...(list ?? []).filter((x) => x.listingRef !== l.listingRef), l];

/** A Launch orb under each launched listing that is on the graph. A launch whose listing is not drawn is left out. */
export function withLaunchNodes<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, launches: Launch[] | null): G {
  const mine = (id: string) => id.startsWith("marquee:launch:");
  const nodes = g.nodes.filter((n) => !mine(n.id));
  const edges = g.edges.filter((e) => !mine(e.target));
  for (const l of launches ?? []) {
    const parent = nodes.find((n) => n.id === listingNode(l.listingRef));
    if (!parent) continue;
    const id = launchNode(l.listingRef);
    const n = waiting(l);
    nodes.push({
      id,
      type: "feature",
      label: "Launch",
      secondaryLabel: launchLine(l),
      parentId: parent.id,
      product: parent.product,
      importance: n ? 1 : 0.7,
      status: launchStatus(l),
      needCount: n || undefined,
      summary: `Your launch of ${l.address ?? parent.label}. Each piece is drafted where it lives; open it there to approve. Nothing goes out until you do.`,
    });
    edges.push({ id: `${parent.id}>${id}`, source: parent.id, target: id, relationshipType: n ? "requires_action" : "belongs_to", strength: 1 });
  }
  return { ...g, nodes, edges };
}

/** POST /api/brain/launch body: the pieces switched off before Launch. */
export function launchBody(listingRef: string, on: Partial<Record<PieceKey, boolean>>): { listing_ref: string; off: PieceKey[] } {
  return { listing_ref: listingRef, off: PIECES.filter((k) => on[k] === false) };
}

export const demoLaunches = (ref: string): Launch[] =>
  readLaunches({
    launches: [{
      id: "demo-launch",
      listing_ref: ref,
      address: "742 Demo Ridge Lane",
      pieces: [
        { piece: "marquee_page", state: "ready", open_url: "https://marquee.vip-50.com/go?launch=demo-launch" },
        { piece: "site_page", state: "drafting", note: "Shows on your site when the listing is live" },
        { piece: "open_house", state: "ready" },
        { piece: "ad_draft", state: "drafting" },
        { piece: "buyer_notes", state: "done" },
      ],
    }],
  })!;
