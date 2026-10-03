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
  return MOVE_MENU.map((m) => m.path).filter((p) => p !== "/dashboard");
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

const PATH_BY_ID = new Map(MOVE_MENU.map((m) => [movePageId(m.path), m]));

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
