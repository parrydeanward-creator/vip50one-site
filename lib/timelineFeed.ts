import type { DatedNote } from "./graph/types.ts";
import { SPECIAL, addDays, nameOf, nextYearly } from "./askTools.ts";

// The timeline's real feed (walker audit 02, Parry 14 Oct: "yes 1-3 betters list"). Past = what really happened, with
// real dates: touches logged, closings, new leads, referrals. Future = what is really coming: birthdays and
// anniversaries, closings set, follow-ups due, quarterly VIP touches coming due. Built from the agent's own MASTER rows
// (app/api/timeline); today's to-dos are not here, they are the normal map. Each item points at the orb it lives
// under in the Brain (ONE MOVE for people, ONE YOU for closings), and at the person when there is one.

export const FEED_DAYS = 30;

export interface FeedRows {
  today: string; // YYYY-MM-DD, Mountain
  touches: { contact_id: string | null; touch_type: string | null; touched_at: string }[];
  closings: { closed_on: string; contact_id: string | null; side: string | null; price: number | null; record_source?: string | null }[];
  referrals: { created_at: string; referred_name: string | null; referrer_contact_id: string | null }[];
  leads: { id: string; first_name?: string | null; last_name?: string | null; created_at: string; source_label?: string | null }[];
  tasks: { title: string | null; due_date: string; contact_id: string | null }[];
  vips: Record<string, unknown>[]; // VIP-50 / VIP-100 rows with the yearly dates and the quarterly *_at stamps
  names: Map<string, string>; // contact id -> name, for the rows above that carry only an id
}

/**
 * MASTER agent_closings.record_source (16 Oct): how a closing came into ONE, shown on each one. Not the old `source`
 * column, which is the lead source. No label when it is absent or unknown.
 */
export function closingFrom(recordSource: unknown): string | null {
  return recordSource === "rezen" ? "From reZEN" : recordSource === "mls" ? "From the MLS" : recordSource === "manual" ? "Typed by you" : null;
}

const at = (day: string) => `${day}T18:00:00.000Z`; // about midday Mountain on that Mountain day
const denver = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

const TOUCH_WORD: Record<string, [string, string]> = {
  call: ["call", "calls"],
  video_text: ["video text", "video texts"],
  social: ["social touch", "social touches"],
  newsletter: ["newsletter", "newsletters"],
  mixer: ["mixer invite", "mixer invites"],
  market_report: ["market report", "market reports"],
  handwritten_note: ["handwritten note", "handwritten notes"],
  drop_by: ["drop-by", "drop-bys"],
  face_to_face: ["face to face", "face to faces"],
  text: ["text", "texts"],
  email: ["email", "emails"],
};
const touchWord = (t: string, n: number) => (TOUCH_WORD[t] ?? [t.replace(/_/g, " "), `${t.replace(/_/g, " ")}s`])[n === 1 ? 0 : 1];

const QUARTERLY = [
  ["value_touch_personal_note_at", "Handwritten note"],
  ["value_touch_dropby_gift_at", "Drop-by"],
  ["value_touch_face_to_face_at", "Face to face"],
] as const;

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function buildFeed(r: FeedRows, days = FEED_DAYS): DatedNote[] {
  const out: DatedNote[] = [];
  const from = addDays(r.today, -days);
  const to = addDays(r.today, days);
  const who = (id: string | null | undefined) => (id ? r.names.get(id) : undefined);

  // Touches: one line a day, counted by kind, naming up to three people.
  const byDay = new Map<string, { kinds: Map<string, number>; people: string[]; ids: string[] }>();
  for (const t of r.touches) {
    const day = denver(t.touched_at);
    if (day < from || day > r.today) continue;
    const d = byDay.get(day) ?? { kinds: new Map<string, number>(), people: [] as string[], ids: [] as string[] };
    const k = t.touch_type || "touch";
    d.kinds.set(k, (d.kinds.get(k) ?? 0) + 1);
    const name = who(t.contact_id);
    if (name && !d.people.includes(name)) {
      d.people.push(name);
      d.ids.push(t.contact_id!);
    }
    byDay.set(day, d);
  }
  for (const [day, d] of byDay) {
    const total = [...d.kinds.values()].reduce((a, b) => a + b, 0);
    const kinds = [...d.kinds].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} ${touchWord(k, n)}`).join(", ");
    const names = d.people.length ? ` with ${d.people.slice(0, 3).join(", ")}${d.people.length > 3 ? ` and ${d.people.length - 3} more` : ""}` : "";
    out.push({ id: "move", product: "move", at: at(day), what: `${total} ${total === 1 ? "touch" : "touches"} logged: ${kinds}${names}.`, contactId: d.ids.length === 1 ? d.ids[0] : undefined });
  }

  for (const c of r.closings) {
    if (c.closed_on < from || c.closed_on > to) continue;
    const name = who(c.contact_id);
    const side = /^buy/.test(c.side ?? "") ? "buyer side" : /^(sell|list)/.test(c.side ?? "") ? "listing side" : null;
    const bits = [name, side, c.price ? money(c.price) : null].filter(Boolean).join(", ");
    const past = c.closed_on <= r.today;
    const came = closingFrom(c.record_source);
    out.push({ id: "go", product: "go", at: at(c.closed_on), what: `${past ? "Closed" : "Closing set"}${bits ? `: ${bits}` : ""}.${came ? ` ${came}.` : ""}`, contactId: c.contact_id ?? undefined });
  }

  for (const f of r.referrals) {
    const day = denver(f.created_at);
    if (day < from || day > r.today) continue;
    const by = who(f.referrer_contact_id);
    const whom = f.referred_name?.trim();
    out.push({ id: "move", product: "move", at: at(day), what: `Referral${by ? ` from ${by}` : ""}${whom ? `: ${whom}` : ""}.`, contactId: f.referrer_contact_id ?? undefined });
  }

  // New contacts: by name, or one line for the day when there are more than three (an import adds hundreds).
  const leadDays = new Map<string, FeedRows["leads"]>();
  for (const l of r.leads) {
    const day = denver(l.created_at);
    if (day < from || day > r.today) continue;
    leadDays.set(day, [...(leadDays.get(day) ?? []), l]);
  }
  for (const [day, ls] of leadDays) {
    if (ls.length <= 3) {
      for (const l of ls) {
        const src = l.source_label?.trim();
        out.push({ id: "move", product: "move", at: at(day), what: `New contact: ${nameOf(l)}${src ? ` (${src})` : ""}.`, contactId: l.id });
      }
      continue;
    }
    const by = new Map<string, number>();
    for (const l of ls) by.set(l.source_label?.trim() || "added", (by.get(l.source_label?.trim() || "added") ?? 0) + 1);
    const top = [...by].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${n} ${k}`).join(", ");
    out.push({ id: "move", product: "move", at: at(day), what: `${ls.length} new contacts: ${top}.` });
  }

  // Coming: follow-ups due after today (today's are on the normal map).
  for (const t of r.tasks) {
    if (t.due_date <= r.today || t.due_date > to) continue;
    const name = who(t.contact_id);
    const title = (t.title ?? "Follow-up").trim();
    out.push({ id: "move", product: "move", at: at(t.due_date), what: `Due: ${title}${name && !title.includes(name) ? ` (${name})` : ""}.`, contactId: t.contact_id ?? undefined });
  }

  for (const c of r.vips) {
    const id = String(c.id);
    const name = nameOf(c);
    for (const [col, label] of SPECIAL) {
      const v = c[col];
      if (typeof v !== "string") continue;
      const n = nextYearly(v, addDays(r.today, 1));
      if (!n || n.on > to) continue;
      const what = col === "birthday" ? `${name}'s birthday` : col === "spouse_birthday" ? `${name}'s spouse's birthday` : `${name}: ${label}${n.years ? ` (${n.years} years)` : ""}`;
      out.push({ id: "move", product: "move", at: at(n.on), what: `${what}.`, contactId: id });
    }
    // A quarterly box clears 90 days after it was ticked (Parry, 1 Oct): that is when it comes due again.
    for (const [col, label] of QUARTERLY) {
      const v = c[col];
      if (typeof v !== "string") continue;
      const due = addDays(denver(v), 90);
      if (due <= r.today || due > to) continue;
      out.push({ id: "move", product: "move", at: at(due), what: `${label} due again for ${name}.`, contactId: id });
    }
  }

  return out.sort((a, b) => a.at.localeCompare(b.at));
}
