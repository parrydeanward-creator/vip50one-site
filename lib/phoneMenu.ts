// The Brain's one menu on a phone (audit stage 2, Parry 14 Oct: "yes agreed on folding in one menu"). Each row has a
// one-line plain description. Growth rows only for agents with ONE Growth; team rows only for team members.

export type MenuAction =
  | { kind: "profile" }
  | { kind: "site"; host?: string; next?: string }
  | { kind: "href"; href: string }
  | { kind: "welcome" }
  | { kind: "signout" };
export interface MenuRow { key: string; label: string; line: string; action: MenuAction }

export interface MenuInput {
  live: boolean;
  growth: boolean;
  siteHost: string | null;
  teamHosts: string[];
  agentTeamHrefs: string[];
  classicUrl: string;
  /** "2 of 6 done" while a team member's welcome is not finished (TEAM-ONBOARDING §3); null otherwise. */
  welcome?: string | null;
}

export function menuRows(m: MenuInput): MenuRow[] {
  if (!m.live) return [];
  const rows: MenuRow[] = [{ key: "profile", label: "My Profile", line: "Your photo and details, used by every product.", action: { kind: "profile" } }];
  if (m.welcome) rows.push({ key: "welcome", label: "Team setup", line: `Your welcome steps: ${m.welcome}.`, action: { kind: "welcome" } });
  if (m.siteHost) rows.push({ key: "site", label: "My website", line: "Edit your site and see who visited.", action: { kind: "site" } });
  if (m.siteHost && m.growth) rows.push({ key: "results", label: "Growth results", line: "Leads, appointments and closings from your ads.", action: { kind: "site", next: "/manage/results" } });
  for (const host of m.teamHosts) {
    rows.push({ key: `team:${host}`, label: "Team website", line: "Your team's site, its pages and its agents.", action: { kind: "site", host } });
    if (m.growth) rows.push({ key: `ads:${host}`, label: "Ad requests", line: "Ads your agents have asked you to run.", action: { kind: "site", host, next: "/manage/ad-requests" } });
  }
  for (const href of m.agentTeamHrefs) rows.push({ key: `ask:${href}`, label: "Ask for an ad", line: "Ask your team lead to run an ad for you.", action: { kind: "href", href } });
  rows.push({ key: "classic", label: "Classic view", line: "ONE MOVE's older screens, if you need them.", action: { kind: "href", href: m.classicUrl } });
  rows.push({ key: "signout", label: "Sign out", line: "Sign out of ONE on this device.", action: { kind: "signout" } });
  return rows;
}

export const HINT = "Tap any orb to see what needs you. Red means right now.";
