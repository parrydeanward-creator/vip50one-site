import type { GraphEdge, GraphNode } from "./graph/types.ts";
import { shownSteps, type Start } from "./gettingStarted.ts";

// TEAM-ONBOARDING §2.3 (vip50-web-crm#250): the team lead's Onboarding board in the Brain, one orb per member still
// setting up (their first 30 days), following the pulse: red when nothing is done by day 7, yellow by day 3. The Nudge
// is a note for the lead to send from their own phone; ONE sends nothing. Since Parry, 16 Oct 17:07 MT ("move to one
// team orb"), the Onboarding orb is one of the Team orb's three parts (lib/teamHub.ts), and each member's steps are their
// own Getting started list (GETTING-STARTED §4: "reads these same steps, not its own six"), read with `?agent=`.

export const onboardingUrl = "https://move.vip50one.com/api/brain/team/onboarding";
export const ONB_NODE = "go-onboarding";

export interface OnbStep { key: string; label: string; done: boolean }
export interface OnbMember {
  id: string;
  name: string;
  day: number;
  done: number;
  of: number;
  status: string;
  next: string | null;
  steps: OnbStep[];
  urgency: "now" | "today" | null;
  readyForLeads: boolean;
  inRotation: boolean;
  nudge: string | null;
  nudgeSms: string | null;
}

const str = (v: unknown, max = 160) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : 0);

/** The board, or null when the route did not answer (not a lead, or not live yet): then no orb shows. */
export function readOnboarding(j: unknown): OnbMember[] | null {
  if (!j || typeof j !== "object" || !Array.isArray((j as { members?: unknown }).members)) return null;
  const out: OnbMember[] = [];
  const seen = new Set<string>();
  for (const x of (j as { members: Record<string, unknown>[] }).members) {
    const id = str(x?.user_id, 60);
    const name = str(x?.name, 80);
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    const steps: OnbStep[] = [];
    for (const s of Array.isArray(x.steps) ? (x.steps as Record<string, unknown>[]) : []) {
      const key = str(s?.key, 30), label = str(s?.label, 60);
      if (key && label) steps.push({ key, label, done: s.done === true });
    }
    const sms = str(x.nudge_sms, 2000);
    out.push({
      id,
      name,
      day: Math.max(1, int(x.day)),
      done: int(x.done),
      of: int(x.of) || steps.length,
      status: str(x.status, 60) ?? "",
      next: str(x.next, 60),
      steps,
      urgency: x.urgency === "now" || x.urgency === "today" ? x.urgency : null,
      readyForLeads: x.ready_for_leads === true,
      inRotation: x.in_rotation === true,
      nudge: str(x.nudge, 600),
      nudgeSms: sms && sms.startsWith("sms:") ? sms : null,
    });
  }
  return out;
}

export const onbNodeId = (id: string) => `${ONB_NODE}:${id}`;
export const onbIdOf = (nodeId: string) => (nodeId.startsWith(`${ONB_NODE}:`) ? nodeId.slice(ONB_NODE.length + 1) : null);

const statusOf = (m: OnbMember): GraphNode["status"] => (m.urgency === "now" ? "action" : m.urgency === "today" ? "attention" : "healthy");

/** "Day 4 · 2 of 6 done · next: ONE GO on their phone" */
export const onbLine = (m: OnbMember) => [`Day ${m.day}`, m.status, m.next ? `next: ${m.next}` : null].filter(Boolean).join(" · ");

/** The Onboarding orb under ONE YOU, beside Team, and one orb per member setting up. */
export function withOnboardingNodes<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, ms: OnbMember[] | null, removed: string[] = [], parent = "go"): G {
  const mine = (id: string) => id === ONB_NODE || id.startsWith(`${ONB_NODE}:`);
  const nodes = g.nodes.filter((n) => !mine(n.id));
  const edges = g.edges.filter((e) => !mine(e.target));
  const go = g.nodes.find((n) => n.id === parent);
  if (!go || go.locked || !ms?.length) return { ...g, nodes, edges };
  nodes.push({
    id: ONB_NODE,
    type: "feature",
    label: "Onboarding",
    secondaryLabel: `${ms.length} setting up`,
    parentId: parent,
    product: "go",
    importance: 0.97,
    status: "healthy",
    summary: `New team members in their first 30 days: their Getting started steps, and a Nudge for you to send from your phone.${removed.length ? ` ${removed.join(". ")}.` : ""}`,
  });
  edges.push({ id: `${parent}>${ONB_NODE}`, source: parent, target: ONB_NODE, relationshipType: "belongs_to", strength: 1 });
  ms.slice(0, 15).forEach((m, i) => {
    const id = onbNodeId(m.id);
    nodes.push({ id, type: "person", label: m.name, secondaryLabel: onbLine(m), parentId: ONB_NODE, product: "go", importance: 0.9 - i * 0.02, status: statusOf(m), summary: m.readyForLeads ? "Their Getting started steps, from what they have actually done. Ready for leads." : "Their Getting started steps, from what they have actually done." });
    edges.push({ id: `${ONB_NODE}>${id}`, source: ONB_NODE, target: id, relationshipType: m.urgency ? "requires_action" : "belongs_to", strength: 1 });
  });
  return { ...g, nodes, edges };
}

/** Yellow by day 3, red by day 7, when nothing on the Getting started list is done yet (walker 16 Oct, item 1). */
export const START_YELLOW_DAY = 3;
export const START_RED_DAY = 7;
export function startUrgency(day: number, done: number): OnbMember["urgency"] {
  if (done > 0) return null;
  return day >= START_RED_DAY ? "now" : day >= START_YELLOW_DAY ? "today" : null;
}

/** The member's own Getting started list (`?agent=`) in place of the board's old six steps; unchanged until it answers. */
export function withStart(m: OnbMember, s: Start | null): OnbMember {
  if (!s) return m;
  const steps = shownSteps(s).filter((x) => !x.optional).map((x) => ({ key: x.key, label: x.label, done: x.done }));
  const next = s.steps.find((x) => x.key === s.next)?.label ?? null;
  return { ...m, steps, done: s.done, of: s.of, status: `${s.done} of ${s.of} done`, next, urgency: startUrgency(m.day, s.done) };
}

/** The example board (demo and tour): one member on day 8 with nothing done (red), one on day 2 with 3 done. */
export const demoOnboarding = (): OnbMember[] => {
  const keys = ["profile", "voice", "go", "calendar", "vips", "goals", "pulse_modes", "plan", "commitments", "website", "films"];
  const labels = ["My Profile", "Teach Pulse to sound like you", "ONE GO on your phone", "Connect your calendar", "Choose your first VIPs", "Set your goals", "Choose how Pulse helps", "Your first Plan my day", "Set this week's commitments", "Your website and your personal page", "Watch the two short tour films"];
  const steps = (n: number) => keys.map((key, i) => ({ key, label: labels[i], done: i < n }));
  return (
    readOnboarding({
      members: [
        { user_id: "o1", name: "Kyle Barton", day: 8, done: 0, of: 11, status: "0 of 11 done", next: labels[0], urgency: startUrgency(8, 0), ready_for_leads: false, in_rotation: false, steps: steps(0), nudge: "Hi Kyle, it's Sarah. Quick nudge on your ONE setup: your Getting started list takes about ten minutes to start. Want to do the first step together this week?", nudge_sms: "sms:&body=Hi%20Kyle%2C%20it%27s%20Sarah.%20Quick%20nudge%20on%20your%20ONE%20setup." },
        { user_id: "o2", name: "Angelina Burleigh", day: 2, done: 3, of: 11, status: "3 of 11 done", next: labels[3], urgency: startUrgency(2, 3), ready_for_leads: true, in_rotation: false, steps: steps(3), nudge: null, nudge_sms: null },
      ],
    }) ?? []
  );
};

/** "Bo: removed on Oct 15" lines from the board's `removed` (last 30 days; vip50-web-crm#258). */
export function readRemoved(j: unknown): string[] {
  const list = j && typeof j === "object" && Array.isArray((j as { removed?: unknown }).removed) ? ((j as { removed: Record<string, unknown>[] }).removed) : [];
  return list
    .filter((r) => typeof r?.name === "string" && typeof r.left_at === "string")
    .slice(0, 10)
    .map((r) => {
      const d = new Date(r.left_at as string);
      const when = Number.isNaN(d.getTime()) ? "" : ` on ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Denver" })}`;
      return `${String(r.name).slice(0, 80)}: removed${when}`;
    });
}
