import { masterClient } from "@/lib/server/auth.ts";
import { addDays, denverDay } from "@/lib/askTools.ts";
import { FEED_DAYS, buildFeed, type FeedRows } from "@/lib/timelineFeed.ts";

// The timeline slider's dated feed (lib/timelineFeed.ts): the signed-in agent's own MASTER rows, read with their own
// session. Every read also carries .eq("user_id", id): admins may read every contact, and the feed is only ever the
// agent's own. Read only; no secret.

export const dynamic = "force-dynamic";

const VIP_COLS =
  "id, first_name, last_name, birthday, spouse_birthday, anniversary, home_purchase_date, value_touch_personal_note_at, value_touch_dropby_gift_at, value_touch_face_to_face_at";

export async function GET() {
  const sb = await masterClient();
  const { data: c } = await sb.auth.getClaims();
  const id = c?.claims?.sub;
  if (typeof id !== "string") return Response.json({ error: "Sign in first." }, { status: 401 });
  const today = denverDay(new Date());
  const from = addDays(today, -FEED_DAYS - 1);
  const to = addDays(today, FEED_DAYS);
  const [touches, closings, referrals, leads, tasks, vips] = await Promise.all([
    sb.from("contact_touches").select("contact_id, touch_type, touched_at").eq("user_id", id).gte("touched_at", `${from}T00:00:00Z`).order("touched_at").limit(3000),
    sb.from("agent_closings").select("closed_on, contact_id, side, price").eq("user_id", id).gte("closed_on", from).lte("closed_on", to),
    sb.from("referrals").select("created_at, referred_name, referrer_contact_id").eq("user_id", id).gte("created_at", `${from}T00:00:00Z`),
    sb.from("contacts").select("id, first_name, last_name, created_at, source_label").eq("user_id", id).is("archived_at", null).gte("created_at", `${from}T00:00:00Z`).order("created_at").limit(2000),
    sb.from("tasks").select("title, due_date, contact_id").eq("user_id", id).or("completed.is.null,completed.eq.false").gt("due_date", today).lte("due_date", to).limit(500),
    sb.from("contacts").select(VIP_COLS).eq("user_id", id).is("archived_at", null).in("contact_tier", ["vip50", "vip100"]).limit(1000),
  ]);
  const rows: FeedRows = {
    today,
    touches: (touches.data ?? []) as FeedRows["touches"],
    closings: (closings.data ?? []) as FeedRows["closings"],
    referrals: (referrals.data ?? []) as FeedRows["referrals"],
    leads: (leads.data ?? []) as FeedRows["leads"],
    tasks: (tasks.data ?? []) as FeedRows["tasks"],
    vips: (vips.data ?? []) as Record<string, unknown>[],
    names: new Map(),
  };
  // Names for the rows that carry only a contact id.
  const want = new Set<string>();
  for (const t of rows.touches) if (t.contact_id) want.add(t.contact_id);
  for (const x of rows.closings) if (x.contact_id) want.add(x.contact_id);
  for (const x of rows.referrals) if (x.referrer_contact_id) want.add(x.referrer_contact_id);
  for (const x of rows.tasks) if (x.contact_id) want.add(x.contact_id);
  const ids = [...want];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await sb.from("contacts").select("id, first_name, last_name").eq("user_id", id).in("id", ids.slice(i, i + 200));
    for (const p of (data ?? []) as { id: string; first_name: string | null; last_name: string | null }[]) {
      const n = [p.first_name, p.last_name].filter((x) => x?.trim()).map((x) => x!.trim()).join(" ");
      if (n) rows.names.set(p.id, n);
    }
  }
  return Response.json({ dated: buildFeed(rows) }, { headers: { "Cache-Control": "no-store" } });
}
