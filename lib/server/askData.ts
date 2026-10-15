import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  TOUCH_DB, addDays, capped, classOf, denverDay, likeSafe, nameOf, notTouched, phoneOf, priceRange, specialDays, tierValues, toolInput,
  type ToolName, type ToolPerson, type ToolResult,
} from "../askTools.ts";

// Runs Pulse's read-only lookups (lib/askTools.ts) against MASTER with the agent's own session. Every read carries
// .eq("user_id", userId) as well as row-level security: admins may read every contact and anyone may read the
// leaderboard's tracker rows, and Pulse must only ever see the asking agent's own.

export interface AskCtx {
  sb: SupabaseClient;
  userId: string;
  today: string;
}

const CONTACT_COLS = "id, first_name, last_name, phone, phone_e164, contact_tier, last_touch_date";
const PAGE = 1000;

/** Up to `max` rows across pages (MASTER answers at most 1000 rows a request). */
async function all<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown }>, max = 5000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += PAGE) {
    const data = (await page(from, from + PAGE - 1)).data as T[] | null;
    if (!data?.length) break;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

function contactsQuery(ctx: AskCtx, cols: string, tier: ReturnType<typeof tierValues>) {
  let q = ctx.sb.from("contacts").select(cols).eq("user_id", ctx.userId).is("archived_at", null);
  if (tier) q = q.in("contact_tier", tier);
  return q;
}

export async function runTool(name: ToolName, raw: unknown, ctx: AskCtx): Promise<ToolResult> {
  const today = ctx.today;
  switch (name) {
    case "contacts_not_touched": {
      const i = toolInput(name, raw) as { days: number; touch_type: keyof typeof TOUCH_DB | "any"; tier: Parameters<typeof tierValues>[0] };
      const cutoff = addDays(today, -i.days);
      const rows = await all<Record<string, unknown>>((a, b) => contactsQuery(ctx, CONTACT_COLS, tierValues(i.tier)).order("id").range(a, b));
      // A fresh query per page: a query builder keeps every .order() it is given.
      const touchQ = () => {
        const q = ctx.sb.from("contact_touches").select("contact_id, touched_at").eq("user_id", ctx.userId);
        return i.touch_type !== "any" ? q.in("touch_type", TOUCH_DB[i.touch_type]) : q.gte("touched_at", `${cutoff}T00:00:00Z`);
      };
      const touches = await all<{ contact_id: string; touched_at: string }>((a, b) => touchQ().order("touched_at", { ascending: false }).range(a, b), 20000);
      const latest = new Map<string, string>();
      for (const t of touches) if (t.contact_id && !latest.has(t.contact_id)) latest.set(t.contact_id, t.touched_at.slice(0, 10));
      const touched = new Set([...latest].filter(([, d]) => d >= cutoff).map(([id]) => id));
      const people = notTouched(rows, touched, cutoff, i.touch_type, latest);
      const what = i.touch_type === "any" ? "touched" : `given a ${i.touch_type.replace(/_/g, " ")}`;
      return capped(`${people.length} of ${rows.length} ${i.tier === "all" ? "contacts" : "VIPs"} not ${what} since ${cutoff}`, people);
    }
    case "find_contacts": {
      const i = toolInput(name, raw) as { name: string | null; tier: Parameters<typeof tierValues>[0]; stage: string; source: string | null; tag: string | null };
      let q = contactsQuery(ctx, `${CONTACT_COLS}, stage, source_label, source, tags, email`, tierValues(i.tier));
      if (i.name) {
        const words = likeSafe(i.name).split(" ").filter(Boolean).slice(0, 3);
        for (const w of words) q = q.or(`first_name.ilike.%${w}%,last_name.ilike.%${w}%`);
      }
      if (i.stage !== "any") q = q.ilike("stage", i.stage);
      if (i.source) {
        const s = likeSafe(i.source);
        q = q.or(`source_label.ilike.%${s}%,source.ilike.%${s}%`);
      }
      if (i.tag) q = q.contains("tags", [i.tag]);
      const { data } = await q.order("last_touch_date", { ascending: false, nullsFirst: false }).limit(26);
      const people: ToolPerson[] = ((data ?? []) as unknown as Record<string, unknown>[]).map((c) => ({
        contact_id: String(c.id),
        name: nameOf(c),
        phone: phoneOf(c),
        facts: [
          c.contact_tier === "vip50" ? "VIP-50" : c.contact_tier === "vip100" ? "VIP-100" : null,
          classOf(c.stage) ? `${String(c.stage).toLowerCase()}` : null,
          typeof c.source_label === "string" ? c.source_label : null,
          typeof c.last_touch_date === "string" ? `Last touch ${c.last_touch_date}` : "No touch logged",
        ].filter((x): x is string => !!x),
      }));
      return capped(`${people.length > 25 ? "More than 25" : people.length} matching contacts`, people);
    }
    case "special_days": {
      const i = toolInput(name, raw) as { days_ahead: number; tier: Parameters<typeof tierValues>[0] };
      const rows = await all<Record<string, unknown>>((a, b) =>
        contactsQuery(ctx, `${CONTACT_COLS}, birthday, spouse_birthday, anniversary, home_purchase_date`, tierValues(i.tier))
          .or("birthday.not.is.null,spouse_birthday.not.is.null,anniversary.not.is.null,home_purchase_date.not.is.null")
          .order("id")
          .range(a, b),
      );
      const people = specialDays(rows, today, i.days_ahead);
      return capped(`${people.length} special days from ${today} to ${addDays(today, i.days_ahead)}`, people);
    }
    case "pipeline": {
      const i = toolInput(name, raw) as { class: "hot" | "warm" | "cold" | "all" };
      const classes = i.class === "all" ? ["hot", "warm", "cold"] : [i.class];
      const { data } = await ctx.sb
        .from("contacts")
        .select(`${CONTACT_COLS}, stage, next_followup, price_min, price_max`)
        .eq("user_id", ctx.userId)
        .is("archived_at", null)
        .or(classes.map((c) => `stage.ilike.${c}`).join(","))
        .order("next_followup", { ascending: true, nullsFirst: false })
        .limit(300);
      const rows = (data ?? []) as unknown as Record<string, unknown>[];
      const order = { hot: 0, warm: 1, cold: 2 } as const;
      const people = rows
        .filter((c) => classOf(c.stage))
        .sort((a, b) => order[classOf(a.stage)!] - order[classOf(b.stage)!])
        .map((c) => ({
          contact_id: String(c.id),
          name: nameOf(c),
          phone: phoneOf(c),
          facts: [
            classOf(c.stage) === "hot" ? "Hot (0-3 months)" : classOf(c.stage) === "warm" ? "Warm (3-12 months)" : "Cold (12+ months)",
            typeof c.next_followup === "string" ? `Next follow-up ${c.next_followup}` : null,
            priceRange(c.price_min, c.price_max),
          ].filter((x): x is string => !!x),
        }));
      const n = (k: string) => rows.filter((c) => classOf(c.stage) === k).length;
      return capped(`Hot ${n("hot")}, Warm ${n("warm")}, Cold ${n("cold")}`, people);
    }
    case "open_house_visitors": {
      const i = toolInput(name, raw) as { days: number };
      const since = addDays(today, -i.days);
      const { data } = await ctx.sb
        .from("contacts")
        .select(`${CONTACT_COLS}, source_label, created_at`)
        .eq("user_id", ctx.userId)
        .or("source_label.ilike.Open house%,source_label.ilike.Listing live%,source_label.ilike.Room card%,source.ilike.%open%house%")
        .gte("created_at", `${since}T00:00:00Z`)
        .order("created_at", { ascending: false })
        .limit(100);
      const people = ((data ?? []) as unknown as Record<string, unknown>[]).map((c) => ({
        contact_id: String(c.id),
        name: nameOf(c),
        phone: phoneOf(c),
        facts: [typeof c.source_label === "string" ? c.source_label : "Open house", `Signed in ${String(c.created_at).slice(0, 10)}`],
      }));
      return capped(`${people.length} open house visitors since ${since}`, people);
    }
    case "tasks": {
      const i = toolInput(name, raw) as { range: "today" | "overdue" | "week" };
      let q = ctx.sb.from("tasks").select("id, title, due_date, start_time, contact_id, task_type").eq("user_id", ctx.userId).or("completed.is.null,completed.eq.false");
      q = i.range === "today" ? q.eq("due_date", today) : i.range === "overdue" ? q.lt("due_date", today) : q.gte("due_date", today).lte("due_date", addDays(today, 7));
      const { data } = await q.order("due_date").limit(60);
      const rows = ((data ?? []) as Record<string, unknown>[]).map((t) => ({ title: t.title, due: t.due_date, time: t.start_time ?? null, contact_id: t.contact_id ?? null }));
      return { summary: `${rows.length} open tasks (${i.range})`, rows: rows.slice(0, 40) };
    }
    case "tracker": {
      const i = toolInput(name, raw) as { days: number };
      const since = addDays(today, -(i.days - 1));
      const [{ data: days }, touches] = await Promise.all([
        ctx.sb.from("daily_tracker").select("date, points_total").eq("user_id", ctx.userId).gte("date", since).order("date"),
        all<{ touch_type: string }>((a, b) => ctx.sb.from("contact_touches").select("touch_type").eq("user_id", ctx.userId).gte("touched_at", `${since}T00:00:00Z`).range(a, b)),
      ]);
      const byKind: Record<string, number> = {};
      for (const t of touches) byKind[t.touch_type] = (byKind[t.touch_type] ?? 0) + 1;
      const rows = ((days ?? []) as Record<string, unknown>[]).map((d) => ({ date: d.date, points: d.points_total ?? 0 }));
      const total = rows.reduce((s, r) => s + (typeof r.points === "number" ? r.points : 0), 0);
      return { summary: `${total} daily tracker points from ${since} to ${today}; touches logged: ${Object.entries(byKind).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`, rows };
    }
    case "goals": {
      const { data: g } = await ctx.sb.from("agent_goals").select("starts_on, closings_goal, referrals_goal, gci_goal").eq("user_id", ctx.userId).maybeSingle();
      const start = typeof g?.starts_on === "string" ? goalYearStart(g.starts_on, today) : `${today.slice(0, 4)}-01-01`;
      const { data: refs } = await ctx.sb
        .from("referrals")
        .select("referred_name, referrer_contact_id, deal_closed, deal_closed_at, created_at")
        .eq("user_id", ctx.userId)
        .gte("created_at", `${start}T00:00:00Z`)
        .order("created_at", { ascending: false })
        .limit(200);
      const r = (refs ?? []) as Record<string, unknown>[];
      const closed = r.filter((x) => x.deal_closed === true).length;
      return {
        summary: g
          ? `Goal year from ${start}: closings goal ${g.closings_goal ?? "not set"}, referrals goal ${g.referrals_goal ?? "not set"}, GCI goal ${g.gci_goal ?? "not set"}. Referrals received ${r.length}, closed ${closed}.`
          : `No goals set yet. Referrals received since ${start}: ${r.length}, closed ${closed}.`,
        rows: r.slice(0, 30).map((x) => ({ referred: x.referred_name, closed: x.deal_closed === true, on: String(x.created_at).slice(0, 10) })),
      };
    }
  }
}

/** The start of the agent's current goal year: their own start date's month and day, this year or last (Parry, 30 Sep). */
export function goalYearStart(startsOn: string, today: string): string {
  const mmdd = startsOn.slice(5, 10);
  const thisYear = `${today.slice(0, 4)}-${mmdd}`;
  return thisYear <= today ? thisYear : `${Number(today.slice(0, 4)) - 1}-${mmdd}`;
}

export const todayDenver = () => denverDay(new Date());
