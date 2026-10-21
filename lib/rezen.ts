// Connect reZEN in My Profile (REZEN.md §3-3b; routes vip50-web-crm#237). The agent pastes their own reZEN API key; the
// server checks it against reZEN and keeps it in MASTER's Vault. It is never sent back, and the screen never shows it.
// The checklist decides what passes through; money and network start unticked (§3a).

const MOVE_URL = "https://move.vip50one.com";
export const rezenUrl = `${MOVE_URL}/api/brain/rezen`;
export const rezenConnectUrl = `${rezenUrl}/connect`;
export const rezenBoxesUrl = `${rezenUrl}/boxes`;
export const rezenDisconnectUrl = `${rezenUrl}/disconnect`;
export const REZEN_OPEN = "https://bolt.therealbrokerage.com";

export interface RezenBox { key: string; label: string; brings: string | null; on: boolean }
export interface RezenState {
  connected: boolean;
  name: string | null;
  email: string | null;
  connectedAt: string | null;
  lastReadAt: string | null;
  error: string | null;
  boxes: RezenBox[];
  /** What came through, per ticked box (vip50-web-crm#249): only counts and totals are used here. */
  read: RezenRead;
}

export interface RezenRead { plans: RezenPlan[]; openDeals: number | null; closedDeals: number | null; revsharePaid: number | null; network: number | null; readAt: string | null }

export interface RezenPlan { kind: string; plan: string }

/** `read.plans.data` is an object mapping a kind of plan to its name (vip50-web-crm#349); "commission_plan" shows as "Commission plan". */
export function readPlans(data: unknown): RezenPlan[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const out: RezenPlan[] = [];
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    const plan = typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
    const kind = k.replace(/[_-]+/g, " ").trim();
    if (!plan || !kind) continue;
    out.push({ kind: kind.charAt(0).toUpperCase() + kind.slice(1), plan: plan.slice(0, 120) });
  }
  return out.slice(0, 12);
}

const arr = (v: unknown) => (Array.isArray(v) ? v : null);
const money = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);

export function readRezenRead(v: unknown): RezenRead {
  const r = (v && typeof v === "object" ? v : {}) as Record<string, { read_at?: unknown; data?: unknown } | undefined>;
  const data = (k: string) => (r[k] && typeof r[k] === "object" ? (r[k]!.data as Record<string, unknown> | undefined) : undefined);
  const deals = data("deals"), rev = data("revshare"), net = data("network");
  const times = Object.values(r).map((x) => (x && typeof x.read_at === "string" ? x.read_at : null)).filter((x): x is string => !!x).sort();
  return {
    plans: readPlans(data("plans")),
    openDeals: deals ? arr(deals.open)?.length ?? null : null,
    closedDeals: deals ? arr(deals.closed)?.length ?? null : null,
    revsharePaid: rev ? money(rev.paid) : null,
    network: net ? (typeof net.total === "number" ? net.total : null) : null,
    readAt: times.length ? times[times.length - 1] : null,
  };
}

/** "From reZEN: 10 open and 20 recent closed deals, $1,240 revenue share paid, 12 agents in your network" (the same line
 * as Classic's My Profile). Null until something has come through. */
export function readLine(r: RezenRead): string | null {
  const parts: string[] = [];
  if (r.openDeals !== null || r.closedDeals !== null) parts.push(`${r.openDeals ?? 0} open and ${r.closedDeals ?? 0} recent closed deals`);
  if (r.revsharePaid !== null) parts.push(`$${Math.round(r.revsharePaid).toLocaleString("en-US")} revenue share paid`);
  if (r.network !== null) parts.push(`${r.network} ${r.network === 1 ? "agent" : "agents"} in your network`);
  return parts.length ? `From reZEN: ${parts.join(", ")}` : null;
}

const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export function readRezen(j: unknown): RezenState | null {
  if (!j || typeof j !== "object" || typeof (j as { connected?: unknown }).connected !== "boolean") return null;
  const r = j as Record<string, unknown>;
  const boxes: RezenBox[] = [];
  const seen = new Set<string>();
  for (const b of Array.isArray(r.boxes) ? (r.boxes as Record<string, unknown>[]) : []) {
    const key = str(b?.key, 40);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    boxes.push({ key, label: str(b.label, 80) ?? key, brings: str(b.brings, 160), on: b.on === true });
  }
  return {
    connected: r.connected === true,
    name: str(r.name, 120),
    email: str(r.email, 200),
    connectedAt: str(r.connected_at, 40),
    lastReadAt: str(r.last_read_at, 40),
    error: str(r.error, 160),
    boxes,
    read: readRezenRead(r.read),
  };
}

export type ConnectAnswer =
  | { kind: "ok"; name: string | null }
  | { kind: "confirm"; line: string }
  | { kind: "error"; line: string };

/** The answer to POST /connect. The key never comes back, and is never kept in this answer. */
export function readConnect(ok: boolean, j: unknown): ConnectAnswer {
  const r = (j && typeof j === "object" ? j : {}) as Record<string, unknown>;
  if (ok && r.ok === true) return { kind: "ok", name: str(r.name, 120) };
  if (r.needs_confirm === true) {
    const name = str(r.name, 120), email = str(r.email, 200);
    return { kind: "confirm", line: str(r.error, 300) ?? `This key belongs to ${name ?? "another person"}${email ? ` (${email})` : ""}. Is that you?` };
  }
  return { kind: "error", line: str(r.error, 300) ?? "reZEN didn't accept that key. Nothing was saved." };
}

/** A pasted key, trimmed; refuses what is plainly not a key (spaces inside, too short, too long). */
export function cleanKey(v: string): string | null {
  const k = v.trim();
  return k.length >= 16 && k.length <= 400 && !/\s/.test(k) ? k : null;
}

export function sinceWords(iso: string | null, now = Date.now()): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const m = Math.max(0, Math.round((now - t) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}
