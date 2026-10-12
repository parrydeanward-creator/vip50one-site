import { MOVE_URL } from "./host.ts";

// VIP-SUMMARY §3ad (v1.71, 12 Oct): call from the desktop, dial on the phone. The Brain asks ONE MOVE to send one
// push to the agent's own ONE GO; the phone dials only when the agent taps Call there. Nothing reaches the client.

export const dialUrl = `${MOVE_URL}/api/brain/dial`;
export const dialStatusUrl = (id: string) => `${dialUrl}?id=${encodeURIComponent(id)}`;

export type DialReason = "no_phone" | "no_go" | "push_off" | "away" | "too_many";
export type DialSent = { ok: true; id: string; expiresAt: string };
export type DialRefused = { ok: false; reason: string; line: string };

const REASON_LINE: Record<DialReason, string> = {
  no_phone: "There is no phone number for them yet.",
  no_go: "ONE GO is not set up on your phone yet.",
  push_off: "Notifications for ONE GO are off on your phone.",
  away: "You are on time off, so nothing goes to your phone.",
  too_many: "That is a lot of calls sent at once. Try again in a moment.",
};

const str = (v: unknown, max = 200): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** ONE MOVE's answer to the send. ONE MOVE's own `error` line wins; a known reason has a plain fallback. */
export function readDial(raw: unknown): DialSent | DialRefused {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const id = str(r.id, 80);
  if (r.ok === true && id) return { ok: true, id, expiresAt: str(r.expires_at, 40) ?? "" };
  const reason = str(r.reason, 40) ?? "error";
  return { ok: false, reason, line: str(r.error, 200) ?? REASON_LINE[reason as DialReason] ?? "That did not reach your phone. Try again in a moment." };
}

export type DialState = "sent" | "opened" | "expired";
/** The status poll: opened wins over expired (opened in time is what counts). */
export function readDialStatus(raw: unknown): DialState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (str(r.opened_at, 40)) return "opened";
  if (r.expired === true) return "expired";
  return str(r.sent_at, 40) ? "sent" : null;
}

export const DIAL_LINE: Record<DialState, string> = {
  sent: "Sent to your phone. Tap the notification to call.",
  opened: "Opened on your phone.",
  expired: "That went unopened, so it expired. Send it again when you are ready.",
};

/** Poll every 3 s for at most 1 minute (§3ad.3). */
export const POLL_MS = 3000;
export const POLL_TRIES = 20;

export const dialBody = (contactId: string, ref?: string | null) => ({ contact_id: contactId, ref: ref ?? null });
