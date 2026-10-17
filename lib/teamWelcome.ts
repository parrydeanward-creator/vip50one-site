import { MOVE_URL } from "./host.ts";

// The team ads consent (TEAM-ONBOARDING §3), on My Profile (components/brain/ProfileCards.tsx). The team welcome's six
// steps that used to open over the Brain are gone (16 Oct): the Getting started orb at the top of ONE YOU is the one
// first-days list (GETTING-STARTED §1, lib/gettingStarted.ts). ONE sends nothing.

export const adsConsentUrl = `${MOVE_URL}/api/brain/team/ads-consent`;

/** The team-ads consent words (walker 14 Oct, Parry approved), the same in Classic. */
export const CONSENT_LINE = "Team ads: the team lead may run ads that show your name and listings. The team pays. You can turn this off any time in My Profile.";

export interface AdsConsent { team: string; on: boolean; lead: boolean }

/** GET /api/brain/team/ads-consent: null when not on a team. `lead` (owner or admin) hides the switch: the lead runs the ads. */
export function readAdsConsent(j: unknown): AdsConsent | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (typeof r.team !== "string" || !r.team.trim()) return null;
  return { team: r.team.trim().slice(0, 80), on: typeof r.consented_at === "string" && !!r.consented_at, lead: r.role === "owner" || r.role === "admin" };
}
