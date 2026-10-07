import { celebrateIds, withSpecialDays } from "./specialDays.ts";
import { addGoals, type GoalKey } from "./goals.ts";
import { includes } from "./products.ts";
import { MOVE_BOTTOM, MOVE_GROUPS, moveGroupId, moveMenuHref, movePageId } from "./moveMenu.ts";
import type { DayItem, DayKind } from "./day.ts";
import type { BusinessGraph, GraphEdge, GraphNode, NodeStatus, ProductKey } from "./graph/types.ts";
import type { DashboardData, Item, ItemKind, PackageId, ProductSummary } from "./types.ts";

// Real data: each product's answer to the vip_summary contract (vip50-ecosystem
// VIP-SUMMARY.md) turned into the Brain's graph and the morning note's day.
// Pure: no fetching, no secrets. MASTER answers for ONE GO and ONE MOVE;
// Marquee, ONE Open and Showly answer for themselves (all live 1 Oct). A
// product that did not answer says so plainly and never shows demo numbers.

export interface SummaryStat {
  key: string;
  label: string;
  value: number | null;
  max?: number | null;
  pace?: number | null;
  from?: string;
  to?: string;
  // ONE Open's next_open_house carries the house itself (VIP-SUMMARY §5).
  address?: string | null;
  starts_at?: string | null;
  link?: string | null;
}

export interface SummaryItem {
  id: string;
  kind: string;
  title: string;
  detail?: string;
  urgency: "alert" | "today" | "soon";
  due?: string | null;
  person_email?: string | null;
  why: string[];
  link: string;
  seen?: boolean | null;
  image?: string; // VIP-SUMMARY §3 v1.1, optional
  decide?: { via: string; id: string; accept_label: string; ask_gci?: boolean }; // §3b v1.3, optional
  contact_id?: string | null; // §3c v1.4, optional
}

export interface SummaryEnvelope {
  v: number;
  product: string;
  found: boolean;
  as_of?: string;
  stats?: SummaryStat[];
  items?: SummaryItem[];
  streak?: number;
  weekly_rank?: number | null;
  // VIP-SUMMARY v1.6: today's daily tracker boxes, Mountain day, in /daily order.
  today_boxes?: { key: string; label: string; done: boolean; points: number }[] | null;
  listings?: SummaryListing[];       // VIP-SUMMARY §3a (v1.2), Marquee
  open_houses?: SummaryOpenHouse[];  // VIP-SUMMARY §3a (v1.2), ONE Open
  special_days?: unknown[];          // vip50-web-crm#65; read only through lib/specialDays.ts
}

export interface SummaryListing {
  ref: string;
  address: string;
  property_key?: string | null;
  status: "live" | "under_contract" | "closed" | string;
  list_price?: number | null;
  sold_price?: number | null;
  live_on?: string | null;
  under_contract_on?: string | null;
  closed_on?: string | null;
  image?: string | null;
  link?: string | null;
}

export interface SummaryOpenHouse {
  id: string;
  address: string;
  property_key?: string | null;
  starts_at: string;
  ends_at?: string | null;
  hosting?: string | null;
  image?: string | null;
  link?: string | null;
}

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const daysBetween = (from: string, to: string) => Math.max(0, Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000));

/** One listing as a home: "Live · 5 days on market · $333,333", "Under contract", "Closed · $612,000". */
export function listingLine(l: SummaryListing, today: string): string {
  if (l.status === "closed") return ["Closed", l.sold_price ? money(l.sold_price) : null].filter(Boolean).join(" · ");
  if (l.status === "under_contract") return ["Under contract", l.list_price ? money(l.list_price) : null].filter(Boolean).join(" · ");
  const dom = l.live_on ? daysBetween(l.live_on, today) : null;
  return ["Live", dom != null ? `${dom} ${dom === 1 ? "day" : "days"} on market` : null, l.list_price ? money(l.list_price) : null].filter(Boolean).join(" · ");
}

/** ONE Open's upcoming open houses as items (v1.2 list; falls back to the single next_open_house stat). */
export function openHouseItems(env: SummaryEnvelope | undefined, today: string): SummaryItem[] {
  const list = env?.open_houses;
  if (!list?.length) return upcomingOpenHouses(env, today);
  return list.slice(0, 10).flatMap((h) => {
    const link = safeImage(h.link ?? null);
    if (!link || !h.address || Number.isNaN(Date.parse(h.starts_at))) return [];
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date(h.starts_at));
    const when = openHouseWhen(h.starts_at);
    const isToday = day === today;
    return [{
      id: `open:upcoming:${h.id}`,
      kind: "open_house",
      title: h.address,
      detail: isToday ? `Today, ${when.split(", ")[1]}` : when,
      urgency: isToday ? "today" : "soon",
      due: day < today ? today : day,
      why: [isToday ? `Your open house at ${h.address} is today.` : `Open house ${when} at ${h.address}.`, h.hosting === "other" ? "You are hosting another agent's listing." : "Open it in ONE Open to check the plan, the sign-in and the follow-up."],
      link,
      image: safeImage(h.image ?? null),
    } as SummaryItem];
  });
}

export interface LiveAgent {
  email: string;
  firstName: string;
  pkg: PackageId;
  founding: boolean;
}

const MOVE_URL = "https://move.vip50one.com";
const OTHERS = ["marquee", "open", "showly"] as const;
const OTHER_LABEL: Record<(typeof OTHERS)[number], [string, string]> = {
  marquee: ["MARQUEE", "Listing intelligence"],
  open: ["ONE OPEN", "Open house intelligence"],
  showly: ["SHOWLY", "Buyer experience"],
};
const OTHER_NAME: Record<(typeof OTHERS)[number], string> = { marquee: "Marquee", open: "ONE Open", showly: "Showly" };
export type OtherKey = (typeof OTHERS)[number];
export const OTHER_KEYS: readonly OtherKey[] = OTHERS;

/** One of the other three products' answers. `reachable` false: it did not answer in time. */
export interface OtherAnswer {
  env: SummaryEnvelope | null;
  reachable: boolean;
}
export type OtherAnswers = Partial<Record<OtherKey, OtherAnswer>>;

// How each product's items group on its branch of the map (VIP-SUMMARY §3 kinds,
// plus the ones the products added as built; anything else is "Other").
const KIND_GROUP: Record<string, string> = {
  approval: "Approvals",
  report: "Seller reports",
  failed: "Needs fixing",
  reaction: "Buyer answers",
  visitor_rating: "Rate your visitors",
  billing: "Billing",
  safety: "Safety",
  follow_up: "Follow-ups",
  prep: "Open house prep",
  open_house: "Upcoming open houses",
  book_open_house: "Book your next open house",
};

// REMINDERS.md: ONE Open's page for booking a new open house.
export const OPEN_NEW_EVENT = "https://open.vip-50.com/app/events/new";

// "Sat 4 Oct, 11:00 AM" in Mountain time.
export function openHouseWhen(iso: string): string {
  const d = new Date(iso);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", ...o }).format(d);
  return `${f({ weekday: "short" })} ${f({ day: "numeric" })} ${f({ month: "short" })}, ${f({ hour: "numeric", minute: "2-digit" })}`;
}

/** ONE Open's next open house as an item, so it shows as a home under ONE OPEN and in Your day. */
export function upcomingOpenHouses(env: SummaryEnvelope | undefined, today: string): SummaryItem[] {
  const s = env?.stats?.find((x) => x.key === "next_open_house");
  if (!s || s.value == null || !s.address || !s.starts_at || Number.isNaN(Date.parse(s.starts_at))) return [];
  const link = safeImage(s.link ?? null);
  if (!link) return [];
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date(s.starts_at));
  const when = openHouseWhen(s.starts_at);
  return [{
    id: `open:upcoming:${day}:${s.address}`,
    kind: "open_house",
    title: s.address,
    detail: s.value === 0 ? `Today, ${when.split(", ")[1]}` : when,
    urgency: s.value === 0 ? "today" : "soon",
    due: day < today ? today : day,
    why: [s.value === 0 ? `Your open house at ${s.address} is today.` : `Your next open house is ${when} at ${s.address}.`, "Open it in ONE Open to check the plan, the sign-in and the follow-up."],
    link,
  }];
}

/** An answered product's items, with ids made unique across products. */
function otherItems(p: OtherKey, a: OtherAnswer | undefined): SummaryItem[] {
  if (!a?.reachable || !a.env?.found) return [];
  const xs = (a.env.items ?? []).map((i) => ({ ...i, id: i.id.startsWith(`${p}:`) ? i.id : `${p}:${i.id}` }));
  if (p !== "open") return xs;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date());
  return [...openHouseItems(a.env, today), ...xs];
}

const productOf = (it: SummaryItem, p?: OtherKey): ProductKey => p ?? itemProduct(it);

// Which product an item belongs to on the map. MASTER sends everything as
// "go"; the tasks, dates and the Touch Audit live in ONE MOVE.
export function itemProduct(it: SummaryItem): "go" | "move" {
  return it.kind === "vip_touch" && it.id.startsWith("go:task:") ? "go" : "move";
}

const stat = (env: SummaryEnvelope, key: string) => env.stats?.find((s) => s.key === key);

export function ofMax(s: SummaryStat | undefined): string | null {
  if (!s || s.value == null) return null;
  return s.max != null ? `${fmt(s.key, s.value)} / ${fmt(s.key, s.max)}` : fmt(s.key, s.value);
}

function fmt(key: string, n: number): string {
  if (key === "gci_goal") return `$${Math.round(n).toLocaleString("en-US")}`;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// "2026-03-01" -> "Mar 1, 2026"
export function longDate(ymd?: string): string | undefined {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}/.test(ymd)) return undefined;
  return new Date(`${ymd.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function statusOf(u: SummaryItem["urgency"]): NodeStatus | undefined {
  return u === "alert" ? "action" : u === "today" ? "attention" : undefined;
}

/** Today's Hot, Warm and Cold boxes in the daily tracker: how many are not ticked yet. Null if not sent. */
export function hwcToday(boxes: { key: string; done: boolean }[] | null | undefined): { left: number } | null {
  if (!boxes) return null;
  const mine = boxes.filter((b) => b.key === "hot_contact" || b.key === "warm_contact" || b.key === "cold_contact");
  return mine.length ? { left: mine.filter((b) => !b.done).length } : null;
}

/** The people behind items due today or overdue, for a page that pulses them. */
export function dueIn(items: SummaryItem[]): GraphNode["dueContacts"] {
  const out = items
    .filter((i) => (i.urgency === "alert" || i.urgency === "today") && typeof i.contact_id === "string" && UUID.test(i.contact_id))
    .map((i) => ({ id: i.contact_id as string, title: i.title, level: i.urgency === "alert" ? ("now" as const) : ("today" as const) }));
  return out.length ? out : undefined;
}

function worst(items: SummaryItem[]): NodeStatus | undefined {
  if (items.some((i) => i.urgency === "alert")) return "action";
  if (items.some((i) => i.urgency === "today")) return "attention";
  return items.length ? "opportunity" : "healthy";
}

const nodeId = (it: SummaryItem) => `live:${it.id}`;

export function dayKind(it: SummaryItem): DayKind {
  if (it.kind === "approval") return "approval";
  if (it.kind === "report") return "report";
  if (it.kind === "visitor_rating") return "rating";
  if (it.kind === "reaction") return "follow_up";
  if (["failed", "billing", "safety", "prep"].includes(it.kind)) return "other";
  if (it.kind === "open_house") return "meeting";
  if (it.kind === "book_open_house" || it.kind === "agent_attraction") return "other";
  const t = it.title.toLowerCase();
  if (it.kind === "follow_up" || it.kind === "other") return "follow_up";
  if (/video|text/.test(t)) return "text";
  if (/note|card/.test(t)) return "note";
  if (/lunch|coffee|meet|drop/.test(t)) return "meeting";
  return "call";
}

const MINUTES: Record<DayKind, number> = { call: 10, text: 5, note: 5, meeting: 30, approval: 10, rating: 5, follow_up: 10, report: 10, other: 10 };

export interface LiveOptions {
  pkg: PackageId;
  firstName: string;
  reachable: boolean; // false: MASTER did not answer in time
  today: string; // YYYY-MM-DD, America/Denver
}

export function liveGraph(raw: SummaryEnvelope | null, o: LiveOptions, others: OtherAnswers = {}): BusinessGraph {
  const env = withSpecialDays(raw);
  const glow = celebrateIds(env);
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const add = (n: Omit<GraphNode, "importance"> & { importance?: number }) => {
    nodes.push({ importance: 0.5, ...n });
    if (n.parentId) edges.push({ id: `${n.parentId}>${n.id}`, source: n.parentId, target: n.id, relationshipType: "belongs_to", strength: 1 });
  };
  const found = !!env?.found && o.reachable;
  const allItems = found ? (env!.items ?? []) : [];
  // REMINDERS.md: "Set Up Open House" belongs to ONE OPEN when the agent has it.
  const hasOpen = includes(o.pkg, "open");
  const booking = hasOpen ? allItems.filter((i) => i.kind === "book_open_house").map((i) => ({ ...i, link: OPEN_NEW_EVENT })) : [];
  const items = hasOpen ? allItems.filter((i) => i.kind !== "book_open_house") : allItems;
  const goItems = items.filter((i) => itemProduct(i) === "go");
  const moveItems = items.filter((i) => itemProduct(i) === "move");
  const daily = found ? stat(env!, "daily_points") : undefined;
  const weekly = found ? stat(env!, "weekly_score") : undefined;
  const touched = found ? stat(env!, "vip50_fully_touched") : undefined;

  // What needs the agent today: the same items Your day lists.
  const isToday = (i: SummaryItem) => i.urgency !== "soon" && (!i.due || i.due <= o.today);
  // The other three, only for products in the agent's package.
  const open = OTHERS.filter((p) => includes(o.pkg, p));
  const extra = open.map((p) => ({ p, items: p === "open" ? [...booking, ...otherItems(p, others[p])] : otherItems(p, others[p]) }));
  const tagged: { it: SummaryItem; p?: OtherKey }[] = [...items.map((it) => ({ it })), ...extra.flatMap(({ p, items: xs }) => xs.map((it) => ({ it, p })))];
  const due = tagged.filter(({ it }) => isToday(it)).map(({ it }) => it);
  add({
    id: "one",
    type: "core",
    label: "ONE",
    secondaryLabel: "Your business, connected",
    parentId: null,
    product: "one",
    importance: 1,
    summary: !o.reachable
      ? "ONE couldn't reach ONE GO and ONE MOVE just now. Your numbers will be back shortly."
      : !found
        ? "Your ONE GO and ONE MOVE account has nothing to show yet."
        : due.length
          ? `${due.length === 1 ? "One thing needs" : `${due.length} things need`} you today, starting with: ${due[0].title}.`
          : "Nothing is waiting on you right now.",
    stats: found
      ? [
          ofMax(daily) && { label: "Daily score", value: ofMax(daily)! },
          ofMax(weekly) && { label: "Weekly score", value: ofMax(weekly)! },
          ofMax(touched) && { label: "VIP-50 fully touched", value: ofMax(touched)! },
          env!.streak != null && { label: "Streak", value: `${env!.streak} ${env!.streak === 1 ? "day" : "days"}` },
          env!.weekly_rank != null && { label: "Leaderboard", value: `#${env!.weekly_rank}` },
        ].filter((s): s is { label: string; value: string } => !!s)
      : undefined,
  });

  // ---- ONE GO -------------------------------------------------------------
  const goals = found ? (["closings_goal", "referrals_goal", "gci_goal"] as const).map((k) => stat(env!, k)).filter((s): s is SummaryStat => !!s) : [];
  add({
    id: "go",
    type: "product",
    // ONE YOU (Parry, 6 Oct): on the desktop this orb is the agent's own place to plan and review;
    // ONE GO stays the phone app, and Send to my phone still goes to ONE GO.
    label: "ONE YOU",
    secondaryLabel: "Your plan, your week, your goals",
    parentId: "one",
    product: "go",
    importance: 0.95,
    status: found ? worst(goItems) : undefined,
    summary: found ? "Plan your day and send it to ONE GO on your phone. Today's VIP touches, your weekly score and your goals." : "Plan your day, review your week and track your goals. Your plan goes to ONE GO on your phone.",
    stats: found
      ? [
          ofMax(daily) && { label: "Daily score", value: ofMax(daily)! },
          ofMax(weekly) && { label: "Weekly score", value: ofMax(weekly)! },
          env!.streak != null && { label: "Streak", value: `${env!.streak} ${env!.streak === 1 ? "day" : "days"}` },
          env!.weekly_rank != null && { label: "Leaderboard", value: `#${env!.weekly_rank}` },
        ].filter((s): s is { label: string; value: string } => !!s)
      : undefined,
  });
  if (found) {
    add({
      id: "go-today",
      type: "category",
      label: "Today's VIP touches",
      secondaryLabel: goItems.length ? `${goItems.length} to do` : "All done",
      parentId: "go",
      product: "go",
      importance: 1,
      status: goItems.length ? "attention" : "healthy",
      summary: goItems.length ? "The VIP-50 touches ONE GO scheduled for today." : "No VIP-50 touches are left for today.",
    });
    goItems.forEach((it, k) => itemNode(add, it, "go-today", "go", 1 - k * 0.03));
    addGoals(
      add,
      goals.map((g) => ({ key: g.key as GoalKey, label: g.label, value: g.value, max: g.max ?? null, pace: g.pace ?? null, from: g.from, to: g.to })),
      o.today,
    );
  }

  // ---- ONE MOVE -----------------------------------------------------------
  const isSuggestion = (i: SummaryItem) => i.id.startsWith("move:listing:");
  const suggestions = moveItems.filter(isSuggestion); // LISTINGS.md §4.5, decided in the Brain (§3b)
  const followups = moveItems.filter((i) => !isSuggestion(i) && (i.kind === "follow_up" || i.kind === "other"));
  const dates = moveItems.filter((i) => i.kind === "birthday");
  const audit = moveItems.filter((i) => i.kind === "vip_touch");
  const attraction = moveItems.filter((i) => i.kind === "agent_attraction");
  const bookHere = moveItems.filter((i) => i.kind === "book_open_house"); // no ONE Open in the package
  add({
    id: "move",
    type: "product",
    label: "ONE MOVE",
    secondaryLabel: "Relationship intelligence",
    parentId: "one",
    product: "move",
    importance: 0.9,
    status: found ? worst(moveItems) : undefined,
    summary: "Everyone you know, and what you promised them.",
    stats: found
      ? [
          { label: "Follow-ups overdue", value: String(followups.length) },
          { label: "Birthdays and anniversaries (30 days)", value: String(dates.length) },
          ...(ofMax(touched) ? [{ label: "VIP-50 fully touched", value: ofMax(touched)! }] : []),
        ]
      : undefined,
  });
  // ONE MOVE's menu as orbs (Parry, 3 Oct): five groups around ONE MOVE, each
  // opening its pages; The Lounge and My Profile beside them. What needs the
  // agent sits in the group it belongs to and lights that group up.
  const groupNeeds: Record<string, SummaryItem[]> = {
    people: [...followups, ...suggestions, ...dates, ...audit],
    events: bookHere,
    outreach: attraction,
  };
  const todayBoxes = found && Array.isArray(env!.today_boxes)
    ? env!.today_boxes
        .filter((b) => b && typeof b.label === "string" && b.label.trim())
        .map((b) => ({ label: b.label.trim(), done: b.done === true, points: Number.isFinite(b.points) ? b.points : 1 }))
    : undefined;
  const overdueCount = found ? stat(env!, "followups_overdue")?.value ?? null : null;
  const weekBoxes = found ? stat(env!, "week_boxes_done") : undefined;
  const challenge = found ? stat(env!, "challenge_day") : undefined;
  const groupStats = (key: string): GraphNode["stats"] => {
    if (!found) return undefined;
    const list =
      key === "people"
        ? [ofMax(touched) && { label: "VIP-50 fully touched this month", value: ofMax(touched)! }]
        : key === "trackers"
          ? [
              ofMax(daily) && { label: "Daily score", value: ofMax(daily)! },
              ofMax(weekly) && { label: "Weekly score", value: ofMax(weekly)! },
              ofMax(weekBoxes) && { label: "Weekly boxes", value: ofMax(weekBoxes)! },
              challenge?.value != null && ofMax(challenge) && { label: "90-Day Challenge", value: ofMax(challenge)! },
              env!.streak != null && { label: "Streak", value: `${env!.streak} ${env!.streak === 1 ? "day" : "days"}` },
              env!.weekly_rank != null && { label: "Leaderboard", value: `#${env!.weekly_rank}` },
            ]
          : [];
    const out = list.filter((x): x is { label: string; value: string } => !!x);
    return out.length ? out : undefined;
  };
  MOVE_GROUPS.forEach((g, gi) => {
    const needs = found ? groupNeeds[g.key] ?? [] : [];
    const gid = moveGroupId(g.key);
    add({
      id: gid,
      type: "category",
      label: g.label,
      secondaryLabel: needs.length ? `${needs.length} ${needs.length === 1 ? "needs" : "need"} you` : g.blurb,
      parentId: "move",
      product: "move",
      importance: 1 - gi * 0.04,
      status: needs.length ? worst(needs) : undefined,
      summary: `${g.label} in ONE MOVE: ${g.pages.map((pg) => pg.label).join(", ")}.`,
      // The numbers the group's panel leads with (Parry, 4 Oct: People and Trackers).
      stats: groupStats(g.key),
      boxes: g.key === "trackers" ? todayBoxes : undefined,
    });
    g.pages.forEach((pg, j) => {
      if (pg.path === "/contacts/audit") return; // the live Touch Audit below
      // Hot/Warm/Cold is a daily tracker step (Parry, 5 Oct): it pulses until today's box for
      // each class is ticked.
      const hwc = pg.path === "/hot-warm-cold" && found ? hwcToday(env!.today_boxes) : null;
      add({
        id: movePageId(pg.path),
        type: "feature",
        label: pg.label,
        secondaryLabel: hwc ? (hwc.left ? `${3 - hwc.left} of 3 worked today` : "All three worked today") : undefined,
        parentId: gid,
        product: "move",
        importance: 0.8 - j * 0.02,
        href: moveMenuHref(pg.path),
        status: hwc ? (hwc.left ? "attention" : "healthy") : undefined,
        needCount: hwc?.left || undefined,
      });
    });
  });
  MOVE_BOTTOM.forEach((pg, j) =>
    add({ id: movePageId(pg.path), type: "feature", label: pg.label, parentId: "move", product: "move", importance: 0.7 - j * 0.02, href: moveMenuHref(pg.path) }),
  );
  const people = moveGroupId("people");
  if (found) {
    if (followups.length) {
      add({ id: "move-followups", type: "category", label: "Follow-ups overdue", secondaryLabel: `${overdueCount ?? followups.length} overdue`, parentId: people, product: "move", importance: 1, status: "action", summary: "Tasks in ONE MOVE that are past their date and not done.", needFloor: overdueCount ? { count: overdueCount, level: "now" } : undefined });
      followups.forEach((it, k) => itemNode(add, it, "move-followups", "move", 1 - k * 0.03));
    }
    if (suggestions.length) {
      add({ id: "move-suggest", type: "category", label: "From your listings", secondaryLabel: `${suggestions.length} to decide`, parentId: people, product: "move", importance: 0.98, status: worst(suggestions), summary: "Suggestions from your listings in Marquee. Nothing happens until you accept." });
      suggestions.forEach((it, k) => itemNode(add, it, "move-suggest", "move", 1 - k * 0.03));
    }
    if (attraction.length) {
      add({ id: "move-attraction", type: "category", label: "Agent attraction", secondaryLabel: `${attraction.length} waiting`, parentId: moveGroupId("outreach"), product: "move", importance: 0.9, status: worst(attraction), summary: "Your Agent Attraction reminders in ONE MOVE." });
      attraction.forEach((it, k) => itemNode(add, it, "move-attraction", "move", 1 - k * 0.03));
    }
    if (bookHere.length) {
      add({ id: "move-book-oh", type: "category", label: "Book your next open house", secondaryLabel: `${bookHere.length} waiting`, parentId: moveGroupId("events"), product: "move", importance: 0.9, status: worst(bookHere), summary: "Your every-two-weeks reminder to book an open house." });
      bookHere.forEach((it, k) => itemNode(add, it, "move-book-oh", "move", 1 - k * 0.03));
    }
    if (dates.length) {
      add({ id: "move-dates", type: "category", label: "Birthdays and anniversaries", secondaryLabel: `${dates.length} in the next 30 days`, parentId: people, product: "move", importance: 0.95, status: dates.some((d) => d.urgency === "today") ? "attention" : "opportunity", summary: "Your VIP-50 and VIP-100's special dates coming up." });
      dates.forEach((it, k) => itemNode(add, it, "move-dates", "move", 1 - k * 0.03, "person"));
    }
  }
  add({
    id: "move-audit",
    type: found ? "category" : "feature",
    label: "Touch Audit",
    secondaryLabel: found ? (ofMax(touched) ? `${ofMax(touched)} fully touched` : "This month") : undefined,
    parentId: people,
    product: "move",
    importance: 0.9,
    // Only a touch due today or overdue pulses; "not fully touched this month" is a gold dot (Parry,
    // 5 Oct: it blinked yellow with nothing to do inside).
    status: found ? (audit.length ? worst(audit) : "healthy") : undefined,
    dueContacts: dueIn(audit),
    summary: "Monthly touches for every VIP-50: call, video text, social, newsletter and mixer invite.",
    recommendations: audit.map((it) => ({ title: it.title, why: it.why, targetId: "move-audit" })),
    href: audit[0]?.link ?? `${MOVE_URL}/contacts/audit`,
  });

  // ---- the other three ----------------------------------------------------
  OTHERS.forEach((p, k) => {
    const [label, sub] = OTHER_LABEL[p];
    const name = OTHER_NAME[p];
    const locked = !includes(o.pkg, p);
    const a = others[p];
    const base = { id: p, type: "product" as const, label, parentId: "one", product: p, importance: 0.85 - k * 0.03 };
    if (locked) return add({ ...base, secondaryLabel: sub, locked: true, summary: "Included in ONE Complete." });
    // Items from MASTER (REMINDERS.md) show even when the product itself does not answer.
    const xs = extra.find((e) => e.p === p)?.items ?? [];
    if (!xs.length) {
      if (!a) return add({ ...base, secondaryLabel: "Not connected", summary: `${name} isn't connected to ONE yet. Its work will show here once it is. Open ${name} to see it today.` });
      if (!a.reachable) return add({ ...base, secondaryLabel: "Couldn't reach", summary: `ONE couldn't reach ${name} just now. It will be back shortly; open ${name} to see it today.` });
      if (!a.env?.found) return add({ ...base, secondaryLabel: sub, summary: `ONE didn't find a ${name} account under your email. If you use ${name} with another email, ask us to link it.` });
    }
    const dueHere = xs.filter(isToday);
    add({
      ...base,
      secondaryLabel: sub,
      status: worst(xs),
      summary: dueHere.length ? `${dueHere.length === 1 ? "One thing needs" : `${dueHere.length} things need`} you in ${name}, starting with: ${dueHere[0].title}.` : xs.length ? `Nothing in ${name} is due today; ${xs.length} coming up.` : `Nothing in ${name} needs you right now.`,
      stats: (a?.env?.stats ?? []).map((st) => ({ label: st.label, value: ofMax(st) ?? "None" })),
    });
    const groups = new Map<string, SummaryItem[]>();
    xs.forEach((it) => {
      const g = KIND_GROUP[it.kind] ?? "Other";
      groups.set(g, [...(groups.get(g) ?? []), it]);
    });
    [...groups.entries()].forEach(([g, list], gi) => {
      const cid = `${p}-${g.toLowerCase().replace(/[^a-z]+/g, "-")}`;
      add({ id: cid, type: "category", label: g, secondaryLabel: `${list.length} waiting`, parentId: p, product: p, importance: 1 - gi * 0.04, status: worst(list), summary: `${g} in ${name}.` });
      list.forEach((it, j) => itemNode(add, it, cid, p, 1 - j * 0.03, it.kind === "open_house" ? "property" : "task"));
    });
    // VIP-SUMMARY §3a: Marquee's listings as homes, even when nothing is due.
    const homes = (a?.env?.listings ?? []).filter((l) => l.ref && l.address).slice(0, 20);
    if (p === "marquee" && homes.length) {
      add({ id: "marquee-listings", type: "category", label: "Your listings", secondaryLabel: `${homes.length} ${homes.length === 1 ? "home" : "homes"}`, parentId: p, product: p, importance: 1.02, status: "healthy", summary: "Your listings in Marquee: live, under contract and recently closed." });
      homes.forEach((l, j) => add({
        id: `marquee:listing:${l.ref}`,
        type: "property",
        label: l.address.split(",")[0].trim(),
        secondaryLabel: listingLine(l, o.today),
        parentId: "marquee-listings",
        product: p,
        importance: 1 - j * 0.03,
        status: l.status === "closed" ? "opportunity" : "healthy",
        summary: `${l.address}. ${listingLine(l, o.today)}.`,
        href: safeImage(l.link ?? null),
        image: safeImage(l.image ?? null),
      }));
    }
  });

  // ---- the day and the timeline ------------------------------------------
  // Everything due today (Your day shows the first 8; Plan My Day offers them all, §3l).
  const today: DayItem[] = tagged
    .filter(({ it }) => isToday(it))
    .slice(0, 25)
    .map(({ it: i, p }) => {
      const kind = dayKind(i);
      return {
        id: `day:${i.id}`,
        nodeId: nodes.some((n) => n.id === nodeId(i)) ? nodeId(i) : p ?? "move-audit",
        product: productOf(i, p),
        kind,
        what: i.title,
        minutes: MINUTES[kind],
        vip: i.kind === "vip_touch" || i.kind === "birthday" || undefined,
        ref: i.id,
        contactId: typeof i.contact_id === "string" && UUID.test(i.contact_id) ? i.contact_id : undefined,
        link: i.link || undefined,
        urgency: i.urgency,
        special: i.kind === "birthday" || (typeof i.contact_id === "string" && glow.has(i.contact_id)) || undefined,
      };
    });
  // Hot, Warm and Cold not worked today pulse too (§3h.10), so the plan offers them.
  if (found) {
    for (const [cls, label] of [["hot", "Hot"], ["warm", "Warm"], ["cold", "Cold"]] as const) {
      const box = env!.today_boxes?.find((b) => b.key === `${cls}_contact`);
      if (!box || box.done) continue;
      today.push({
        id: `day:hwc:${cls}`,
        nodeId: movePageId("/hot-warm-cold"),
        product: "move",
        kind: "other",
        what: `Work your ${label} list`,
        minutes: 10,
        ref: `hwc:${cls}`,
        link: moveMenuHref("/hot-warm-cold"),
        urgency: "today",
      });
    }
  }
  const dated = tagged
    .filter(({ it: i }) => i.due && nodes.some((n) => n.id === nodeId(i)))
    .map(({ it: i, p }) => ({ id: nodeId(i), product: productOf(i, p), at: `${i.due}T18:00:00.000Z`, what: i.title }));

  for (const n of nodes) if (n.contactId && glow.has(n.contactId)) n.celebrate = true;
  const week = weekly?.value != null ? { score: weekly.value, minimum: 100 } : undefined;
  return { nodes, edges, rootId: "one", changes: [], dated, today, celebrate: [...glow], week };
}

// "Birthday: Lena Brooks" -> the person "Lena Brooks", "Birthday · Tomorrow",
// so a person's orb is named (and initialled) by the person.
export function personLabel(it: SummaryItem): { label: string; sub?: string } {
  const m = /^([^:]{2,20}):\s*(.+)$/.exec(it.title);
  if (!m) return { label: it.title, sub: it.detail };
  return { label: m[2].trim(), sub: [m[1].trim(), it.detail].filter(Boolean).join(" · ") };
}

function itemNode(add: (n: Omit<GraphNode, "importance"> & { importance?: number }) => void, it: SummaryItem, parentId: string, product: ProductKey, importance: number, type: GraphNode["type"] = "task") {
  const named = type === "person" ? personLabel(it) : { label: it.title, sub: it.detail };
  add({
    id: nodeId(it),
    type,
    label: named.label,
    secondaryLabel: named.sub,
    parentId,
    product,
    importance,
    status: statusOf(it.urgency),
    summary: it.why.join(" "),
    recommendations: [{ title: it.title, why: it.why, targetId: nodeId(it) }],
    timestamps: it.due ? { due: it.due } : undefined,
    href: it.link,
    image: safeImage(it.image),
    decide: decideOf(it),
    contactId: typeof it.contact_id === "string" && UUID.test(it.contact_id) ? it.contact_id : undefined,
    taskId: taskIdOf(it.id),
  });
}

/** "go:task:<uuid>" -> the uuid (VIP-SUMMARY §3c.3, `task_id`). */
export function taskIdOf(id: string): string | undefined {
  const m = /^go:task:([0-9a-f-]{36})$/i.exec(id);
  return m && UUID.test(m[1]) ? m[1] : undefined;
}

// VIP-SUMMARY §3b: only the one function v1.3 allows, only with a real id.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function decideOf(it: SummaryItem): GraphNode["decide"] {
  const d = it.decide;
  if (!d || d.via !== "listing_suggestion_decide" || typeof d.id !== "string" || !UUID.test(d.id)) return undefined;
  return { id: d.id, acceptLabel: typeof d.accept_label === "string" && d.accept_label.trim() ? d.accept_label.trim().slice(0, 40) : "Accept", askGci: d.ask_gci === true };
}

// The same answer in the shape the morning note and ranking use.
export function liveData(raw: SummaryEnvelope | null, agent: LiveAgent, today: string, reachable: boolean, others: OtherAnswers = {}): DashboardData {
  const env = withSpecialDays(raw);
  const found = !!env?.found && reachable;
  const items = found ? (env!.items ?? []) : [];
  const KINDS: ItemKind[] = ["safety", "billing", "failed", "vip_touch", "birthday", "drop_by", "approval", "follow_up", "new_contacts", "reaction", "prep", "report", "other"];
  const toItem = (i: SummaryItem, p?: OtherKey): Item => ({
    id: i.id,
    product: p ?? itemProduct(i),
    kind: (KINDS.includes(i.kind as ItemKind) ? i.kind : "other") as ItemKind,
    title: i.title,
    detail: i.detail,
    due: i.due ?? undefined,
    urgency: i.urgency,
    action: { label: "Open", href: i.link },
  });
  const daily = found ? stat(env!, "daily_points") : undefined;
  const weekly = found ? stat(env!, "weekly_score") : undefined;
  const touched = found ? stat(env!, "vip50_fully_touched") : undefined;
  const go: ProductSummary = {
    product: "go",
    reachable: found,
    stats: [
      ofMax(daily) && { label: "Daily score", value: ofMax(daily)! },
      ofMax(weekly) && { label: "Weekly score", value: ofMax(weekly)! },
      found && env!.streak != null && { label: "Streak", value: `${env!.streak} days` },
    ].filter((s): s is { label: string; value: string } => !!s),
    statusLine: "",
    items: items.filter((i) => itemProduct(i) === "go").map((i) => toItem(i)),
  };
  const move: ProductSummary = {
    product: "move",
    reachable: found,
    stats: ofMax(touched) ? [{ label: "VIP-50 fully touched this month", value: ofMax(touched)! }] : [],
    statusLine: "",
    items: items.filter((i) => itemProduct(i) === "move").map((i) => toItem(i)),
  };
  const rest: ProductSummary[] = OTHERS.map((p) => {
    const a = includes(agent.pkg, p) ? others[p] : undefined;
    const ok = !!a?.reachable && !!a.env?.found;
    return {
      product: p,
      reachable: ok,
      stats: ok ? (a!.env!.stats ?? []).map((st) => ({ label: st.label, value: ofMax(st) ?? "None" })) : [],
      statusLine: "",
      items: otherItems(p, a).map((i) => toItem(i, p)),
    };
  });
  return {
    agent: { firstName: agent.firstName, lastName: "", email: agent.email, package: agent.pkg, founding: agent.founding, timeZone: "America/Denver" },
    today,
    scoreboard: null,
    products: [go, move, ...rest],
    coaching: null,
  };
}

// Only an https picture is ever drawn (VIP-SUMMARY §3: no other scheme, no data:).
export function safeImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

// "Sarah Bennett" -> "SB"; an email falls back to its first letter.
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// What MASTER calls the agent, first word only; else the email's local part.
export function firstNameOf(displayName: string | null | undefined, email: string): string {
  const n = (displayName ?? "").trim().split(/\s+/)[0];
  if (n) return n;
  const local = email.split("@")[0].replace(/[._\d]+/g, " ").trim().split(/\s+/)[0] ?? "";
  return local ? local[0].toUpperCase() + local.slice(1) : "there";
}

// MASTER's one_plan (ENTITLEMENT.md): relationship | complete. Elite is
// coaching, then Complete. A legacy member with no plan has GO + MOVE.
export function packageOf(onePlan: string | null | undefined): PackageId {
  const p = (onePlan ?? "").toLowerCase();
  return p === "complete" || p === "elite" ? "complete" : "relationship";
}

// Same membership rule as MASTER's vip_summary picks a profile by.
export function isMember(p: { vip_access?: boolean | null; subscription_status?: string | null }): boolean {
  return p.vip_access === true || ["active", "trialing", "in_grace_period", "past_due"].includes((p.subscription_status ?? "").toLowerCase());
}
