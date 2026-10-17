import type { GraphEdge, GraphNode } from "./graph/types.ts";
import { HEAT_NODE, type HeatHome, type HeatSuggestion } from "./heat.ts";
import { SIGNALS_NODE, type WebSignal } from "./webSignals.ts";

// Looks Hot, one orb (walker inbox/ecosystem/2026-10-17-0142-from-walker-looks-hot-merge.md; Parry, 16 Oct 19:40 MT:
// "yes"). It takes in "Hot on your website": everyone the agent already knows who is showing signs of buying or
// selling, from tours (Showly Yes answers), saved homes and the agent's website (came back, looked hard at a home,
// asked what theirs is worth). Always on ONE MOVE: a still green ring and a plain line when no one is, yellow with the
// count when someone is. Likely sellers first, then high interest, then came back; newest first. Buttons: Move to Hot,
// Call them (a task), Not yet (that reason stays away 14 days). Nothing is sent to anyone.
//
// Where it comes from: ONE MOVE's `GET /api/brain/looks-hot` (asked of GO/MOVE 17 Oct); until it answers, today's two
// routes merged here: the heat suggestions (`/api/brain/heat`) and the website signals (`/api/brain/signals`).

const MOVE_URL = "https://move.vip50one.com";
export const looksHotUrl = `${MOVE_URL}/api/brain/looks-hot`;
export const looksHotActUrl = `${MOVE_URL}/api/brain/looks-hot/act`;
export const LOOKS_NODE = HEAT_NODE;
export const isLooksHotOrb = (id: string) => id === LOOKS_NODE;
export const looksNodeId = (id: string) => `${LOOKS_NODE}:${id}`;
export const looksIdOf = (nodeId: string) => (nodeId.startsWith(`${LOOKS_NODE}:`) ? nodeId.slice(LOOKS_NODE.length + 1) : null);
export const MAX_SHOWN = 15;
export const NOT_YET_DAYS = 14;
export const EMPTY_LINE = "When someone you know comes back to your website, looks hard at a home, asks what theirs is worth or says Yes on a tour, they show here.";
export const SUMMARY = "People you know whose actions say they are getting ready to buy or sell: tour Yes answers, saved homes, return visits to your website, a home value asked for. You decide what happens; nothing is sent.";

export type LooksKind = "seller" | "interest" | "returned";
export const KIND_WORDS: Record<LooksKind, string> = { seller: "Likely seller", interest: "High interest", returned: "Came back" };
const RANK: Record<LooksKind, number> = { seller: 0, interest: 1, returned: 2 };

export interface LooksPerson {
  /** One row per contact (or per heat suggestion with no contact). */
  id: string;
  contactId: string | null;
  name: string;
  reason: string;
  kind: LooksKind;
  at: string | null;
  /** The heat suggestion behind the row, when there is one (its route can move them to Hot). */
  heatId: string | null;
  homes: HeatHome[];
}

const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const isKind = (v: unknown): v is LooksKind => v === "seller" || v === "interest" || v === "returned";

export const sortLooks = (list: LooksPerson[]) => [...list].sort((a, b) => RANK[a.kind] - RANK[b.kind] || (b.at ?? "").localeCompare(a.at ?? ""));

/** ONE MOVE's `/api/brain/looks-hot` (the bare list, or `{people: [...]}`), checked; null when it is not one. */
export function readLooksHot(j: unknown): LooksPerson[] | null {
  const list = Array.isArray(j) ? j : j && typeof j === "object" ? (j as { people?: unknown }).people : null;
  if (!Array.isArray(list)) return null;
  const seen = new Set<string>();
  const out: LooksPerson[] = [];
  for (const x of list as Record<string, unknown>[]) {
    const id = str(x?.contact_id, 60), name = str(x?.first_name, 60) ?? str(x?.name, 80), reason = str(x?.reason_plain, 240);
    if (!id || !name || !reason || !isKind(x.kind) || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, contactId: id, name, reason, kind: x.kind, at: str(x.at, 40), heatId: null, homes: [] });
  }
  return sortLooks(out);
}

/** Today's heat suggestions as rows: tour Yes answers and saved homes are high interest; return visits came back. */
export const fromHeat = (s: HeatSuggestion[]): LooksPerson[] =>
  s.map((h) => ({ id: h.contactId ?? `heat-${h.id}`, contactId: h.contactId, name: h.name, reason: h.why ?? h.title, kind: h.reason === "returned" ? "returned" : "interest", at: h.at, heatId: h.id, homes: h.homes }));

/** The website signals as rows. */
export const fromSignals = (s: WebSignal[]): LooksPerson[] =>
  s.map((w) => ({ id: w.contactId, contactId: w.contactId, name: w.name, reason: w.words, kind: w.likelySeller ? "seller" : w.highInterest ? "interest" : "returned", at: w.at, heatId: null, homes: [] }));

/** Both lists as one, a person once: their strongest reason leads, and a heat suggestion behind them is kept. */
export function mergeLooks(...lists: LooksPerson[][]): LooksPerson[] {
  const by = new Map<string, LooksPerson>();
  for (const p of lists.flat()) {
    const had = by.get(p.id);
    if (!had) {
      by.set(p.id, p);
      continue;
    }
    const lead = RANK[p.kind] < RANK[had.kind] || (RANK[p.kind] === RANK[had.kind] && (p.at ?? "") > (had.at ?? "")) ? p : had;
    by.set(p.id, { ...lead, heatId: had.heatId ?? p.heatId, homes: had.homes.length ? had.homes : p.homes });
  }
  return sortLooks([...by.values()]);
}

/** "Not yet" is kept per person and reason: the same reason stays away 14 days. */
export const notYetKey = (p: LooksPerson) => `${p.id}|${p.kind}`;
export type NotYet = Record<string, number>;
export const NOT_YET_STORE = "one.looksHot.notYet";
export function withNotYet(n: NotYet, p: LooksPerson, now = Date.now()): NotYet {
  const out: NotYet = {};
  for (const [k, until] of Object.entries(n)) if (until > now) out[k] = until;
  out[notYetKey(p)] = now + NOT_YET_DAYS * 86_400_000;
  return out;
}
export function readNotYet(raw: string | null, now = Date.now()): NotYet {
  try {
    const j = raw ? (JSON.parse(raw) as unknown) : null;
    if (!j || typeof j !== "object") return {};
    const out: NotYet = {};
    for (const [k, v] of Object.entries(j as Record<string, unknown>)) if (typeof v === "number" && v > now) out[k] = v;
    return out;
  } catch {
    return {};
  }
}

/** The rows to show: not hidden by Not yet, not just moved or called. */
export const shownLooks = (list: LooksPerson[] | null, notYet: NotYet, gone: ReadonlySet<string>, now = Date.now()): LooksPerson[] | null =>
  list ? list.filter((p) => !gone.has(p.id) && !((notYet[notYetKey(p)] ?? 0) > now)) : null;

/** The orb's line, never empty. */
export function looksLine(list: LooksPerson[]): string {
  if (!list.length) return "No one right now";
  const sellers = list.filter((p) => p.kind === "seller").length;
  return `${list.length} ${list.length === 1 ? "person" : "people"}${sellers ? ` · ${sellers} likely ${sellers === 1 ? "seller" : "sellers"}` : ""}`;
}

/**
 * The Looks Hot orb directly on ONE MOVE, always there while ONE MOVE is in the package, with the people round it.
 * The separate "Hot on your website" orb is gone (it lives here now). Before the first answer: just its name.
 */
export function withLooksHot<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, list: LooksPerson[] | null): G {
  const mine = (id: string) => id === LOOKS_NODE || id.startsWith(`${LOOKS_NODE}:`) || id === SIGNALS_NODE || id.startsWith(`${SIGNALS_NODE}:`);
  const nodes = g.nodes.filter((n) => !mine(n.id));
  const edges = g.edges.filter((e) => !mine(e.target));
  const move = g.nodes.find((n) => n.id === "move");
  if (!move || move.locked) return { ...g, nodes, edges };
  const n = list?.length ?? 0;
  nodes.push({
    id: LOOKS_NODE,
    type: "category",
    label: "Looks Hot",
    secondaryLabel: list ? looksLine(list) : undefined,
    parentId: "move",
    product: "move",
    importance: 0.98,
    status: list ? (n ? "attention" : "healthy") : undefined,
    needCount: n || undefined,
    summary: list && !n ? EMPTY_LINE : SUMMARY,
  });
  edges.push({ id: `move>${LOOKS_NODE}`, source: "move", target: LOOKS_NODE, relationshipType: "belongs_to", strength: 1 });
  (list ?? []).slice(0, MAX_SHOWN).forEach((p, i) => {
    const id = looksNodeId(p.id);
    nodes.push({ id, type: "person", label: p.name, secondaryLabel: KIND_WORDS[p.kind], parentId: LOOKS_NODE, product: "move", importance: 0.9 - i * 0.02, status: "attention", contactId: p.contactId ?? undefined, image: p.homes[0]?.photo ?? undefined, summary: p.reason });
    edges.push({ id: `${LOOKS_NODE}>${id}`, source: LOOKS_NODE, target: id, relationshipType: "requires_action", strength: 1 });
  });
  return { ...g, nodes, edges };
}

export type LooksAction = "move_hot" | "call" | "not_yet";
export interface ActResult { ok: boolean; line: string; local?: boolean; /** ONE MOVE's Buyer Need draft after Move to Hot, https only. */ needUrl?: string | null }
const needOf = async (r: Response) => {
  const j = (await r.json().catch(() => null)) as { need_url?: unknown } | null;
  const u = str(j?.need_url, 500);
  return u && u.startsWith("https://") ? u : null;
};
export const COMING_CALL = "Call them makes a task once ONE MOVE's update lands. Nothing was changed.";

/**
 * One button. ONE MOVE's act route first; if it is not there yet: Move to Hot goes through the heat route (when a
 * suggestion is behind the row) or the Hot/Warm/Cold add route; Not yet is kept on this device; Call them says it is
 * coming.
 */
export async function actLooks(p: LooksPerson, action: LooksAction, f: typeof fetch = fetch): Promise<ActResult> {
  const post = (url: string, body: unknown) => f(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const first = p.name.split(/\s+/)[0];
  const done = action === "move_hot" ? `${first} is Hot now. Nothing was sent to them.` : action === "call" ? `A task to call ${first} is on your list.` : `Not yet. Pulse won't raise this for ${first} again for 14 days.`;
  let missing = !p.contactId;
  if (p.contactId) {
    try {
      const r = await post(looksHotActUrl, { contact_id: p.contactId, action });
      if (r.ok) return { ok: true, line: done, needUrl: action === "move_hot" ? await needOf(r) : null };
      if (r.status === 404 || r.status === 405) missing = true;
      else {
        const j = (await r.json().catch(() => null)) as { error?: unknown } | null;
        return { ok: false, line: str(j?.error) ?? "ONE MOVE didn't take that. Nothing was changed." };
      }
    } catch {
      missing = true;
    }
  }
  if (!missing) return { ok: false, line: "ONE MOVE didn't take that. Nothing was changed." };
  if (action === "not_yet") return { ok: true, line: done, local: true };
  if (action === "call") return { ok: false, line: COMING_CALL };
  try {
    const r = p.heatId
      ? await post(`${MOVE_URL}/api/brain/heat`, { id: p.heatId, accept: true })
      : p.contactId
        ? await post(`${MOVE_URL}/api/brain/hwc/add`, { name: p.name, phone: "", class: "hot", contact_id: p.contactId })
        : null;
    if (r?.ok) return { ok: true, line: done, needUrl: await needOf(r) };
  } catch {
    // fall through
  }
  return { ok: false, line: "ONE MOVE didn't take that. Nothing was changed." };
}

/** The example agent: one person from the website, one from a tour. */
export const demoLooksHot = (): LooksPerson[] =>
  sortLooks([
    { id: "r6", contactId: "r6", name: "Dave Ortiz", reason: "Asked what his home is worth on your website (Oct 12)", kind: "seller", at: "2026-10-12T19:00:00Z", heatId: null, homes: [] },
    { id: "c-amy", contactId: "c-amy", name: "Amy Chen", reason: "Said Yes to 2 homes on Thursday's tour", kind: "interest", at: "2026-10-14T18:00:00Z", heatId: "h1", homes: [] },
  ]);
