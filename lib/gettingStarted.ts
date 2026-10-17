import type { GraphEdge, GraphNode } from "./graph/types.ts";
import { MOVE_URL } from "./host.ts";

// GETTING-STARTED.md (Parry, 16 Oct: "an agent facing side onboarding that helps them navigate through things in the
// beginning"; "yes on order and yes on badge and xp"). One list, kept in MASTER and answered by ONE MOVE's
// GET /api/brain/getting-started; the Brain shows it as the "Getting started" orb at the top of ONE YOU, pulsing yellow
// until done. A step ticks itself when ONE sees it done: the agent never ticks one by hand. It replaces the team
// welcome (TEAM-ONBOARDING §3); the team lead's Onboarding board reads the same list with `?agent=`.

export const startUrl = `${MOVE_URL}/api/brain/getting-started`;
export const startAgentUrl = (agent: string) => `${startUrl}?agent=${encodeURIComponent(agent)}`;
export const START_NODE = "go-start";
/** The Brain's own route that records a film played to the end (app/api/start/film). */
export const filmUrl = "/api/start/film";
/** films:a is "What everything means", films:b the ONE GO tour; anything else is refused. */
export const filmKey = (f: unknown): "films:a" | "films:b" | null => (f === "a" ? "films:a" : f === "b" ? "films:b" : null);
/** The keys in Parry's order (GETTING-STARTED §2). */
export const START_KEYS = ["profile", "voice", "go", "calendar", "vips", "goals", "pulse_modes", "plan", "commitments", "website", "films", "challenge"] as const;

export interface StartSub { key: string; label: string; done: boolean; needed: boolean }
export interface StartStep {
  key: string;
  n: number;
  label: string;
  why: string;
  minutes: number;
  done: boolean;
  fits: boolean;
  optional: boolean;
  url: string | null;
  line: string | null;
  subs: StartSub[];
}
export interface Start {
  steps: StartStep[];
  done: number;
  of: number;
  next: string | null;
  folded: boolean;
  finishedAt: string | null;
  badge: { name: string; xp: number; earned: boolean };
}

const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);
/** Only a web link leaves the Brain (never javascript: or a data: link from a bad answer). */
const link = (v: unknown) => {
  const s = str(v, 500);
  return s && /^https:\/\//.test(s) ? s : null;
};

/** The route's answer, checked; null when it is not one (not live yet, signed out, refused). */
export function readStart(j: unknown): Start | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.steps)) return null;
  const seen = new Set<string>();
  const steps: StartStep[] = [];
  for (const x of r.steps as Record<string, unknown>[]) {
    const key = str(x?.key, 30), label = str(x?.label, 80);
    if (!key || !label || seen.has(key)) continue;
    seen.add(key);
    const subs: StartSub[] = [];
    for (const s of Array.isArray(x.subs) ? (x.subs as Record<string, unknown>[]) : []) {
      const sk = str(s?.key, 40), sl = str(s?.label, 80);
      if (sk && sl) subs.push({ key: sk, label: sl, done: s.done === true, needed: s.needed !== false });
    }
    steps.push({
      key,
      n: int(x.n) ?? steps.length + 1,
      label,
      why: str(x.why, 240) ?? "",
      minutes: int(x.minutes) ?? 0,
      done: x.done === true,
      fits: x.fits !== false,
      optional: x.optional === true,
      url: link(x.url),
      line: str(x.line, 160),
      subs,
    });
  }
  if (!steps.length) return null;
  steps.sort((a, b) => a.n - b.n);
  const counted = steps.filter((s) => s.fits && !s.optional);
  const done = int(r.done) ?? counted.filter((s) => s.done).length;
  const of = int(r.of) || counted.length;
  const b = r.badge && typeof r.badge === "object" ? (r.badge as Record<string, unknown>) : {};
  const next = str(r.next, 30);
  return {
    steps,
    done: Math.min(done, of),
    of,
    next: next && steps.some((s) => s.key === next) ? next : (counted.find((s) => !s.done)?.key ?? null),
    folded: r.folded === true,
    finishedAt: str(r.finished_at, 40),
    badge: { name: str(b.name, 40) ?? "Launched", xp: int(b.xp) ?? 100, earned: b.earned === true },
  };
}

/** The steps that fit the agent's package, in order (GETTING-STARTED §1: only those show). */
export const shownSteps = (s: Start) => s.steps.filter((x) => x.fits);

/** "4 of 11" */
export const startLine = (s: Start) => `${s.done} of ${s.of}`;

export const finished = (s: Start) => s.badge.earned || (s.of > 0 && s.done >= s.of);

/** "About 10 minutes" */
export const minutesWords = (m: number) => (m <= 0 ? null : `About ${m} ${m === 1 ? "minute" : "minutes"}`);

/** "Launched: +100 XP" once earned. */
export const badgeLine = (s: Start) => (s.badge.earned ? `${s.badge.name}: +${s.badge.xp} XP` : null);

/**
 * Where each step's one button goes, the Brain's own place first (ecosystem brief, 16 Oct): My Profile, its Pulse
 * section, the Goals orb, Plan my day, This week's commitments, the two films, the 90-Day Challenge orb. Anything
 * else follows the route's link: a ONE MOVE page the Brain opens inside itself when it has it.
 */
export type StartPlace =
  | { kind: "profile"; hash: string | null }
  | { kind: "orb"; id: string }
  | { kind: "films" }
  | { kind: "url"; url: string };

export function placeFor(step: StartStep, ids: { goals: string; plan: string; week: string; challenge: string }): StartPlace | null {
  switch (step.key) {
    case "profile":
      return { kind: "profile", hash: null };
    case "voice":
    case "pulse_modes":
      return { kind: "profile", hash: "pulse" };
    case "goals":
      return { kind: "orb", id: ids.goals };
    case "plan":
      return { kind: "orb", id: ids.plan };
    case "commitments":
      return { kind: "orb", id: ids.week };
    case "films":
      return { kind: "films" };
    case "challenge":
      return { kind: "orb", id: ids.challenge };
    default:
      return step.url ? { kind: "url", url: step.url } : null;
  }
}

/** A ONE MOVE address's path ("/calendar"), so the Brain can open its own copy of that page; null for anything else. */
export function movePathOf(url: string): string | null {
  try {
    const u = new URL(url);
    return u.origin === MOVE_URL ? u.pathname : null;
  } catch {
    return null;
  }
}

/** The button's words: "Open My Profile", "Open Goals", "Watch the films"... */
export function buttonWords(p: StartPlace | null): string {
  if (!p) return "Open";
  if (p.kind === "films") return "Watch the films";
  if (p.kind === "profile") return p.hash === "pulse" ? "Open Pulse in My Profile" : "Open My Profile";
  if (p.kind === "url") return /apps\.apple\.com|play\.google\.com/.test(p.url) ? "Get ONE GO" : "Go there";
  return "Go there";
}

/**
 * The Getting started orb, first at the top of ONE YOU (highest importance), "4 of 11" beside it, pulsing yellow until
 * done (follow the pulse). Folded (finished, or past day 30) it leaves ONE YOU unless the agent reopened it from the
 * menu. None while the route has not answered, and none when ONE YOU is locked.
 */
export function withStartNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, s: Start | null, reopened = false): G {
  const nodes = g.nodes.filter((n) => n.id !== START_NODE);
  const edges = g.edges.filter((e) => e.target !== START_NODE);
  const go = g.nodes.find((n) => n.id === "go");
  if (!go || go.locked || !s || (s.folded && !reopened)) return { ...g, nodes, edges };
  const done = finished(s);
  const next = s.steps.find((x) => x.key === s.next);
  nodes.push({
    id: START_NODE,
    type: "feature",
    label: "Getting started",
    secondaryLabel: startLine(s),
    parentId: "go",
    product: "go",
    importance: 1.5,
    status: done ? "healthy" : "attention",
    summary: done
      ? `Every step done. ${badgeLine(s) ?? "Launched"}.`
      : `Your first days with ONE, one step at a time. Each step ticks itself when ONE sees it done.${next ? ` Next: ${next.label}.` : ""}`,
  });
  edges.push({ id: `go>${START_NODE}`, source: "go", target: START_NODE, relationshipType: done ? "belongs_to" : "requires_action", strength: 1 });
  return { ...g, nodes, edges };
}

/** The menu row's line while the list is folded: "4 of 11 done. Reopen your first-days list." */
export const startMenuLine = (s: Start) => (finished(s) ? `All done. ${badgeLine(s) ?? ""}`.trim() : `${startLine(s)} done. Reopen your first-days list.`);

// ---- the example agent (demo and tour): 4 of 11 done, no network -----------------------------------------------------

const MOVE = MOVE_URL;
export function demoStart(): Start {
  const st = (n: number, key: string, label: string, why: string, minutes: number, done: boolean, url: string, extra: Record<string, unknown> = {}) => ({ key, n, label, why, minutes, done, fits: true, optional: false, url, ...extra });
  return readStart({
    steps: [
      st(1, "profile", "My Profile", "Your photo, phone, brokerage, licence and a few things about you: every page and Pulse use them.", 10, true, `${MOVE}/profile`),
      st(2, "voice", "Teach Pulse to sound like you", "Five minutes talking to Pulse, then pick its voice: every draft sounds like you.", 5, true, `${MOVE}/profile`),
      st(3, "go", "ONE GO on your phone", "Your day, your VIPs and Pulse in your pocket, with reminders.", 3, true, "https://apps.apple.com/app/id6738675733"),
      st(4, "calendar", "Connect your calendar", "Pulse plans around what is already on it.", 2, true, `${MOVE}/calendar`),
      st(5, "vips", "Choose your first VIPs", "Start with 10 of the people who already love you.", 10, false, `${MOVE}/contacts`, { line: "6 of 10 so far." }),
      st(6, "goals", "Set your goals", "Closings, referrals and income for your year: Pulse works back to each week.", 3, false, `${MOVE}/profile/goals`),
      st(7, "pulse_modes", "Choose how Pulse helps", "Off, Ask me or Autopilot for each of Pulse's helpers. Decide later is fine.", 2, false, `${MOVE}/profile`),
      st(8, "plan", "Your first Plan my day", "Pulse lays out your day; tap Looks good.", 2, false, "https://www.vip50one.com/dashboard"),
      st(9, "commitments", "Set this week's commitments", "Up to 5 things you will do this week, checked on Friday.", 3, false, `${MOVE}/weekly-review`),
      st(10, "website", "Your website and your personal page", "Check your page, send yourself a test message and finish what fits your plan.", 15, false, `${MOVE}/profile/agent-hub`, {
        subs: [
          { key: "site:page", label: "Check your personal page", done: true, needed: true },
          { key: "site:test_lead", label: "Send yourself a test message from your site", done: false, needed: true },
          { key: "site:reviews", label: "Show a client review on your site", done: false, needed: false },
          { key: "site:published", label: "Publish your site from the builder", done: false, needed: true },
          { key: "site:pulse", label: "Change something with Pulse", done: false, needed: true },
          { key: "site:domain", label: "Your own domain", done: false, needed: false },
          { key: "site:blog", label: "Choose how your blog gets written", done: false, needed: true },
        ],
      }),
      st(11, "films", "Watch the two short tour films", "Two short films that show where everything is.", 10, false, "https://www.vip50one.com/dashboard"),
      st(12, "challenge", "Optional: start the 90-Day Challenge", "Ninety days of the daily habits, with others doing it too.", 5, false, `${MOVE}/challenge`, { optional: true }),
    ],
    done: 4,
    of: 11,
    next: "vips",
    folded: false,
    finished_at: null,
    badge: { name: "Launched", xp: 100, earned: false },
  })!;
}
