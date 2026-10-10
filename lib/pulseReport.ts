// "Pulse did this" (LEADS §6, §6.1; GO/MOVE vip50-web-crm#152): the week's report of what Pulse sent, what waits,
// what was held back and why, and what it handed back to the agent. Shown in the Weekly Review. Pulse's sends never
// count toward the agent's 100 or VIP touches.

const MOVE_URL = "https://move.vip50one.com";
export const pulseReportUrl = (week?: string) => `${MOVE_URL}/api/brain/pulse-report${week ? `?week=${week}` : ""}`;
export const seenUrl = `${MOVE_URL}/api/brain/pulse-report/seen`;

export interface Handback {
  id: string;
  contactId: string | null;
  contact: string;
  worker: string;
  about: string;
  excerpt: string | null;
  at: string;
  seen: boolean;
}
export interface PulseReport {
  summary: string;
  sent: number;
  drafts: number;
  held: { words: string; count: number }[];
  autopilot: { contact: string; worker: string; what: string | null; at: string }[];
  handbacks: Handback[];
  touches: string | null;
}

const str = (v: unknown, n = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : 0);
const arr = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);

/** A §6.1 answer, checked; null when it is not one. */
export function readPulseReport(j: unknown): PulseReport | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.workers) || typeof r.summary !== "string") return null;
  const workers = arr(r.workers);
  return {
    summary: str(r.summary, 400)!,
    sent: workers.reduce((t, w) => t + num(w?.sent), 0),
    drafts: workers.reduce((t, w) => t + num(w?.drafts), 0),
    held: arr(r.held)
      .map((x) => ({ words: str(x?.words, 80) ?? "Held", count: num(x?.count) }))
      .filter((x) => x.count > 0),
    autopilot: arr(r.autopilot)
      .map((x) => ({ contact: str(x?.contact, 80) ?? "A contact", worker: str(x?.worker, 40) ?? "Pulse", what: str(x?.what, 140), at: str(x?.at, 40) ?? "" }))
      .filter((x) => x.at)
      .slice(0, 20),
    handbacks: arr(r.handbacks)
      .map((x) => ({ id: str(x?.id, 60) ?? "", contactId: str(x?.contact_id, 60), contact: str(x?.contact, 80) ?? "A contact", worker: str(x?.worker, 40) ?? "Pulse", about: str(x?.about, 80) ?? "Needs you", excerpt: str(x?.excerpt, 200), at: str(x?.at, 40) ?? "", seen: x?.seen === true }))
      .filter((x) => x.id && x.at),
    touches: str((r.touches as Record<string, unknown> | undefined)?.words, 200),
  };
}

export const heldTotal = (p: PulseReport) => p.held.reduce((t, h) => t + h.count, 0);
export const unseen = (p: PulseReport) => p.handbacks.filter((h) => !h.seen).length;

/** One line for the review card. */
export function reportLine(p: PulseReport): string {
  const parts = [`${p.sent} sent`, `${p.drafts} waiting`, `${heldTotal(p)} held back`];
  if (p.handbacks.length) parts.push(`${p.handbacks.length} handed back`);
  return parts.join(", ");
}

/** The example agent's week: two drafts waiting, held sends for a missing brokerage address, one hand-back. */
export function demoPulseReport(today: string): PulseReport {
  return readPulseReport({
    summary: "This week Pulse sent 0 messages for you, has 2 drafts waiting for you to send, held back 3, and handed 1 back to you.",
    workers: [{ worker: "birthdays", label: "Birthdays", sent: 0, drafts: 2, held: 3 }],
    held: [{ reason: "no_brokerage_address", words: "No brokerage address yet", count: 3 }],
    autopilot: [],
    handbacks: [{ id: "hb1", contact_id: "r2", contact: "Mike Torres", worker: "Concierge", topic: "showing", about: "Wants a showing", excerpt: "Can we see 88 W Pine Ct on Saturday morning?", at: `${today}T15:00:00Z`, seen: false }],
    touches: { words: "Your own touches: 41. Pulse's sends: 0 (these never count toward your 100 or your VIP touches)." },
  })!;
}
