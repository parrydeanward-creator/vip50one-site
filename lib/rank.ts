import { includes } from "./products.ts";
import type { DashboardData, Item, ItemKind, Urgency } from "./types.ts";

// The Today list. Plain rules, so it is fast and can never say something the
// products did not report (DASHBOARD-BRIEF.md §4).

export const TODAY_MAX = 7;

const URGENCY_ORDER: Record<Urgency, number> = { alert: 0, today: 1, soon: 2 };

// Within the same urgency: safety and money first, then the people (the
// method is relationships), then approvals that hold up marketing, then the rest.
const KIND_ORDER: Record<ItemKind, number> = {
  safety: 0,
  billing: 1,
  failed: 2,
  vip_touch: 3,
  birthday: 4,
  drop_by: 5,
  reaction: 6,
  approval: 7,
  follow_up: 8,
  new_contacts: 9,
  prep: 10,
  report: 11,
  other: 12,
};

export function isOverdue(item: Item, today: string): boolean {
  return item.due !== undefined && item.due < today;
}

function rankKey(item: Item, today: string): number[] {
  // An overdue item counts as due today, and sorts ahead of today's.
  const urgency = isOverdue(item, today) && item.urgency === "soon" ? "today" : item.urgency;
  return [
    URGENCY_ORDER[urgency],
    isOverdue(item, today) ? 0 : 1,
    KIND_ORDER[item.kind],
    item.due ? Number(item.due.replaceAll("-", "")) : 99999999,
  ];
}

function compare(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

export function rankToday(data: DashboardData, max = TODAY_MAX): Item[] {
  const items = data.products
    .filter((p) => p.reachable && includes(data.agent.package, p.product))
    .flatMap((p) => p.items);
  return items
    .map((item, i) => ({ item, key: [...rankKey(item, data.today), i] }))
    .sort((a, b) => compare(a.key, b.key))
    .slice(0, max)
    .map((x) => x.item);
}
