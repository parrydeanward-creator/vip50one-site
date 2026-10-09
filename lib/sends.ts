// What Pulse is sending (LEADS.md §5; Parry, 7 Oct: "a send list on every contact"). Read from ONE MOVE
// (vip50-web-crm#122): everything Pulse or ONE MOVE has sent or will send to this person, with Stop on anything
// queued and Stop all for every Pulse helper. The agent's own texts and emails are never stopped by it.

const MOVE_URL = "https://move.vip50one.com";
export const sendsUrl = (contactId: string) => `${MOVE_URL}/api/brain/people/${encodeURIComponent(contactId)}/sends`;
export const MAX_SENDS = 50;

export type SendAction = { action: "stop"; id: string } | { action: "stop_all" } | { action: "start_again" };

export interface Send {
  id: string;
  from: "pulse" | "move";
  what: string;
  channel: string | null;
  status: string;
  reason: string | null;
  at: string | null;
  canStop: boolean;
}
export interface Sends {
  stoppedAll: boolean;
  stoppedAt: string | null;
  items: Send[];
}

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** A LEADS §5 answer, checked; null when it is not one. Newest first, at most 50. */
export function readSends(j: unknown): Sends | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.items)) return null;
  const items: Send[] = [];
  for (const x of r.items as Record<string, unknown>[]) {
    const id = str(x?.id, 80), what = str(x?.what, 140), status = str(x?.status, 30);
    if (!id || !what || !status) continue;
    items.push({
      id,
      from: x.from === "move" ? "move" : "pulse",
      what,
      channel: str(x.channel, 20),
      status,
      reason: str(x.reason, 140),
      at: str(x.at, 40),
      canStop: x.can_stop === true,
    });
  }
  items.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
  return { stoppedAll: r.stopped_all === true, stoppedAt: str(r.stopped_at, 40), items: items.slice(0, MAX_SENDS) };
}

const STATUS: Record<string, string> = { queued: "Waiting to send", sent: "Sent", held: "Held", cancelled: "Stopped", stopped: "Stopped", failed: "Did not send", refused: "Not sent" };
/** Plain words for a status; an unknown one is shown as it came, capitalised. */
export const statusWord = (s: string) => STATUS[s] ?? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

export function sendsLine(s: Sends): string {
  if (s.stoppedAll) return "Pulse is stopped for this person";
  const waiting = s.items.filter((i) => i.status === "queued").length;
  if (!s.items.length) return "Nothing sent by Pulse or ONE MOVE yet";
  return waiting ? `${waiting} waiting to send` : `${s.items.length} sent`;
}

const REASON: Record<string, string> = { stopped_by_agent: "you stopped it", stopped_all: "stopped for this person", quiet_hours: "quiet hours", opted_out: "they asked to stop", no_consent: "no consent on file", do_not_call: "on a do-not-call list" };
/** Plain words for the send gate's reason codes; an unknown one with its underscores as spaces. */
export const reasonWord = (r: string) => REASON[r] ?? r.replace(/_/g, " ");
