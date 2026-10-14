// My Profile > Membership (Parry, 14 Oct: every Classic My Profile item on the Brain's too). The plan comes from
// MASTER user_profiles (one_plan, growth_addon: ENTITLEMENT.md); "Manage billing" opens Stripe's own portal through
// MASTER's create-billing-portal function, only for an agent with a Stripe customer. Prices are never shown here:
// the agent sees them on Stripe.

export const membershipUrl = "/api/membership";
export const RETURN_URL = "https://www.vip50one.com/dashboard/profile";

export interface Membership {
  plan: "relationship" | "complete" | null;
  growth: boolean;
  status: string | null;
  access: string | null;
  stripe: boolean;
}

export function readMembership(raw: unknown): Membership | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!("plan" in r)) return null;
  return {
    plan: r.plan === "relationship" || r.plan === "complete" ? r.plan : null,
    growth: r.growth === true,
    status: typeof r.status === "string" ? r.status : null,
    access: typeof r.access === "string" ? r.access : null,
    stripe: r.stripe === true,
  };
}

/** "ONE Complete + ONE Growth" from the plan; "No plan yet" without one. */
export function planName(m: Membership): string {
  const base = m.plan === "complete" ? "ONE Complete" : m.plan === "relationship" ? "ONE Relationship" : "";
  if (!base) return m.growth ? "ONE Growth" : "No plan yet";
  return m.growth ? `${base} + ONE Growth` : base;
}

/** The plain line under the plan name, and whether it needs the agent (a payment problem). */
export function standing(m: Membership): { text: string; warn: boolean } {
  if (m.status === "past_due" || m.status === "in_grace_period") return { text: "Payment problem. Update your card in billing.", warn: true };
  if (m.status === "trialing") return { text: "Free trial. Billing starts when the trial ends.", warn: false };
  if (m.status === "expired" || m.status === "canceled") return { text: "Ended. Choose a plan to come back.", warn: true };
  if (m.access === "comp") return { text: "Comped: nothing to pay.", warn: false };
  if (m.access === "vip" && !m.stripe) return { text: "Included with your coaching membership.", warn: false };
  if (m.status === "active") return { text: "Active.", warn: false };
  return { text: m.plan ? "Active." : "Choose a plan to start.", warn: !m.plan };
}
