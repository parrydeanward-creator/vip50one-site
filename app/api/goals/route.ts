import { masterClient } from "@/lib/server/auth.ts";
import { goalChange, missingColumn, readAssume } from "@/lib/goals.ts";
import { todayIn } from "@/lib/hwc.ts";

// Goals and the Income Map's own numbers (Parry, 16 Oct, audit 3.4.1 and 3.5.3): the agent's own agent_goals row in
// MASTER, read and written with the agent's own session (row-level security: user_id = auth.uid()). No secret.
// income_assumptions is a column another bot adds; until it exists the answer says so (assumptions_kept: false) and
// the Brain keeps those numbers in the browser, as before.

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const GOALS = "starts_on, closings_goal, referrals_goal, gci_goal";

async function who() {
  const sb = await masterClient();
  const { data } = await sb.auth.getClaims();
  const id = data?.claims?.sub;
  return typeof id === "string" ? { sb, id } : null;
}

export async function GET() {
  const me = await who();
  if (!me) return Response.json({ error: "Sign in first." }, { status: 401, headers: noStore });
  const full = await me.sb.from("agent_goals").select(`${GOALS}, income_assumptions`).eq("user_id", me.id).maybeSingle();
  if (!full.error) {
    const row = full.data as Record<string, unknown> | null;
    const raw = row?.income_assumptions ?? null;
    return Response.json({ goals: row, income_assumptions: raw ? readAssume(raw) : null, assumptions_kept: true }, { headers: noStore });
  }
  if (!missingColumn(full.error)) return Response.json({ error: "ONE couldn't read your goals just now." }, { status: 502, headers: noStore });
  const { data, error } = await me.sb.from("agent_goals").select(GOALS).eq("user_id", me.id).maybeSingle();
  if (error) return Response.json({ error: "ONE couldn't read your goals just now." }, { status: 502, headers: noStore });
  return Response.json({ goals: data, income_assumptions: null, assumptions_kept: false }, { headers: noStore });
}

/** Update the agent's row, or start it (starts_on is required) when there is none yet. */
async function save(me: NonNullable<Awaited<ReturnType<typeof who>>>, fields: Record<string, unknown>, startsOn: string | null) {
  const set = { ...fields, updated_at: new Date().toISOString(), updated_by: me.id };
  const up = await me.sb.from("agent_goals").update(set).eq("user_id", me.id).select("user_id");
  if (up.error) return up.error;
  if (up.data?.length) return null;
  const ins = await me.sb.from("agent_goals").insert({ user_id: me.id, starts_on: startsOn ?? todayIn(), ...set });
  return ins.error ?? null;
}

export async function POST(req: Request) {
  const me = await who();
  if (!me) return Response.json({ error: "Sign in first." }, { status: 401, headers: noStore });
  const change = goalChange(await req.json().catch(() => null));
  if ("error" in change) return Response.json({ error: change.error }, { status: 400, headers: noStore });
  let goalsSaved: boolean | null = null;
  if (Object.keys(change.goals).length) {
    const err = await save(me, change.goals, change.startsOn);
    if (err) return Response.json({ error: "That didn't save. Try again." }, { status: 502, headers: noStore });
    goalsSaved = true;
  }
  // The agent's own goal year start (Parry, 21 Oct): on their row, or a new row from that day.
  if (change.setStart && change.startsOn) {
    if (change.startsOn > todayIn()) return Response.json({ error: "Your goal year has to start on or before today." }, { status: 400, headers: noStore });
    const err = await save(me, { starts_on: change.startsOn }, change.startsOn);
    if (err) return Response.json({ error: "That didn't save. Try again." }, { status: 502, headers: noStore });
    goalsSaved = true;
  }
  let assumptionsSaved: boolean | null = null;
  if (change.assumptions) {
    const err = await save(me, { income_assumptions: change.assumptions }, change.startsOn);
    if (err && !missingColumn(err)) return Response.json({ error: "Your numbers didn't save. Try again.", goals_saved: goalsSaved }, { status: 502, headers: noStore });
    assumptionsSaved = !err;
  }
  return Response.json({ ok: true, goals_saved: goalsSaved, assumptions_saved: assumptionsSaved, assumptions_kept: assumptionsSaved !== false }, { headers: noStore });
}
