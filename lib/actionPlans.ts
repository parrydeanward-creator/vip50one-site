import { MOVE_URL } from "./host.ts";
import type { GraphEdge, GraphNode } from "./graph/types.ts";
import { OUTREACH_PARTS } from "./outreach.ts";

// Action Plans drawn natively (walker 2026-10-17-0245; Parry: "yes"). Opening the Action Plans part of Outreach shows
// each plan as an orb with the people on it as faces round it (the orbs rule: a click brings it to the middle and opens
// its side panel). A plan's panel: its steps as a timeline, who is on which step, how many sends wait for the agent,
// "Add someone to this plan", and in words whether its emails go by themselves. Texts always open on the agent's phone
// for them to send (Parry, 8 Oct); ONE never texts a client. Nothing is switched on here (Parry, 4 Oct).
//
// Routes (ONE MOVE): GET /api/brain/action-plans, POST /api/brain/action-plans/enroll {plan_id, contact_id}.
// The lead card and New to Sort may answer with suggest_plan {plan_id, name}: a one-tap "Start <name>?".

export const actionPlansUrl = `${MOVE_URL}/api/brain/action-plans`;
export const enrollUrl = `${MOVE_URL}/api/brain/action-plans/enroll`;

export type StepKind = "email" | "text" | "call" | "task";
export interface PlanStep { n: number; kind: StepKind; label: string; day: number }
export interface PlanPerson { contactId: string; firstName: string; step: number }
export interface ActionPlan {
  id: string;
  name: string;
  active: boolean;
  trigger: string | null;
  steps: PlanStep[];
  people: PlanPerson[];
  readyToSend: number;
  emailsAuto: boolean;
  /** Always false: Pulse's texts open in the agent's own Messages (LEADS.md §4 v0.3). */
  textsAuto: false;
  /** The labelled example plan (empty list, or the example agent): not a real plan; nothing can be enrolled. */
  example?: boolean;
}
export interface SuggestPlan { planId: string; name: string }

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const str = (v: unknown, max = 200): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const int = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);
const KINDS: StepKind[] = ["email", "text", "call", "task"];

/** One plan from the route, checked; null when it is not one. Steps in order, a person once. */
export function readPlan(v: unknown): ActionPlan | null {
  const o = obj(v);
  const id = str(o?.id, 80), name = str(o?.name, 120);
  if (!o || !id || !name) return null;
  const steps = (Array.isArray(o.steps) ? o.steps : []).flatMap((x) => {
    const s = obj(x);
    const n = int(s?.n), label = str(s?.label, 160), day = int(s?.day);
    return s && n != null && label && KINDS.includes(s.kind as StepKind) ? [{ n, kind: s.kind as StepKind, label, day: day ?? 0 }] : [];
  });
  steps.sort((a, b) => a.n - b.n);
  const seen = new Set<string>();
  const people = (Array.isArray(o.people) ? o.people : []).flatMap((x) => {
    const p = obj(x);
    const contactId = str(p?.contact_id, 80);
    if (!p || !contactId || seen.has(contactId)) return [];
    seen.add(contactId);
    return [{ contactId, firstName: str(p.first_name, 60) ?? "No name", step: int(p.step) ?? 0 }];
  });
  return { id, name, active: o.active !== false, trigger: str(o.trigger, 200), steps, people, readyToSend: int(o.ready_to_send) ?? 0, emailsAuto: o.emails_auto === true, textsAuto: false };
}

/** GET /api/brain/action-plans, checked; null when it is not one. Running plans first, then by name. */
export function readPlans(j: unknown): ActionPlan[] | null {
  const r = obj(j);
  if (!r || !Array.isArray(r.plans)) return null;
  const plans = (r.plans as unknown[]).map(readPlan).filter((p): p is ActionPlan => !!p);
  return plans.sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
}

/** Never suggested from the Brain: a VIP-50 swap does not start New VIP Onboarding (Parry, 4 Oct: no). */
export const NEVER_SUGGEST = /new\s*vip\s*onboarding/i;

/** A route's suggest_plan, checked; null when absent, malformed or New VIP Onboarding. */
export function readSuggestPlan(v: unknown): SuggestPlan | null {
  const o = obj(v);
  const planId = str(o?.plan_id, 80), name = str(o?.name, 120);
  if (!planId || !name || NEVER_SUGGEST.test(name)) return null;
  return { planId, name };
}

// ---- plain words ----------------------------------------------------------------------------------------------------

const KIND_WORD: Record<StepKind, string> = { email: "Email", text: "Text", call: "Call", task: "Task" };
/** "Day 0 · Email · Welcome". */
export const stepLine = (s: PlanStep) => `Day ${s.day} · ${KIND_WORD[s.kind]} · ${s.label}`;
/** "Next for: Ann, Raj" for the people whose next step is this one; null when no one is on it. */
export function nextForLine(plan: ActionPlan, n: number): string | null {
  const names = plan.people.filter((p) => p.step === n).map((p) => p.firstName);
  return names.length ? `Next for: ${names.join(", ")}` : null;
}
export const readyLine = (n: number) => (n ? `${n} ready for you to send` : "Nothing waiting for you to send");
export const emailsLine = (auto: boolean) => (auto ? "Emails: sent automatically" : "Emails: wait for you to send");
export const TEXTS_LINE = "Texts: open on your phone for you to send";
export const peopleLine = (n: number) => (n ? `${n} ${n === 1 ? "person" : "people"} on it` : "No one on it yet");
/** The plan orb's line under its name. */
export const planOrbLine = (p: ActionPlan) => (p.example ? "Example" : !p.active ? "Off" : `${peopleLine(p.people.length)}${p.readyToSend ? ` · ${p.readyToSend} ready` : ""}`);
export const EMPTY_WORDS =
  "An action plan is a set of steps for a contact: an email on day 0, a call on day 2, a text on day 5. Put someone on a plan and each step lands for you on its day. Emails wait for you unless you switch a plan's automatic emails on in ONE MOVE; texts always open on your phone for you to send.";

/** What the person's own step is, in words: "On step 2: Day 2 · Call · Check in", or "Finished". */
export function personStepLine(plan: ActionPlan, contactId: string): string | null {
  const p = plan.people.find((x) => x.contactId === contactId);
  if (!p) return null;
  const s = plan.steps.find((x) => x.n === p.step);
  return s ? `On step ${s.n}: ${stepLine(s)}` : "Finished every step";
}

// ---- orbs -----------------------------------------------------------------------------------------------------------

export const planNodeId = (planId: string) => `plan:${planId}`;
export const planPersonNodeId = (planId: string, contactId: string) => `plan:${planId}:p:${contactId}`;
export const isPlanNode = (id: string) => id.startsWith("plan:") && !id.includes(":p:");
/** Which plan an orb is (the plan orb or one of its faces), or null. */
export function planOf(id: string): { planId: string; contactId: string | null } | null {
  const m = /^plan:(.+?)(?::p:(.+))?$/.exec(id);
  return m ? { planId: m[1], contactId: m[2] ?? null } : null;
}
export const MAX_PLANS = 12;
export const MAX_FACES = 15;

type G = { nodes: GraphNode[]; edges: GraphEdge[] };

/**
 * The plans as orbs inside the Action Plans part (lib/outreach.ts), each with its people as faces. An empty list draws
 * the labelled example plan. Null (not answered yet): no plan orbs. Pure.
 */
export function withPlanNodes<g extends G>(g: g, plans: ActionPlan[] | null): g {
  const nodes = g.nodes.filter((n) => !n.id.startsWith("plan:"));
  const edges = g.edges.filter((e) => !e.target.startsWith("plan:"));
  const ids = OUTREACH_PARTS.find((p) => p.key === "action_plans")!.ids;
  const part = nodes.find((n) => ids.includes(n.id));
  if (!plans || !part || part.locked) return { ...g, nodes, edges };
  // The plan orbs replace the part's old placeholder plan orbs (the example agent's had no steps or people; screen
  // check 17 Oct showed both side by side). Anything inside the part that needs the agent stays.
  const quiet = new Set(nodes.filter((n) => n.parentId === part.id && n.status !== "attention" && n.status !== "action").map((n) => n.id));
  for (const n of nodes) if (n.parentId && quiet.has(n.parentId)) quiet.add(n.id);
  for (let i = nodes.length - 1; i >= 0; i--) if (quiet.has(nodes[i].id)) nodes.splice(i, 1);
  for (let i = edges.length - 1; i >= 0; i--) if (quiet.has(edges[i].target)) edges.splice(i, 1);
  const shown = plans.length ? plans.slice(0, MAX_PLANS) : [examplePlan()];
  shown.forEach((p, i) => {
    const id = planNodeId(p.id);
    nodes.push({
      id,
      type: "feature",
      label: p.name,
      secondaryLabel: planOrbLine(p),
      parentId: part.id,
      product: "move",
      importance: 0.84 - i * 0.02,
      status: p.example || !p.active ? undefined : p.readyToSend ? "attention" : "healthy",
      needCount: !p.example && p.active && p.readyToSend ? p.readyToSend : undefined,
      summary: p.example ? `Example plan, not a real one. ${EMPTY_WORDS}` : p.trigger ? `Starts when: ${p.trigger}` : undefined,
    });
    edges.push({ id: `${part.id}>${id}`, source: part.id, target: id, relationshipType: "belongs_to", strength: 1 });
    p.people.slice(0, MAX_FACES).forEach((x, j) => {
      const fid = planPersonNodeId(p.id, x.contactId);
      nodes.push({
        id: fid,
        type: "person",
        label: x.firstName,
        secondaryLabel: personStepLine(p, x.contactId) ?? undefined,
        parentId: id,
        product: "move",
        importance: 0.7 - j * 0.01,
        // a real contact opens their card (Call / Text / Email); the example people have none
        contactId: p.example ? undefined : x.contactId,
      });
      edges.push({ id: `${id}>${fid}`, source: id, target: fid, relationshipType: "belongs_to", strength: 1 });
    });
  });
  return { ...g, nodes, edges };
}

/** The list with one plan replaced by the route's answer (after an enroll). */
export const withPlan = (plans: ActionPlan[], plan: ActionPlan) => (plans.some((p) => p.id === plan.id) ? plans.map((p) => (p.id === plan.id ? plan : p)) : [...plans, plan]);

// ---- enroll ---------------------------------------------------------------------------------------------------------

export interface EnrollResult { ok: boolean; plan: ActionPlan | null; error: string | null }

/** POST /api/brain/action-plans/enroll. Nothing is sent beyond the plan's own switches; ONE MOVE's words on a refusal. */
export async function enroll(planId: string, contactId: string, f: typeof fetch = fetch): Promise<EnrollResult> {
  try {
    const r = await f(enrollUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan_id: planId, contact_id: contactId }) });
    const j = obj(await r.json().catch(() => null));
    if (!r.ok || !j || j.ok !== true) return { ok: false, plan: null, error: str(j?.error) ?? "ONE MOVE didn't take that. No one was added." };
    return { ok: true, plan: readPlan(j.plan), error: null };
  } catch {
    return { ok: false, plan: null, error: "ONE MOVE didn't answer. No one was added." };
  }
}

// ---- the example ----------------------------------------------------------------------------------------------------

export function examplePlan(): ActionPlan {
  return {
    id: "example",
    name: "Example plan: New buyer follow-up",
    active: true,
    trigger: "A new buyer lead is reached",
    steps: [
      { n: 1, kind: "email", label: "Welcome", day: 0 },
      { n: 2, kind: "call", label: "Check in", day: 2 },
      { n: 3, kind: "text", label: "Homes to look at", day: 5 },
      { n: 4, kind: "email", label: "How it's going", day: 14 },
    ],
    people: [
      { contactId: "example-ann", firstName: "Ann", step: 2 },
      { contactId: "example-raj", firstName: "Raj", step: 3 },
    ],
    readyToSend: 1,
    emailsAuto: false,
    textsAuto: false,
    example: true,
  };
}
