import { MOVE_URL } from "./host.ts";

// ONE MOVE's main menu, the Classic sidebar items (vip50-web-crm
// components/layout/Sidebar.tsx, checked 3 Oct; admin items left out), in the
// groups Parry chose on 3 Oct (vip50-ecosystem MOVE-MENU.md). The same groups
// are the orbs around ONE MOVE in the Brain and the drop-downs in its menu.
// The sign-in is shared on .vip50one.com, so no password.

export interface MovePage {
  label: string;
  path: string;
}

export interface MoveGroup {
  key: string;
  label: string;
  blurb: string; // short line under the orb
  pages: MovePage[];
}

/** Always on show, above the groups. */
export const MOVE_TOP: MovePage[] = [{ label: "Dashboard", path: "/dashboard" }];

export const MOVE_GROUPS: MoveGroup[] = [
  {
    key: "people",
    label: "People",
    blurb: "Contacts and your VIPs",
    pages: [
      { label: "Contacts", path: "/contacts" },
      { label: "VIP Management", path: "/contacts/vip" },
      { label: "Touch Audit", path: "/contacts/audit" },
      { label: "New to Sort", path: "/contacts/visitors" },
      { label: "Hot/Warm/Cold", path: "/hot-warm-cold" },
      { label: "Business Rolodex", path: "/rolodex" },
    ],
  },
  {
    key: "trackers",
    label: "Trackers",
    blurb: "Daily, weekly and 90 days",
    pages: [
      { label: "Daily Tracker", path: "/daily" },
      { label: "Weekly Tracker", path: "/weekly" },
      { label: "90-Day Challenge", path: "/challenge" },
      { label: "Analytics", path: "/analytics" },
    ],
  },
  {
    key: "events",
    label: "Events",
    blurb: "Calendar, events and mixers",
    pages: [
      { label: "Calendar", path: "/calendar" },
      { label: "VIP Events", path: "/events" },
      { label: "Mixer", path: "/mixer" },
    ],
  },
  {
    key: "outreach",
    label: "Outreach",
    blurb: "Newsletter, pages and plans",
    pages: [
      { label: "Newsletter", path: "/newsletter" },
      { label: "Landing Pages", path: "/landing-pages" },
      { label: "Action Plans", path: "/action-plans" },
    ],
  },
  {
    key: "learn",
    label: "Learn",
    blurb: "Videos, docs and what's new",
    pages: [
      { label: "Video Library", path: "/content" },
      { label: "VIP Docs", path: "/vip-docs" },
      { label: "The Vault", path: "/vault" },
      { label: "What's New", path: "/whats-new" },
    ],
  },
];

/**
 * Coach: the admin pages (Parry, 8 Oct, via GO/MOVE: he could not find them in the Brain). Shown to admins only,
 * last in the list; each page checks admin itself (ONE MOVE redirects anyone else), so the menu is not the lock.
 */
export const MOVE_COACH: MoveGroup = {
  key: "coach",
  label: "Coach",
  blurb: "Admin pages",
  pages: [
    { label: "Coach Overview", path: "/admin" },
    { label: "Revenue", path: "/admin/revenue" },
    { label: "All Agents", path: "/users" },
    { label: "Challenge", path: "/admin/challenge" },
    { label: "Luxury Team", path: "/admin/team" },
    { label: "Review calls", path: "/admin/review-calls" },
    { label: "System Health", path: "/admin/system-health" },
  ],
};

/** The groups an agent sees: Coach last, for admins only. */
export const moveGroupsFor = (admin: boolean): MoveGroup[] => (admin ? [...MOVE_GROUPS, MOVE_COACH] : MOVE_GROUPS);

/** Always on show, below the groups. */
export const MOVE_BOTTOM: MovePage[] = [
  { label: "The Lounge", path: "/lounge" },
  { label: "My Profile", path: "/profile" },
];

/** Every page, in menu order. */
export const MOVE_MENU: MovePage[] = [...MOVE_TOP, ...MOVE_GROUPS.flatMap((g) => g.pages), ...MOVE_BOTTOM];

export const moveMenuHref = (path: string) => `${MOVE_URL}${path}`;

/** The same page inside the Brain: ?embed=1 lets ONE MOVE take the Brain look before it paints. */
export const moveEmbedHref = (path: string) => `${MOVE_URL}${path}${path.includes("?") ? "&" : "?"}embed=1`;

function MOVE_MENU_PATHS(): string[] {
  // Dashboard is ONE MOVE's Classic home, not a page inside the Brain.
  // Coach pages (admins) open in place too.
  return [...MOVE_MENU, ...MOVE_COACH.pages].map((m) => m.path).filter((p) => p !== "/dashboard");
}

/** Graph ids: a group orb and a page orb. Touch Audit keeps its live id. */
export const moveGroupId = (key: string) => `move-g-${key}`;
export const movePageId = (path: string) =>
  path === "/contacts/audit" ? "move-audit" : `move-p-${path.slice(1).replace(/[^a-z0-9]+/g, "-")}`;

/**
 * Pages that open inside the Brain instead of a new tab: the real ONE MOVE
 * page in the full window, in ONE MOVE's embed mode (its own sidebar and top
 * bar hidden). VIP Management first (3 Oct); Parry liked it ("a full window
 * which is great"), so every menu page now opens this way.
 */
/** ONE MOVE's desktop layout needs this many pixels (its lg breakpoint, 1024, plus room). */
export const MOVE_PAGE_WIDTH = 1280;

export const IN_BRAIN: ReadonlySet<string> = new Set(MOVE_MENU_PATHS());

const PATH_BY_ID = new Map([...MOVE_MENU, ...MOVE_COACH.pages].map((m) => [movePageId(m.path), m]));

/** The page a focused orb opens inside the Brain, if any. */
export function inBrainPage(nodeId: string): MovePage | null {
  const m = PATH_BY_ID.get(nodeId);
  return m && IN_BRAIN.has(m.path) ? m : null;
}

/** A group orb around ONE MOVE: no "Open ONE MOVE" button on it (Parry, 3 Oct). */
export const isMoveGroup = (id: string) => id.startsWith("move-g-");

/**
 * A plain page orb (its name is all there is to show): no hover card, a click
 * opens it (Parry, 3 Oct). The live Touch Audit keeps its card; it has numbers.
 */
export const isMovePage = (id: string) => id.startsWith("move-p-");

/**
 * Each page inside the Brain has its own address (Parry, 4 Oct: "it should
 * just say vip50one.com/dashboard/profile"): /dashboard + the ONE MOVE path.
 */
export const pageAddress = (path: string | null) => (path ? `/dashboard${path}` : "/dashboard");

/** The in-Brain page an address names, or null for the Brain itself. */
export function pageFromAddress(pathname: string): string | null {
  const m = /^\/dashboard(\/.+?)\/?$/.exec(pathname);
  return m && IN_BRAIN.has(m[1]) ? m[1] : null;
}

/**
 * The Coach group and its pages as orbs round ONE MOVE, for admins only (added in the Brain, since the graph is
 * built before the page knows who is looking at it). Nothing for anyone else.
 */
export function withMoveCoach<G extends { nodes: import("./graph/types.ts").GraphNode[]; edges: import("./graph/types.ts").GraphEdge[] }>(g: G, admin: boolean): G {
  const gid = moveGroupId(MOVE_COACH.key);
  const ids = new Set([gid, ...MOVE_COACH.pages.map((p) => movePageId(p.path))]);
  const nodes = g.nodes.filter((n) => !ids.has(n.id));
  const edges = g.edges.filter((e) => !ids.has(e.target));
  if (!admin || !g.nodes.some((n) => n.id === "move")) return { ...g, nodes, edges };
  nodes.push({ id: gid, type: "category", label: MOVE_COACH.label, secondaryLabel: MOVE_COACH.blurb, parentId: "move", product: "move", importance: 0.5, summary: `Coach in ONE MOVE (admins): ${MOVE_COACH.pages.map((p) => p.label).join(", ")}.` });
  edges.push({ id: `move>${gid}`, source: "move", target: gid, relationshipType: "belongs_to", strength: 1 });
  MOVE_COACH.pages.forEach((p, j) => {
    const id = movePageId(p.path);
    nodes.push({ id, type: "feature", label: p.label, parentId: gid, product: "move", importance: 0.8 - j * 0.02, href: moveMenuHref(p.path) });
    edges.push({ id: `${gid}>${id}`, source: gid, target: id, relationshipType: "belongs_to", strength: 1 });
  });
  return { ...g, nodes, edges };
}
