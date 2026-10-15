import { MOVE_URL } from "./host.ts";

// TEAM-ONBOARDING §3 (vip50-web-crm#255): a new team member's welcome in the Brain, the same six steps as Classic's
// /team-welcome. Each step is done by doing it (the facts the team lead's board reads) or skipped; ONE sends nothing.

export const welcomeUrl = `${MOVE_URL}/api/brain/team/welcome`;
export const adsConsentUrl = `${MOVE_URL}/api/brain/team/ads-consent`;
export const IOS_APP = "https://apps.apple.com/app/id6738675733";
export const ANDROID_APP = "https://play.google.com/apps/testing/com.vip50app";
export const LATER_KEY = "one.welcome.later";

export interface WelcomeStep { key: string; label: string; done: boolean; skipped: boolean }
export interface Welcome { team: string; steps: WelcomeStep[]; allDone: boolean }

const str = (v: unknown, max = 80) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** The welcome, or null for an agent not on a team (team: null) or when the route did not answer. */
export function readWelcome(j: unknown): Welcome | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  const team = str(r.team);
  if (!team || !Array.isArray(r.steps)) return null;
  const steps: WelcomeStep[] = [];
  for (const s of r.steps as Record<string, unknown>[]) {
    const key = str(s?.key, 20), label = str(s?.label);
    if (key && label) steps.push({ key, label: stepLabel(key, label), done: s.done === true, skipped: s.skipped === true });
  }
  if (!steps.length) return null;
  return { team, steps, allDone: r.all_done === true || steps.every((s) => s.done) };
}

/** "2 of 6 done" */
export const progress = (w: Welcome) => `${w.steps.filter((s) => s.done).length} of ${w.steps.length} done`;

/** The first step not done yet, opened first. */
export const firstOpen = (w: Welcome) => w.steps.find((s) => !s.done)?.key ?? null;

/** "Later" hides the welcome for the rest of today (Denver day), never for good: the menu row stays. */
export function hiddenToday(saved: string | null, today: string): boolean {
  return saved === today;
}

/** Whether the welcome opens on its own: a team member, not finished, not put off today. Never for all_done or no team. */
export function shouldOpen(w: Welcome | null, saved: string | null, today: string): boolean {
  return !!w && !w.allDone && !hiddenToday(saved, today);
}

/** The team-ads consent words (walker 14 Oct, Parry approved), the same in Classic. */
export const CONSENT_LINE = "Team ads: the team lead may run ads that show your name and listings. The team pays. You can turn this off any time in My Profile.";

/** One voice, "you/your" (Parry approved 14 Oct): the step names as the agent reads them. */
const YOUR: Record<string, string> = { app: "ONE GO on your phone" };
export const stepLabel = (key: string, label: string) => YOUR[key] ?? label.replace(/\btheir\b/g, "your");

export interface AdsConsent { team: string; on: boolean; lead: boolean }

/** GET /api/brain/team/ads-consent: null when not on a team. `lead` (owner or admin) hides the switch: the lead runs the ads. */
export function readAdsConsent(j: unknown): AdsConsent | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (typeof r.team !== "string" || !r.team.trim()) return null;
  return { team: r.team.trim().slice(0, 80), on: typeof r.consented_at === "string" && !!r.consented_at, lead: r.role === "owner" || r.role === "admin" };
}

/** The team lead and admins run the ads, so their own consent step counts as done (walker 14 Oct, Parry approved). */
export function leadView(w: Welcome): Welcome {
  const steps = w.steps.map((s) => (s.key === "consent" && !s.done ? { ...s, done: true } : s));
  return { ...w, steps, allDone: steps.every((s) => s.done) };
}
