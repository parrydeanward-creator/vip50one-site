import { masterClient } from "@/lib/server/auth.ts";

// My Profile > Badges: the signed-in agent's own badges, with their own MASTER session. my_weekly_badges() reads
// auth.uid() itself; user_badges is filtered to the agent as well as by row-level security. No secret.

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = await masterClient();
  const { data: c } = await sb.auth.getClaims();
  const id = c?.claims?.sub;
  if (typeof id !== "string") return Response.json({ error: "Sign in first." }, { status: 401 });
  const [{ data: wk }, { data: all }, { data: mine }] = await Promise.all([
    sb.rpc("my_weekly_badges"),
    sb.from("badges").select("id, name, description, category, milestone_count").neq("category", "weekly").order("milestone_count"),
    sb.from("user_badges").select("badge_id, is_earned, earned_at, current_progress").eq("user_id", id),
  ]);
  const by = new Map(((mine ?? []) as Record<string, unknown>[]).map((u) => [u.badge_id as string, u]));
  const weekly = ((wk as { badges?: Record<string, unknown>[] } | null)?.badges ?? []).map((b) => ({
    name: b.name, target: b.target, count: b.count, earned: b.earned_this_week === true, times: b.times_earned,
  }));
  const milestones = ((all ?? []) as Record<string, unknown>[]).map((b) => {
    const u = by.get(b.id as string);
    return { name: b.name, description: b.description, target: b.milestone_count, progress: u?.current_progress ?? 0, earned: u?.is_earned === true, earned_at: u?.earned_at ?? null };
  });
  return Response.json({ weekly, milestones }, { headers: { "Cache-Control": "no-store" } });
}
