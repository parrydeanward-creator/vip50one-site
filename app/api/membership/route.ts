import { masterClient } from "@/lib/server/auth.ts";
import { RETURN_URL } from "@/lib/membership.ts";

// My Profile > Membership: the signed-in agent's own plan (their own user_profiles row, by row-level security), and
// the Stripe billing portal link from MASTER's create-billing-portal function, called with the agent's own session.

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

async function who() {
  const sb = await masterClient();
  const { data } = await sb.auth.getClaims();
  const id = data?.claims?.sub;
  return typeof id === "string" ? { sb, id } : null;
}

export async function GET() {
  const me = await who();
  if (!me) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { data } = await me.sb
    .from("user_profiles")
    .select("one_plan, growth_addon, subscription_status, access_type, stripe_customer_id")
    .eq("user_id", me.id)
    .maybeSingle();
  return Response.json(
    {
      plan: data?.one_plan ?? null,
      growth: data?.growth_addon === true,
      status: data?.subscription_status ?? null,
      access: data?.access_type ?? null,
      stripe: !!data?.stripe_customer_id,
    },
    { headers: noStore },
  );
}

export async function POST() {
  const me = await who();
  if (!me) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { data, error } = await me.sb.functions.invoke("create-billing-portal", { body: { return_url: RETURN_URL } });
  const url = (data as { ok?: boolean; url?: unknown } | null)?.url;
  if (error || typeof url !== "string" || !/^https:\/\/billing\.stripe\.com\//.test(url)) {
    return Response.json({ error: "Billing could not open just now. Try again in a minute." }, { status: 502, headers: noStore });
  }
  return Response.json({ url }, { headers: noStore });
}
