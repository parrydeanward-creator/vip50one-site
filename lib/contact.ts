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
