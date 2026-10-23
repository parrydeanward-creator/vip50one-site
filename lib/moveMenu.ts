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
      // ONE GO's Drop-By Map on ONE MOVE (Parry 16 Oct: everything in ONE GO on ONE MOVE; vip50-web-crm#276)
      { label: "Drop-By Map", path: "/drop-by" },
      // ONE MOVE's Opportunities page (was New to Sort, same badge; vip50-web-crm#293): in the Brain the row opens the
      // Opportunities orb, which holds New to Sort. /contacts/visitors still opens New to Sort (MOVE_HIDDEN below).
      { label: "Opportunities", path: "/opportunities" },
      { label: "Hot/Warm/Cold", path: "/hot-warm-cold" },
      // VIP-SUMMARY §3ar (Parry, 23 Oct: "yes build it. looks great"): signed-in people on the agent's site, a native
      // Brain view (components/brain/OnMySite.tsx); ONE MOVE's Classic page is the same path (GO/MOVE builds it).
      { label: "Who is on my site", path: "/on-my-site" },
      { label: "Business Rolodex", path: "/rolodex" },
      // VIP-SUMMARY §3af (13 Oct; Parry: every feature in the Brain as well as Classic)
      { label: "Referral Network", path: "/referral-network" },
      // Agent Hub retired (Parry, 23 Oct; /profile/agent-hub redirects), so it is not a menu row.
      // Buyer Needs and Your listings retired (Parry, 23 Oct: "retire buyers needs"; "retire your listings already on
      // the website"). A buyer's wants stay on their contact, and listings that fit them stay on the listing orb.
      // vip50-web-crm#294 (17 Oct): the Life Events page; in the Brain the row opens the Life events orb
      { label: "Life Events", path: "/life-events" },
      // ONE MOVE's Deals page (17 Oct); in the Brain the row opens the Deals orb
      { label: "Deals", path: "/deals" },
      // Every Classic page in the Brain too (Parry, 21 Oct: "everything on classic needs to be on the Brain as well"):
      // the contact tools that were Classic only.
      // Import is a button on My Contacts now (23 Oct), so it is not a menu row.
      { label: "Clean Up Contacts", path: "/contacts/cleanup" },
      { label: "Lead Sources", path: "/contacts/sources" },
    ],
  },
  {
    key: "trackers",
    label: "Trackers",
    blurb: "Daily, weekly and 90 days",
    pages: [
      // The full task list (Classic /tasks; Parry, 21 Oct).
      { label: "Tasks", path: "/tasks" },
      { label: "Daily Tracker", path: "/daily" },
      { label: "Weekly Tracker", path: "/weekly" },
      { label: "90-Day Challenge", path: "/challenge" },
      // ONE MOVE's Scoreboard (was Achievements; vip50-web-crm#278, Parry 16 Oct: "yes on combining into Scoreboard")
      { label: "Scoreboard", path: "/achievements" },
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
    blurb: "Newsletter, reports, plans and pages",
    pages: [
      // ONE MOVE's Outreach overview (17 Oct), first in the group
      { label: "Overview", path: "/outreach" },
      { label: "Newsletter", path: "/newsletter" },
      { label: "Landing Pages", path: "/landing-pages" },
      { label: "Action Plans", path: "/action-plans" },
      // HOME-REPORT.md §5.4 (16 Oct): every running report this month, and the bulk start; named "Market Reports"
      // since v0.4 (Parry, 16 Oct: "1 yes"). The path stays ONE MOVE's /home-reports.
      { label: "Market Reports", path: "/home-reports" },
    ],
  },
  {
    key: "learn",
    label: "Learn",
    blurb: "Videos, docs and what's new",
    pages: [
      // Learn home (17 Oct, walker 0245): ONE MOVE's /learn, first in the group; on the map the Learn orb is that home
      { label: "Learn home", path: "/learn" },
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
    // GO/MOVE's Classic coaching board (vip50-web-crm#378-#387). Linked coaches (coach_links) see it in Classic too;
    // the Coach group here is admin-only, so it opens for admins; the page checks access itself.
    { label: "Coaching", path: "/coaching" },
    { label: "Luxury Team", path: "/admin/team" },
    { label: "Review calls", path: "/admin/review-calls" },
    { label: "System Health", path: "/admin/system-health" },
    { label: "Pulse Tests", path: "/admin/pulse-tests" },
    { label: "Coach Table", path: "/admin/classic" },
    { label: "Communications", path: "/communications" },
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

/**
 * Menu rows whose Brain side is a native orb, not the ONE MOVE page in a frame: the row opens the orb (it comes to the
 * middle, the orbs rule), and no separate page orb is drawn for them. The ids are lib/opportunities.ts OPP_NODE,
 * lib/lifeEvents.ts LIFE_NODE and lib/deals.ts DEALS_NODE (tests/moveMenu.test.ts checks they match).
 */
export const MENU_ORB: Readonly<Record<string, string>> = { "/opportunities": "move-opportunities", "/life-events": "move-life-events", "/deals": "move-deals" };

/** The graph id a menu row goes to: its native orb when it has one, else its page orb. */
export const menuNodeId = (path: string) => MENU_ORB[path] ?? movePageId(path);

/** Pages no longer in the menu that still open inside the Brain: New to Sort (now inside Opportunities). */
export const MOVE_HIDDEN: MovePage[] = [{ label: "New to Sort", path: "/contacts/visitors" }];

/**
 * Pages opened only by a button, never by a menu row or an orb: Import is a button on My Contacts (23 Oct); Archived
 * Contacts is a link under its list (Parry, 23 Oct: "I dont want the archived contacts orb on one move, it is not
 * necesaary"). They open inside the Brain.
 */
export const MOVE_BUTTON_PAGES: MovePage[] = [{ label: "Import Contacts", path: "/contacts/import" }, { label: "Archived Contacts", path: "/contacts/archived" }];

export const moveMenuHref = (path: string) => `${MOVE_URL}${path}`;

/** The same page inside the Brain: ?embed=1 lets ONE MOVE take the Brain look before it paints. */
export const moveEmbedHref = (path: string) => `${MOVE_URL}${path}${path.includes("?") ? "&" : "?"}embed=1`;

function MOVE_MENU_PATHS(): string[] {
  // Dashboard is ONE MOVE's Classic home, not a page inside the Brain.
  // Coach pages (admins) open in place too.
  // Rows that open a native orb (MENU_ORB) have no page frame; New to Sort keeps its page (MOVE_HIDDEN).
  return [...MOVE_MENU, ...MOVE_HIDDEN, ...MOVE_BUTTON_PAGES, ...MOVE_COACH.pages].map((m) => m.path).filter((p) => p !== "/dashboard" && !MENU_ORB[p]);
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

/** ONE MOVE's Team Leads (MOVE-MENU.md People; VIP-SUMMARY §3ae): an orb only for agents on a team. */
export const TEAM_LEADS_PAGE: MovePage = { label: "Team Leads", path: "/team-leads" };

export const IN_BRAIN: ReadonlySet<string> = new Set([...MOVE_MENU_PATHS(), TEAM_LEADS_PAGE.path]);

const PATH_BY_ID = new Map([...MOVE_MENU, ...MOVE_HIDDEN, ...MOVE_BUTTON_PAGES, ...MOVE_COACH.pages, TEAM_LEADS_PAGE].map((m) => [movePageId(m.path), m]));

/** The Team Leads orb under People, for a team member only (the war room's answer says whether they are on one). */
export function withTeamLeadsPage<G extends { nodes: import("./graph/types.ts").GraphNode[]; edges: import("./graph/types.ts").GraphEdge[] }>(g: G, onTeam: boolean): G {
  const id = movePageId(TEAM_LEADS_PAGE.path);
  const gid = moveGroupId("people");
  const nodes = g.nodes.filter((n) => n.id !== id);
  const edges = g.edges.filter((e) => e.target !== id);
  if (!onTeam || !g.nodes.some((n) => n.id === gid)) return { ...g, nodes, edges };
  nodes.push({ id, type: "feature", label: TEAM_LEADS_PAGE.label, parentId: gid, product: "move", importance: 0.69, href: moveMenuHref(TEAM_LEADS_PAGE.path) });
  edges.push({ id: `${gid}>${id}`, source: gid, target: id, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

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
