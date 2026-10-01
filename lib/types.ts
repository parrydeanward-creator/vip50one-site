// The shape the dashboard works in. Mirrors the proposed `vip_summary`
// contract (vip50-ecosystem research/DASHBOARD-BRIEF.md §3): each product
// returns items and card numbers for one agent; the dashboard merges them.

export type ProductId = "go" | "move" | "marquee" | "open" | "showly";

export type PackageId = "relationship" | "complete" | "elite";

// alert: safety, money or something broken. today: due today or overdue.
// soon: coming up, worth knowing.
export type Urgency = "alert" | "today" | "soon";

export type ItemKind =
  | "safety"
  | "billing"
  | "failed"
  | "vip_touch"
  | "birthday"
  | "drop_by"
  | "approval"
  | "follow_up"
  | "new_contacts"
  | "reaction"
  | "prep"
  | "report"
  | "other";

export interface Item {
  id: string;
  product: ProductId;
  kind: ItemKind;
  title: string;
  detail?: string;
  due?: string; // YYYY-MM-DD, the agent's local date
  urgency: Urgency;
  action: { label: string; href: string };
}

export interface Stat {
  label: string;
  value: string;
}

export interface ProductSummary {
  product: ProductId;
  reachable: boolean;
  stats: Stat[];
  statusLine: string;
  items: Item[];
}

export interface Scoreboard {
  touchesThisMonth: number;
  touchGoal: number;
  vipCount: number;
  vipGoal: number;
  streakDays: number;
  referralsThisYear: number;
  closingsThisYear: number;
  closingsGoal: number;
}

export interface Coaching {
  day: number; // day of the 90
  length: number;
  nextSessions: { label: string; when: string }[];
}

export interface Agent {
  firstName: string;
  lastName: string;
  email: string;
  package: PackageId;
  founding: boolean;
  timeZone: string;
}

export interface DashboardData {
  agent: Agent;
  today: string; // YYYY-MM-DD in the agent's time zone
  scoreboard: Scoreboard | null; // demo only; MASTER sends its numbers as product stats
  products: ProductSummary[];
  coaching: Coaching | null;
}
