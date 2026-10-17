import { MOVE_URL } from "./host.ts";
import type { GraphEdge, GraphNode } from "./graph/types.ts";
import { IN_BRAIN, moveGroupId, moveMenuHref, movePageId } from "./moveMenu.ts";

// Learn shows what is inside (walker 2026-10-17-0245). The Learn orb on ONE MOVE opens on child orbs with filled
// panels: Start here (the next video), What's New (the latest three), The Vault (how many and the newest), Tour films
// (Film A "What everything means" and Film B the ONE GO tour), beside the Video Library and VIP Docs pages; the Learn
// panel holds one search box across videos, docs and the Vault. "Learn home" (/learn) is the menu's first Learn row:
// the Learn orb is that home on the map, so it is not another orb on the ring (as Outreach's Overview).
// Asking Pulse "how do I ..." against the same search is a later step.
//
// Routes (ONE MOVE): GET /api/brain/learn, GET /api/brain/learn/search?q=.

export const learnUrl = `${MOVE_URL}/api/brain/learn`;
export const learnSearchUrl = (q: string) => `${MOVE_URL}/api/brain/learn/search?q=${encodeURIComponent(q)}`;
export const LEARN_HOME = "/learn";

export interface Video { id: string; title: string; url: string; category: string | null }
export interface NewsItem { date: string; title: string; body: string | null; href: string | null }
export interface VaultItem { id: string; title: string; category: string | null; added: string | null }
export interface Learn {
  nextVideo: Video | null;
  /** null: watching is not counted yet (never shown as 0). */
  watched: number | null;
  total: number;
  whatsNew: NewsItem[];
  vaultCount: number;
  vaultNewest: VaultItem[];
}
export type HitKind = "video" | "doc" | "vault";
export interface Hit { kind: HitKind; id: string; title: string; detail: string | null; href: string }

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const str = (v: unknown, max = 200): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const int = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);
const ymd = (v: unknown): string | null => str(v, 40)?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
/** A link the Brain may open: https, or a path on ONE MOVE. */
const link = (v: unknown): string | null => {
  const s = str(v, 600);
  return s && (/^https:\/\//.test(s) || /^\/[^/]/.test(s)) ? s : null;
};

/** GET /api/brain/learn, checked; null when it is not one. What's New newest first, three at most. */
export function readLearn(j: unknown): Learn | null {
  const r = obj(j);
  if (!r || !Array.isArray(r.whats_new)) return null;
  const nv = obj(r.next_video);
  const nvId = str(nv?.id, 80), nvTitle = str(nv?.title, 200), nvUrl = link(nv?.url);
  const whatsNew = (r.whats_new as unknown[]).flatMap((x) => {
    const o = obj(x);
    const date = ymd(o?.date), title = str(o?.title, 200);
    return o && date && title ? [{ date, title, body: str(o.body, 400), href: link(o.href) }] : [];
  });
  whatsNew.sort((a, b) => b.date.localeCompare(a.date));
  const v = obj(r.vault);
  const vaultNewest = (Array.isArray(v?.newest) ? (v!.newest as unknown[]) : []).flatMap((x) => {
    const o = obj(x);
    const id = str(o?.id, 80), title = str(o?.title, 200);
    return o && id && title ? [{ id, title, category: str(o.category, 60), added: ymd(o.added) }] : [];
  });
  return {
    nextVideo: nvId && nvTitle && nvUrl ? { id: nvId, title: nvTitle, url: nvUrl, category: str(nv?.category, 60) } : null,
    watched: int(r.watched),
    total: int(r.total) ?? 0,
    whatsNew: whatsNew.slice(0, 3),
    vaultCount: int(v?.count) ?? vaultNewest.length,
    vaultNewest: vaultNewest.slice(0, 5),
  };
}

/** GET /api/brain/learn/search, checked: the results with a link, at most 20. */
export function readHits(j: unknown): Hit[] {
  const r = obj(j);
  if (!r || !Array.isArray(r.results)) return [];
  return (r.results as unknown[]).flatMap((x) => {
    const o = obj(x);
    const id = str(o?.id, 80), title = str(o?.title, 200), href = link(o?.href);
    const kind: HitKind | null = o?.kind === "video" || o?.kind === "doc" || o?.kind === "vault" ? o.kind : null;
    return o && id && title && href && kind ? [{ kind, id, title, detail: str(o.detail, 200), href } as Hit] : [];
  }).slice(0, 20);
}

/** A search is worth asking at two letters. */
export const searchable = (q: string) => q.trim().length >= 2;

/**
 * Where a link opens: a ONE MOVE page that lives inside the Brain opens there (the ONE MOVE open helper); anything
 * else in a new tab. A bare path is ONE MOVE's.
 */
export function openTarget(href: string): { kind: "brain"; path: string } | { kind: "tab"; url: string } {
  let path: string | null = null;
  if (href.startsWith("/")) path = href;
  else {
    try {
      const u = new URL(href);
      if (u.origin === MOVE_URL) path = `${u.pathname}${u.search}`;
    } catch {
      return { kind: "tab", url: href };
    }
  }
  if (path == null) return { kind: "tab", url: href };
  const bare = path.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  return IN_BRAIN.has(bare) && bare === path ? { kind: "brain", path: bare } : { kind: "tab", url: moveMenuHref(path) };
}

// ---- plain words ----------------------------------------------------------------------------------------------------

/** "11 videos" while watching is not counted; "3 of 11 watched" once it is. Never "0 of 11 watched" from a null. */
export const videosLine = (watched: number | null, total: number) =>
  watched == null ? `${total} ${total === 1 ? "video" : "videos"}` : `${Math.min(watched, total)} of ${total} watched`;
export const vaultLine = (n: number) => (n ? `${n} ${n === 1 ? "item" : "items"} in the Vault` : "Nothing in the Vault yet");
export const newsLine = (items: NewsItem[]) => (items.length ? `Latest: ${items[0].title}` : "Nothing new yet");
export const HIT_WORD: Record<HitKind, string> = { video: "Video", doc: "Doc", vault: "Vault" };
export const dateWords = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

// ---- orbs -----------------------------------------------------------------------------------------------------------

export type LearnPartKey = "start" | "whats_new" | "vault" | "films";
export const LEARN_START = "move-learn-start";
export const LEARN_FILMS = "move-learn-films";
const NEWS_ID = movePageId("/whats-new");
const VAULT_ID = movePageId("/vault");

/** Which Learn part an orb is, or null. */
export function learnPartOf(id: string): LearnPartKey | null {
  if (id === LEARN_START) return "start";
  if (id === LEARN_FILMS) return "films";
  if (id === NEWS_ID) return "whats_new";
  if (id === VAULT_ID) return "vault";
  return null;
}
/** What's New and The Vault are ONE MOVE pages that open on their side panel first; its button opens the page. */
export const LEARN_PANEL_FIRST: ReadonlySet<string> = new Set(["/whats-new", "/vault"]);

type G = { nodes: GraphNode[]; edges: GraphEdge[] };

/**
 * Learn's parts round the Learn orb. A signed-in agent's graph already holds the group and its page orbs (lib/live.ts);
 * the example agent's has neither, so they are added. The Learn home page orb is not on the ring (the Learn orb is it).
 * Pure; nothing when ONE MOVE is locked or missing.
 */
export function withLearnNodes<g extends G>(g: g, l: Learn | null): g {
  const move = g.nodes.find((n) => n.id === "move");
  if (!move || move.locked) return g;
  const gid = moveGroupId("learn");
  const home = movePageId(LEARN_HOME);
  const mine = new Set([LEARN_START, LEARN_FILMS, home]);
  const nodes = g.nodes.filter((n) => !mine.has(n.id));
  const edges = g.edges.filter((e) => !mine.has(e.target) && !mine.has(e.source));
  if (!nodes.some((n) => n.id === gid)) {
    nodes.push({ id: gid, type: "category", label: "Learn", secondaryLabel: "Videos, docs and what's new", parentId: "move", product: "move", importance: 0.6, summary: "Learn in ONE MOVE: videos, docs, the Vault and what's new." });
    edges.push({ id: `move>${gid}`, source: "move", target: gid, relationshipType: "belongs_to", strength: 1 });
  }
  const put = (n: GraphNode) => {
    const at = nodes.findIndex((x) => x.id === n.id);
    if (at >= 0) nodes[at] = { ...nodes[at], ...n };
    else nodes.push(n);
    if (!edges.some((e) => e.target === n.id)) edges.push({ id: `${gid}>${n.id}`, source: gid, target: n.id, relationshipType: "belongs_to", strength: 1 });
  };
  put({ id: LEARN_START, type: "feature", label: "Start here", secondaryLabel: l ? (l.nextVideo ? `Next: ${l.nextVideo.title}` : videosLine(l.watched, l.total)) : undefined, parentId: gid, product: "move", importance: 0.9, summary: "The next video to watch, and how many there are." });
  put({ id: NEWS_ID, type: "feature", label: "What's New", secondaryLabel: l ? newsLine(l.whatsNew) : undefined, parentId: gid, product: "move", importance: 0.86, href: moveMenuHref("/whats-new"), summary: "The latest changes to ONE, newest first." });
  put({ id: VAULT_ID, type: "feature", label: "The Vault", secondaryLabel: l ? vaultLine(l.vaultCount) : undefined, parentId: gid, product: "move", importance: 0.84, href: moveMenuHref("/vault"), summary: "Scripts, guides and files kept for you." });
  put({ id: LEARN_FILMS, type: "feature", label: "Tour films", secondaryLabel: "What everything means · the ONE GO tour", parentId: gid, product: "move", importance: 0.82, summary: "The two tour films: what everything on this map means, and the ONE GO phone app." });
  return { ...g, nodes, edges };
}

// ---- the example agent ----------------------------------------------------------------------------------------------

export function demoLearn(today: string): Learn {
  const back = (n: number) => new Date(Date.parse(`${today}T12:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);
  return readLearn({
    next_video: { id: "demo-v1", title: "Your first week with the VIP-50", url: `${MOVE_URL}/content`, category: "Getting started" },
    watched: null,
    total: 11,
    whats_new: [
      { date: back(0), title: "Market Reports for all your VIPs", body: "Set them up for every VIP at once.", href: "/home-reports" },
      { date: back(2), title: "Deals under contract", body: "Every date on one card.", href: "/deals" },
      { date: back(5), title: "Opportunities", body: "New leads, New to Sort and Looks Hot together.", href: null },
    ],
    vault: { count: 24, newest: [{ id: "demo-vault-1", title: "Listing presentation script", category: "Scripts", added: back(1) }, { id: "demo-vault-2", title: "Open house sign-in sheet", category: "Forms", added: back(6) }] },
  })!;
}
export function demoHits(q: string): Hit[] {
  const all: Hit[] = [
    { kind: "video", id: "demo-v1", title: "Your first week with the VIP-50", detail: "Getting started", href: `${MOVE_URL}/content` },
    { kind: "doc", id: "demo-d1", title: "The VIP touches, month by month", detail: "VIP Docs", href: `${MOVE_URL}/vip-docs` },
    { kind: "vault", id: "demo-vault-1", title: "Listing presentation script", detail: "Scripts", href: `${MOVE_URL}/vault` },
  ];
  const t = q.trim().toLowerCase();
  return all.filter((h) => h.title.toLowerCase().includes(t) || (h.detail ?? "").toLowerCase().includes(t));
}
