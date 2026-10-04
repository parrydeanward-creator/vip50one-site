import { MOVE_URL } from "./host.ts";

// VIP-SUMMARY §3j (v1.14) and PROFILE.md: the one My Profile, in ONE Brain.
// The facts live once in MASTER (user_profiles); ONE MOVE's route reads and
// writes them and stores the headshot. The Brain shows the form and asks.

export interface Profile {
  email: string;
  full_name: string;
  preferred_name: string;
  mobile: string;
  brokerage: string;
  license_no: string;
  license_state: string;
  time_zone: string;
  title: string;
  bio: string;
  photo_url: string | null;
  photo_version: string | null;
}

export const profileUrl = `${MOVE_URL}/api/brain/profile`;
export const photoUrl = `${profileUrl}/photo`;

export type Field = Exclude<keyof Profile, "email" | "photo_url" | "photo_version">;
export const FIELDS: { key: Field; label: string; max: number; long?: boolean; hint?: string }[] = [
  { key: "full_name", label: "Full name", max: 120, hint: "On packets, flyers and recaps." },
  { key: "preferred_name", label: "Preferred first name", max: 60, hint: "How ONE greets you." },
  { key: "mobile", label: "Mobile", max: 30 },
  { key: "brokerage", label: "Brokerage", max: 120 },
  { key: "license_no", label: "Licence number", max: 40 },
  { key: "license_state", label: "Licence state", max: 2, hint: "Two letters, e.g. UT." },
  { key: "title", label: "Title", max: 80, hint: "e.g. REALTOR, Team Lead." },
  { key: "time_zone", label: "Time zone", max: 64 },
  { key: "bio", label: "Short bio", max: 600, long: true, hint: "Used on agent pages buyers see." },
];

export const TIME_ZONES: { value: string; label: string }[] = [
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Phoenix", label: "Arizona (Phoenix)" },
  { value: "America/Los_Angeles", label: "Pacific" },
  { value: "America/Chicago", label: "Central" },
  { value: "America/New_York", label: "Eastern" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
];

const s = (v: unknown, max = 600) => (typeof v === "string" ? v.slice(0, max) : "");

export function readProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.email !== "string") return null;
  const photo = typeof r.photo_url === "string" && /^https:\/\//.test(r.photo_url) ? r.photo_url : null;
  return {
    email: r.email,
    full_name: s(r.full_name, 120),
    preferred_name: s(r.preferred_name, 60),
    mobile: s(r.mobile, 30),
    brokerage: s(r.brokerage, 120),
    license_no: s(r.license_no, 40),
    license_state: s(r.license_state, 2),
    time_zone: s(r.time_zone, 64) || "America/Denver",
    title: s(r.title, 80),
    bio: s(r.bio, 600),
    photo_url: photo,
    photo_version: typeof r.photo_version === "string" ? r.photo_version : null,
  };
}

/** Only the fields that changed, trimmed; nothing when nothing changed. */
export function changes(before: Profile, draft: Profile): Partial<Record<Field, string>> {
  const out: Partial<Record<Field, string>> = {};
  for (const f of FIELDS) {
    const a = before[f.key].trim();
    const b = draft[f.key].trim();
    if (a !== b) out[f.key] = f.key === "license_state" ? b.toUpperCase() : b;
  }
  return out;
}

/** A plain-words problem with the form, or null. */
export function problem(draft: Profile): string | null {
  if (!draft.full_name.trim()) return "Your full name can't be empty.";
  const ls = draft.license_state.trim();
  if (ls && !/^[A-Za-z]{2}$/.test(ls)) return "Licence state is two letters, like UT.";
  const m = draft.mobile.trim();
  if (m && m.replace(/\D/g, "").length < 10) return "That mobile number looks too short.";
  return null;
}

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const PHOTO_MAX = 8 * 1024 * 1024;
/** A plain-words problem with a chosen photo, or null. */
export function photoProblem(file: { type: string; size: number }): string | null {
  if (!PHOTO_TYPES.includes(file.type)) return "Choose a JPEG, PNG, WebP or HEIC photo.";
  if (file.size > PHOTO_MAX) return "That photo is over 8 MB. Choose a smaller one.";
  return null;
}

/** "Parry" from the preferred name, else the first word of the full name (PROFILE.md M1). */
export const greetingName = (p: Profile) => p.preferred_name.trim() || p.full_name.trim().split(/\s+/)[0] || "";

/** PROFILE.md §7: each product's own settings, reached from the one profile. */
export const CONNECTIONS: { product: string; color: string; rows: { label: string; href?: string; classic?: boolean; note?: string }[] }[] = [
  { product: "ONE MOVE", color: "#2fb7a3", rows: [{ label: "Google photos, Lofty, notifications, contact sharing, billing", classic: true }, { label: "Goals", href: `${MOVE_URL}/profile/goals` }, { label: "Agent Hub (your public page)", href: `${MOVE_URL}/profile/agent-hub` }] },
  { product: "ONE GO", color: "#f5c542", rows: [{ label: "Phone notifications and the daily VIP reminder", note: "In the ONE GO app: Profile, Notification Settings." }] },
  { product: "Marquee", color: "#e05a8a", rows: [{ label: "Instagram and Facebook", href: "https://marquee.vip-50.com/go?open=connections" }, { label: "Writing voice", href: "https://marquee.vip-50.com/go?open=voice" }, { label: "Your team", href: "https://marquee.vip-50.com/go?open=team" }] },
  { product: "ONE Open", color: "#5aa9ff", rows: [{ label: "Open house settings (slot, texts, safety buddy, posts, follow-ups)", href: "https://open.vip-50.com/app/settings" }] },
  { product: "Showly", color: "#b07cff", rows: [{ label: "Lender sharing, buyer-answer emails, recap colour", href: "https://showly.net/app" }] },
];
