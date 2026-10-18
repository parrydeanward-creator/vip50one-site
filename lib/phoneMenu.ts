// The Brain's one menu on a phone (audit stage 2, Parry 14 Oct: "yes agreed on folding in one menu"). Each row has a
// one-line plain description. Growth rows only for agents with ONE Growth; team rows only for team members.

export type MenuAction =
  | { kind: "profile" }
  | { kind: "gbp" }
  | { kind: "site"; host?: string; next?: string }
  | { kind: "href"; href: string }
  | { kind: "start" }
  | { kind: "help" }
  | { kind: "goTour" }
  | { kind: "billing" }
  | { kind: "addons" }
  | { kind: "signout" };
export interface MenuRow { key: string; label: string; line: string; action: MenuAction }

export interface MenuInput {
  live: boolean;
  growth: boolean;
  siteHost: string | null;
  teamHosts: string[];
  agentTeamHrefs: string[];
  classicUrl: string;
  /** Getting started's line while it is folded out of ONE YOU (GETTING-STARTED §4: done, or past the first 30 days);
   * null while it is on the map. The row reopens it. It replaced the team welcome's "Team setup" row (16 Oct). */
  start?: string | null;
}

export function menuRows(m: MenuInput): MenuRow[] {
  if (!m.live) return [];
  const rows: MenuRow[] = [{ key: "profile", label: "My Profile", line: "Your photo and details, used by every product.", action: { kind: "profile" } }];
  if (m.start) rows.push({ key: "start", label: "Getting started", line: m.start, action: { kind: "start" } });
  if (m.siteHost) rows.push({ key: "site", label: "My website", line: "Edit your site and see who visited.", action: { kind: "site" } });
  if (m.siteHost) rows.push({ key: "gbp", label: "Google Business Profile", line: "Reviews, posts and details on Google.", action: { kind: "gbp" } });
  if (m.siteHost && m.growth) rows.push({ key: "results", label: "Growth results", line: "Leads, appointments and closings from your ads.", action: { kind: "site", next: "/manage/results" } });
  for (const host of m.teamHosts) {
    rows.push({ key: `team:${host}`, label: "Team website", line: "Your team's site, its pages and its agents.", action: { kind: "site", host } });
    if (m.growth) rows.push({ key: `ads:${host}`, label: "Ad requests", line: "Ads your agents have asked you to run.", action: { kind: "site", host, next: "/manage/ad-requests" } });
  }
  for (const href of m.agentTeamHrefs) rows.push({ key: `ask:${href}`, label: "Ask for an ad", line: "Ask your team lead to run an ad for you.", action: { kind: "href", href } });
  rows.push({ key: "billing", label: "My plan and billing", line: "Your plan, card and invoices.", action: { kind: "billing" } });
  rows.push({ key: "addons", label: "Add-ons", line: "Extras for ONE Complete: templates, areas, setup.", action: { kind: "addons" } });
  rows.push({ key: "help", label: "Help: what everything means", line: "The orbs, the colours and the pulses, in 90 seconds.", action: { kind: "help" } });
  // Film B v3, approved by Parry 15 Oct 15:43 MT ("I like it...lets go with that").
  rows.push({ key: "goTour", label: "Watch the ONE GO tour", line: "Your phone app, start to finish, in eleven minutes.", action: { kind: "goTour" } });
  rows.push({ key: "classic", label: "Classic view", line: "ONE MOVE's older screens, if you need them.", action: { kind: "href", href: m.classicUrl } });
  rows.push({ key: "signout", label: "Sign out", line: "Sign out of ONE on this device.", action: { kind: "signout" } });
  return rows;
}

export const HINT = "Tap any orb to see what needs you. Red means right now.";
