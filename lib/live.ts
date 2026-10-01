import { includes } from "./products.ts";
import type { DayItem, DayKind } from "./day.ts";
import type { BusinessGraph, GraphEdge, GraphNode, NodeStatus, ProductKey } from "./graph/types.ts";
import type { DashboardData, Item, ItemKind, PackageId, ProductSummary } from "./types.ts";

// Real data: the MASTER answer to the vip_summary contract (vip50-ecosystem
// VIP-SUMMARY.md) turned into the Brain's graph and the morning note's day.
// Pure: no fetching, no secrets. MASTER answers for ONE GO and ONE MOVE; the
// other three products have no vip_summary yet, so they show "not connected
// yet" and never demo numbers.

export interface SummaryStat {
  key: string;
  label: string;
  value: number | null;
  max?: number | null;
  pace?: number | null;
  from?: string;
  to?: string;
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

function worst(items: SummaryItem[]): NodeStatus | undefined {
  if (items.some((i) => i.urgency === "alert")) return "action";
  if (items.some((i) => i.urgency === "today")) return "attention";
  return items.length ? "opportunity" : "healthy";
}

const nodeId = (it: SummaryItem) => `live:${it.id}`;

export function dayKind(it: SummaryItem): DayKind {
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

export function liveGraph(env: SummaryEnvelope | null, o: LiveOptions): BusinessGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const add = (n: Omit<GraphNode, "importance"> & { importance?: number }) => {
    nodes.push({ importance: 0.5, ...n });
    if (n.parentId) edges.push({ id: `${n.parentId}>${n.id}`, source: n.parentId, target: n.id, relationshipType: "belongs_to", strength: 1 });
  };
  const found = !!env?.found && o.reachable;
  const items = found ? (env!.items ?? []) : [];
  const goItems = items.filter((i) => itemProduct(i) === "go");
  const moveItems = items.filter((i) => itemProduct(i) === "move");
  const daily = found ? stat(env!, "daily_points") : undefined;
  const weekly = found ? stat(env!, "weekly_score") : undefined;
  const touched = found ? stat(env!, "vip50_fully_touched") : undefined;

  // What needs the agent today: the same items Your day lists.
  const isToday = (i: SummaryItem) => i.urgency !== "soon" && (!i.due || i.due <= o.today);
  const due = items.filter(isToday);
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
    label: "ONE GO",
    secondaryLabel: "Daily execution",
    parentId: "one",
    product: "go",
    importance: 0.95,
    status: found ? worst(goItems) : undefined,
    summary: found ? "Today's points, your VIP-50 touches, the weekly score and your goals." : "Daily execution: points, VIP-50 touches and the weekly score.",
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
    if (goals.length) {
      add({
        id: "go-goals",
        type: "category",
        label: "Goals",
        secondaryLabel: goals.some((g) => g.max != null) ? "This goal year" : "No goals set yet",
        parentId: "go",
        product: "go",
        importance: 0.9,
        summary: goals.some((g) => g.max != null)
          ? `Your goal year runs from ${longDate(goals[0].from) ?? "your start date"} to ${longDate(goals[0].to) ?? "a year later"}.`
          : "Set closings, referrals and GCI goals in ONE GO to see your pace here.",
      });
      goals.forEach((g, k) =>
        add({
          id: `go-${g.key}`,
          type: "goal",
          label: g.label.replace(" this goal year", ""),
          secondaryLabel: g.max != null ? `${fmt(g.key, g.value ?? 0)} of ${fmt(g.key, g.max)}` : g.value ? `${fmt(g.key, g.value)} so far` : "No goal set",
          parentId: "go-goals",
          product: "go",
          importance: 1 - k * 0.05,
          status: g.max == null ? undefined : g.pace != null && g.value != null && g.value >= g.pace ? "healthy" : "attention",
          stats: [{ label: g.label, value: ofMax(g) ?? "0" }],
          pace: g.max != null && g.pace != null ? { headline: `On pace for this point in the year: ${fmt(g.key, g.pace)}` } : undefined,
        }),
      );
    }
  }

  // ---- ONE MOVE -----------------------------------------------------------
  const followups = moveItems.filter((i) => i.kind === "follow_up" || i.kind === "other");
  const dates = moveItems.filter((i) => i.kind === "birthday");
  const audit = moveItems.filter((i) => i.kind === "vip_touch");
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
  if (found) {
    if (followups.length) {
      add({ id: "move-followups", type: "category", label: "Follow-ups overdue", secondaryLabel: `${followups.length} overdue`, parentId: "move", product: "move", importance: 1, status: "action", summary: "Tasks in ONE MOVE that are past their date and not done." });
      followups.forEach((it, k) => itemNode(add, it, "move-followups", "move", 1 - k * 0.03));
    }
    if (dates.length) {
      add({ id: "move-dates", type: "category", label: "Birthdays and anniversaries", secondaryLabel: `${dates.length} in the next 30 days`, parentId: "move", product: "move", importance: 0.95, status: dates.some((d) => d.urgency === "today") ? "attention" : "opportunity", summary: "Your VIP-50 and VIP-100's special dates coming up." });
      dates.forEach((it, k) => itemNode(add, it, "move-dates", "move", 1 - k * 0.03, "person"));
    }
    add({
      id: "move-audit",
      type: "category",
      label: "Touch Audit",
      secondaryLabel: ofMax(touched) ? `${ofMax(touched)} fully touched` : "This month",
      parentId: "move",
      product: "move",
      importance: 0.9,
      status: audit.length ? "attention" : "healthy",
      summary: "Monthly touches for every VIP-50: call, video text, social, newsletter and mixer invite.",
      recommendations: audit.map((it) => ({ title: it.title, why: it.why, targetId: "move-audit" })),
      href: audit[0]?.link ?? `${MOVE_URL}/contacts/audit`,
    });
  }

  // ---- the other three: not connected to ONE yet ---------------------------
  OTHERS.forEach((p, k) => {
    const [label, sub] = OTHER_LABEL[p];
    const locked = !includes(o.pkg, p);
    add({
      id: p,
      type: "product",
      label,
      secondaryLabel: locked ? sub : "Not connected",
      parentId: "one",
      product: p,
      importance: 0.85 - k * 0.03,
      locked: locked || undefined,
      summary: locked
        ? "Included in ONE Complete."
        : `${OTHER_NAME[p]} isn't connected to ONE yet. Its work will show here once it is. Open ${OTHER_NAME[p]} to see it today.`,
    });
  });

  // ---- the day and the timeline ------------------------------------------
  const today: DayItem[] = items
    .filter(isToday)
    .slice(0, 8)
    .map((i) => {
      const kind = dayKind(i);
      return {
        id: `day:${i.id}`,
        nodeId: nodes.some((n) => n.id === nodeId(i)) ? nodeId(i) : "move-audit",
        product: itemProduct(i),
        kind,
        what: i.title,
        minutes: MINUTES[kind],
        vip: i.kind === "vip_touch" || i.kind === "birthday" || undefined,
      };
    });
  const dated = items
    .filter((i) => i.due && nodes.some((n) => n.id === nodeId(i)))
    .map((i) => ({ id: nodeId(i), product: itemProduct(i) as ProductKey, at: `${i.due}T18:00:00.000Z`, what: i.title }));

  return { nodes, edges, rootId: "one", changes: [], dated, today };
}

// "Birthday: Lena Brooks" -> the person "Lena Brooks", "Birthday · Tomorrow",
// so a person's orb is named (and initialled) by the person.
export function personLabel(it: SummaryItem): { label: string; sub?: string } {
  const m = /^([^:]{2,20}):\s*(.+)$/.exec(it.title);
  if (!m) return { label: it.title, sub: it.detail };
  return { label: m[2].trim(), sub: [m[1].trim(), it.detail].filter(Boolean).join(" · ") };
}

function itemNode(add: (n: Omit<GraphNode, "importance"> & { importance?: number }) => void, it: SummaryItem, parentId: string, product: "go" | "move", importance: number, type: GraphNode["type"] = "task") {
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
  });
}

// The same answer in the shape the morning note and ranking use.
export function liveData(env: SummaryEnvelope | null, agent: LiveAgent, today: string, reachable: boolean): DashboardData {
  const found = !!env?.found && reachable;
  const items = found ? (env!.items ?? []) : [];
  const toItem = (i: SummaryItem): Item => ({
    id: i.id,
    product: itemProduct(i),
    kind: (["vip_touch", "birthday", "follow_up", "other"].includes(i.kind) ? i.kind : "other") as ItemKind,
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
    items: items.filter((i) => itemProduct(i) === "go").map(toItem),
  };
  const move: ProductSummary = {
    product: "move",
    reachable: found,
    stats: ofMax(touched) ? [{ label: "VIP-50 fully touched this month", value: ofMax(touched)! }] : [],
    statusLine: "",
    items: items.filter((i) => itemProduct(i) === "move").map(toItem),
  };
  const others: ProductSummary[] = OTHERS.map((p) => ({ product: p, reachable: false, stats: [], statusLine: "", items: [] }));
  return {
    agent: { firstName: agent.firstName, lastName: "", email: agent.email, package: agent.pkg, founding: agent.founding, timeZone: "America/Denver" },
    today,
    scoreboard: null,
    products: [go, move, ...others],
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
