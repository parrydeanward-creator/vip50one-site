import { masterClient } from "@/lib/server/auth.ts";
import { NOTIFY_LABEL, readChange } from "@/lib/notifyPrefs.ts";

// My Profile > Notifications: the agent's own notification_preferences row (row-level security: auth.uid() = user_id),
// read and written with the agent's own MASTER session. No secret.

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
    .from("notification_preferences")
    .select("dm_notifications_enabled, community_notifications_enabled")
    .eq("user_id", me.id)
    .maybeSingle();
  return Response.json(
    { dm: data?.dm_notifications_enabled ?? true, community: data?.community_notifications_enabled ?? true },
    { headers: noStore },
  );
}

export async function POST(req: Request) {
  const me = await who();
  if (!me) return Response.json({ error: "Sign in first." }, { status: 401 });
  const change = readChange(await req.json().catch(() => null));
  if (!change) return Response.json({ error: "Nothing to change." }, { status: 400 });
  const { error } = await me.sb
    .from("notification_preferences")
    .upsert({ user_id: me.id, [NOTIFY_LABEL[change.key].column]: change.on }, { onConflict: "user_id" });
  if (error) return Response.json({ error: "That didn't save. Try again." }, { status: 502, headers: noStore });
  return Response.json({ ok: true }, { headers: noStore });
}
