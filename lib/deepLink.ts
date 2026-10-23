import { IN_BRAIN, MENU_ORB, MOVE_COACH, MOVE_GROUPS, MOVE_MENU, moveGroupId, movePageId, pagesOf } from "./moveMenu.ts";

// Every Brain address lands on its own page or orb (Parry, 18 Oct: links to vip50one.com/dashboard/<page> and
// ?open=<thing> "just open the dashboard"). One place says what an address or ?open= names; the Brain finds it on the
// agent's map (lib/deepLinkNode.ts) and, when it is not there, lands on the nearest orb that is, with its locked line.
// Kept light (no graph code): the sign-in redirect uses it too. The ids are checked against their modules' constants in
// tests/deepLink.test.ts.

export const GBP_ADDRESS = "/google-profile"; // lib/gbp.ts GBP_PATH without /dashboard

const ID = {
  start: "go-start", // lib/gettingStarted.ts START_NODE
  goals: "go-goals", // lib/oneYou.ts GOALS_NODE
  team: "one-team", // lib/teamHub.ts TEAM_HUB
  growth: "growth", // lib/growthOrb.ts GROWTH_NODE
  today: "you-today", // lib/youGroups.ts TODAY_GROUP
  week: "you-week", // lib/youGroups.ts WEEK_GROUP
  coaching: "you-coaching", // lib/youGroups.ts COACHING_GROUP
} as const;

/** What an address names. `page`: an in-Brain ONE MOVE page (opens full). `orb`: Brain orbs, best first. */
export type Arrival =
  | { kind: "gbp"; label: string }
  | { kind: "page"; path: string; label: string; alt: string[]; fallback: string[]; missing: string; contact?: string }
  | { kind: "orb"; ids: string[]; label: string; fallback: string[]; missing: string; contact?: string };

/** A contact id in an address: MASTER's contact UUID (the `contact_id` lead_in returns; ONE MOVE's /contacts/<id>). Nothing else. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const contactIdOf = (v: string | null | undefined): string | null => (v && UUID.test(v.trim()) ? v.trim().toLowerCase() : null);
/** The Brain address of one contact (other products link here; Parry, 19 Oct). */
export const contactAddress = (id: string) => `/dashboard/contacts/${id.toLowerCase()}`;

const PRODUCTS: Record<string, [string, string]> = {
  youone: ["go", "ONE YOU"],
  you: ["go", "ONE YOU"],
  go: ["go", "ONE YOU"],
  move: ["move", "ONE MOVE"],
  marquee: ["marquee", "Marquee"],
  showly: ["showly", "Showly"],
  open: ["open", "ONE Open"],
};

const notOn = (label: string) => `${label} isn't on your dashboard yet.`;
const groupOf = (path: string) => [...MOVE_GROUPS, MOVE_COACH].find((g) => pagesOf(g).some((p) => p.path === path));
const labelOf = (path: string) => [...MOVE_MENU, ...MOVE_COACH.pages].find((p) => p.path === path)?.label ?? (path === "/team-leads" ? "Team Leads" : path === "/contacts/visitors" ? "New to Sort" : path.slice(1));

/** A group orb by its key (/dashboard/people, ?open=trackers). Events has no address of its own: /events is VIP Events. */
function group(key: string): Arrival | null {
  const g = [...MOVE_GROUPS, MOVE_COACH].find((x) => x.key === key);
  if (!g) return null;
  // The example agent's map has no People orb: ONE MOVE itself holds its contacts and VIP orbs there.
  const ids = g.key === "people" ? [moveGroupId(g.key), "move"] : [moveGroupId(g.key)];
  return { kind: "orb", ids, label: g.label, fallback: ["move"], missing: g.key === "coach" ? "Coach is for admins." : notOn(g.label) };
}

function page(path: string): Arrival | null {
  if (path === GBP_ADDRESS) return { kind: "gbp", label: "Google Business Profile" };
  // /coaching is also the Brain's own Coaching orb (ONE YOU); the address keeps landing on that. The Classic board is the Coach row's page frame.
  if (path === "/coaching") return openTarget("coaching");
  const label = labelOf(path);
  const g = groupOf(path);
  // a part of a parent row (Import, Clean Up under Contacts) falls back to that parent orb first
  const holder = g?.pages.find((p) => p.orb && (p.path === path || p.kids?.some((k) => k.path === path)))?.orb;
  const fallback = [...(holder ? [holder] : []), ...(g ? [moveGroupId(g.key)] : []), "move"];
  if (MENU_ORB[path]) return { kind: "orb", ids: [MENU_ORB[path]], label, fallback, missing: notOn(label) };
  if (!IN_BRAIN.has(path)) return null;
  const missing = g?.key === "coach" ? "Coach pages are for admins." : path === "/team-leads" ? "Team Leads is for agents on a team." : notOn(label);
  // the example agent's own orb for a page its map draws natively (lib/newToSort.ts DEMO_NTS_NODE)
  const alt = path === "/contacts/visitors" ? ["move-4"] : [];
  return { kind: "page", path, label, alt, fallback, missing };
}

/** ?open=<name>: a Brain orb, a product, a group, or any in-Brain page by its path without the slash. */
export function openTarget(name: string): Arrival | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  if (n === "getting-started") return { kind: "orb", ids: [ID.start], label: "Getting started", fallback: ["go"], missing: "Getting started is done." };
  if (n === ID.growth || n.startsWith(`${ID.growth}:`)) return { kind: "orb", ids: n === ID.growth ? [ID.growth] : [name.trim(), ID.growth], label: "ONE Growth", fallback: [], missing: notOn("ONE Growth") };
  if (n === "team") return { kind: "orb", ids: [ID.team], label: "Team", fallback: ["go"], missing: "Team is for team leads." };
  // ONE YOU's groups (Parry, 19 Oct); Goals keeps landing on the Goals tool itself, inside its group
  if (n === "today") return { kind: "orb", ids: [ID.today], label: "Today", fallback: ["go"], missing: notOn("Today") };
  if (n === "this-week") return { kind: "orb", ids: [ID.week], label: "This week", fallback: ["go"], missing: notOn("This week") };
  if (n === "coaching") return { kind: "orb", ids: [ID.coaching], label: "Coaching", fallback: ["go"], missing: "Coaching is for coaches." };
  if (n === "goals") return { kind: "orb", ids: [ID.goals], label: "Goals", fallback: ["go"], missing: notOn("Goals") };
  if (n === "google-profile") return page(GBP_ADDRESS);
  const p = PRODUCTS[n];
  if (p) return { kind: "orb", ids: [p[0]], label: p[1], fallback: [], missing: notOn(p[1]) };
  return group(n) ?? page(`/${n}`);
}

/**
 * What /dashboard<path> and ?open=<name> name, the address first; null for the Brain itself. `path` is the part after
 * /dashboard ("/profile"), or null.
 */
export function arrivalFor(path: string | null | undefined, open: string | null | undefined, contact?: string | null): Arrival | null {
  const p = path ? path.replace(/\/+$/, "") : "";
  // One named person (/dashboard/contacts/<uuid>, or ?contact=<uuid> on /dashboard): the Contacts place with that contact
  // open. Any other id lands on Contacts itself.
  const m = /^\/contacts\/(.+)$/.exec(p);
  const cid = m ? contactIdOf(m[1]) : p === "" || p === "/dashboard" ? contactIdOf(contact) : null;
  if (cid || (m && !page(p))) {
    const c = page("/contacts");
    return c && cid && c.kind !== "gbp" ? { ...c, contact: cid } : c;
  }
  if (p && p !== "/dashboard") {
    const a = page(p) ?? (/^\/[a-z0-9-]+$/.test(p) ? openTarget(p.slice(1)) : null);
    if (a) return a;
  }
  return open ? openTarget(open) : null;
}

/** The in-Brain address part an arrival keeps on the address bar after sign-in, or null. */
export const isArrivalPath = (path: string) => !!arrivalFor(path, null);

/** The graph id an in-Brain page uses when the agent's map has its own page orb (for the first paint). */
export const arrivalFirstId = (a: Arrival | null): string | null => (!a || a.kind === "gbp" ? null : a.kind === "page" ? movePageId(a.path) : a.ids[0]);
