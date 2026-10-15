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
    if (key && label) steps.push({ key, label, done: s.done === true, skipped: s.skipped === true });
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
