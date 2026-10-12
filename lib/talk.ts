import { MOVE_URL } from "./host.ts";

// Talk, don't type (Pulse roadmap #3) on the desktop. The agent speaks or types what happened; ONE MOVE's Pulse
// proposes a note, fact changes and a follow-up (POST /api/brain/talk writes nothing); the agent unticks anything
// wrong and saves only what is kept (POST /api/brain/talk/apply, vip50-web-crm#187). Nothing is sent to anyone.

export const talkUrl = `${MOVE_URL}/api/brain/talk`;
export const talkApplyUrl = `${MOVE_URL}/api/brain/talk/apply`;

export interface FieldChange { key: string; label: string; value: string; was: string | null }
export interface FollowUp { title: string; inDays: number }
export interface Proposal { note: string | null; fields: FieldChange[]; followUp: FollowUp | null; by: string | null }

const str = (v: unknown, max = 2000): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** ONE MOVE's proposal; a wrong shape keeps only the agent's own words as the note. */
export function readProposal(raw: unknown, words: string): Proposal {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const fields: FieldChange[] = Array.isArray(r.fields)
    ? (r.fields as unknown[]).flatMap((f) => {
        if (!f || typeof f !== "object") return [];
        const o = f as Record<string, unknown>;
        const key = str(o.key, 60);
        const value = str(o.value, 300);
        return key && value ? [{ key, label: str(o.label, 80) ?? key, value, was: str(o.was, 300) }] : [];
      }).slice(0, 12)
    : [];
  const f = r.follow_up as Record<string, unknown> | null;
  const days = f && typeof f.in_days === "number" && Number.isFinite(f.in_days) ? Math.min(365, Math.max(0, Math.round(f.in_days))) : null;
  const title = f && typeof f === "object" ? str(f.title, 160) : null;
  return { note: str(r.note) ?? (words.trim() ? words.trim().slice(0, 2000) : null), fields, followUp: title && days != null ? { title, inDays: days } : null, by: str(r.by, 40) };
}

/** Only what the agent kept. */
export function applyBody(contactId: string, p: Proposal, keep: { note: boolean; fields: Set<string>; followUp: boolean }) {
  return {
    contact_id: contactId,
    note: keep.note ? p.note : null,
    fields: p.fields.filter((f) => keep.fields.has(f.key)).map((f) => ({ key: f.key, value: f.value })),
    follow_up: keep.followUp && p.followUp ? { title: p.followUp.title, in_days: p.followUp.inDays } : null,
  };
}

/** "Saved: the note, 2 facts and a follow-up." */
export function savedLine(raw: unknown): string | null {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (r.ok !== true) return null;
  const s = (r.saved ?? {}) as Record<string, unknown>;
  const n = typeof s.fields === "number" ? s.fields : 0;
  const parts = [s.note ? "the note" : null, n ? `${n} ${n === 1 ? "fact" : "facts"}` : null, s.task ? "a follow-up" : null].filter(Boolean) as string[];
  if (!parts.length) return "Nothing to save.";
  return `Saved: ${parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0]}.`;
}

export const whenWords = (d: number) => (d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`);
