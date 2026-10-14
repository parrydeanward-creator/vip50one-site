import { MOVE_URL } from "./host.ts";

// VIP-SUMMARY §3c (v1.4): the contact card and "log a touch" come from ONE
// MOVE's own routes (vip50-web-crm#39), called with the agent's shared
// .vip50one.com sign-in. The rules (which boxes tick, which task closes) stay
// in ONE MOVE's logTouchEverywhere; the Brain only shows and asks.

export type TouchKind = "call" | "text" | "email";

export interface ContactCard {
  id: string;
  name: string;
  first_name?: string | null;
  phone?: string | null;
  email?: string | null;
  tier?: "vip50" | "vip100" | "none" | string | null;
  stage?: string | null;
  source_label?: string | null;
  last_touch?: { kind: string; on: string } | null;
  month?: Record<string, boolean> | null;
  quarter?: Record<string, boolean> | null;
  open_tasks?: { id: string; title: string; due?: string | null }[] | null;
  link?: string | null;
  offers?: ContactOffer[] | null;
}

// CONNECTIONS §5.2 (14 Oct, vip50-web-crm#232): a next step for an open house buyer, from ONE MOVE's contact read.
export interface ContactOffer { kind: "showly_tour" | "site_search"; label: string; url: string; suggested: boolean }

/** The offers, checked: known kinds, https only, Showly on showly.net, a site search on a /homes page. */
export function readOffers(raw: unknown): ContactOffer[] {
  if (!Array.isArray(raw)) return [];
  const out: ContactOffer[] = [];
  for (const o of raw as Record<string, unknown>[]) {
    if (!o || (o.kind !== "showly_tour" && o.kind !== "site_search") || typeof o.url !== "string") continue;
    let u: URL;
    try {
      u = new URL(o.url);
    } catch {
      continue;
    }
    if (u.protocol !== "https:") continue;
    if (o.kind === "showly_tour" && u.hostname !== "showly.net") continue;
    if (o.kind === "site_search" && !u.pathname.startsWith("/homes")) continue;
    const label = typeof o.label === "string" && o.label.trim() ? o.label.trim().slice(0, 60) : o.kind === "showly_tour" ? "Invite to a Showly tour" : "Send homes like this";
    out.push({ kind: o.kind, label, url: u.toString(), suggested: o.suggested === true });
  }
  return out;
}

/** "Send homes like this": the agent's own email, with the search link filled in. Nothing is sent from ONE. */
export function homesMailto(email: string | null, first: string, url: string): string {
  const to = mailable(email) ?? "";
  const body = `Hi ${first},\n\nHere are homes like the one you saw: ${url}\n\n`;
  return `mailto:${to}?subject=${encodeURIComponent("Homes like the one you saw")}&body=${encodeURIComponent(body)}`;
}

export const contactUrl = (id: string) => `${MOVE_URL}/api/brain/contact?id=${encodeURIComponent(id)}`;
export const touchUrl = `${MOVE_URL}/api/brain/touch`;

/** The monthly and quarterly boxes in Parry's order (CLAUDE.md, VIP touches). */
export const MONTH_BOXES: [string, string][] = [
  ["call", "Call"],
  ["video_text", "Video text"],
  ["social", "Social"],
  ["newsletter", "Newsletter"],
  ["mixer", "Mixer invite"],
];
export const QUARTER_BOXES: [string, string][] = [
  ["face_to_face", "Face-to-face"],
  ["handwritten_note", "Handwritten note"],
  ["drop_by", "Drop-by"],
];

/** tel: and sms: want digits (and a leading +); anything else is refused. */
export function dialable(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const d = phone.replace(/[^\d+]/g, "");
  return /^\+?\d{7,15}$/.test(d) ? d : null;
}

export function mailable(email: string | null | undefined): string | null {
  if (!email) return null;
  const e = email.trim();
  return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(e) ? e : null;
}

export const TIER_LABEL: Record<string, string> = { vip50: "VIP-50", vip100: "VIP-100" };

export const LOG_QUESTION: Record<TouchKind, string> = { call: "Log this call", text: "Log this text", email: "Log this email" };

// VIP-SUMMARY §3c.6 (v1.5): a task with no contact yet.
export const contactsSearchUrl = (q: string) => `${MOVE_URL}/api/brain/contacts?q=${encodeURIComponent(q)}`;
export const taskLinkUrl = `${MOVE_URL}/api/brain/task/link`;
export const taskDoneUrl = `${MOVE_URL}/api/brain/task/done`;

export interface ContactHit {
  id: string;
  name: string;
  tier?: string | null;
  phone_last4?: string | null;
}

/** "Call Brian Irby" -> "Brian Irby": the name to search for first. */
export function nameFromTitle(title: string): string {
  return title
    .replace(/^\s*(call|text|video text|e-?mail|meet with|meet|lunch with|coffee with|follow up with|follow-up with)\s+/i, "")
    .replace(/[^\p{L}\p{N}\s'.-]/gu, "")
    .trim();
}
