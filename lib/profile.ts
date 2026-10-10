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
  team_name: string;
  brokerage_address: string;
  principal_broker: string;
  license_no: string;
  license_state: string;
  time_zone: string;
  title: string;
  bio: string;
  photo_url: string | null;
  photo_version: string | null;
  // VIP-SUMMARY §3j.4 (v1.39): null until ONE MOVE's route sends them, and then the Brain hides them.
  share_contact_info: boolean | null; // "Show my phone and email to members" (PROFILE.md §2, off by default)
  about: Record<AboutKey, string> | null; // the agent's own "Tell Us About You" answers
  // PROFILE.md v1.1 (8 Oct): the brokerage's legal name is confirmed once; any change to it clears the confirm.
  brokerage_confirmed_at: string | null;
}

// "Tell Us About You" (Parry, 5 Oct: settled, do not change): ONE GO's words and order (VIP50-app#72), the
// same MASTER user_profiles columns as the contact twins.
export const ABOUT = [
  ["Hobbies / Interests", "hobbies_interests"],
  ["Favorite Restaurant", "favorite_restaurant_bar"],
  ["Favorite Store", "favorite_store"],
  ["Morning Drink", "morning_drink"],
  ["Coffee Preference", "morning_drink_prep"],
  ["Favorite Sport", "favorite_sports_team"],
  ["Favorite Drink", "favorite_adult_beverage"],
  ["Favorite Candy", "favorite_treat"],
  ["Hometown", "hometown_city"],
  ["Favorite Color", "favorite_color"],
  ["Dream Vacation", "dream_vacation"],
  ["Favorite Movie", "favorite_movie_book"],
  ["How Can I Serve You", "how_can_i_serve_you"],
] as const;
export type AboutKey = (typeof ABOUT)[number][1];
export const ABOUT_MAX = 200;

export const profileUrl = `${MOVE_URL}/api/brain/profile`;
export const photoUrl = `${profileUrl}/photo`;

export type Field = Exclude<keyof Profile, "email" | "photo_url" | "photo_version" | "share_contact_info" | "about" | "brokerage_confirmed_at">;
export const FIELDS: { key: Field; label: string; max: number; long?: boolean; hint?: string }[] = [
  { key: "full_name", label: "Full name", max: 120, hint: "On packets, flyers and recaps." },
  { key: "preferred_name", label: "Preferred first name", max: 60, hint: "How ONE greets you." },
  { key: "mobile", label: "Mobile", max: 30 },
  { key: "brokerage", label: "Brokerage", max: 120, hint: "Its legal name exactly as on Utah Division of Real Estate records; every site and ad prints it as typed." },
  { key: "team_name", label: "Team name", max: 120, hint: "Shown beside the brokerage, never instead of it." },
  { key: "brokerage_address", label: "Brokerage address", max: 300, hint: "Printed at the foot of your marketing emails (the law asks for a postal address)." },
  { key: "principal_broker", label: "Principal broker", max: 120, hint: "Never shown to clients." },
  { key: "license_no", label: "Licence number", max: 40 },
  { key: "license_state", label: "Licence state", max: 2, hint: "Two letters, e.g. UT." },
  { key: "title", label: "Title", max: 120, hint: "e.g. REALTOR, Team Lead." },
  { key: "time_zone", label: "Time zone", max: 64 },
  { key: "bio", label: "Short bio", max: 1000, long: true, hint: "Used on agent pages buyers see." },
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

// limits match ONE MOVE's /api/brain/profile (lib/brain-profile.ts): bio 1000, title 120
const LIMIT = (k: Field) => FIELDS.find((f) => f.key === k)?.max ?? 120;
const s = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export function readProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  // ONE MOVE answers null for empty fields (vip50-web-crm#56); a profile needs a name or an email.
  if (typeof r.email !== "string" && typeof r.full_name !== "string") return null;
  const photo = typeof r.photo_url === "string" && /^https:\/\//.test(r.photo_url) ? r.photo_url : null;
  return {
    email: typeof r.email === "string" ? r.email : "",
    full_name: s(r.full_name, LIMIT("full_name")),
    preferred_name: s(r.preferred_name, LIMIT("preferred_name")),
    mobile: s(r.mobile, LIMIT("mobile")),
    brokerage: s(r.brokerage, LIMIT("brokerage")),
    team_name: s(r.team_name, LIMIT("team_name")),
    brokerage_address: s(r.brokerage_address, LIMIT("brokerage_address")),
    principal_broker: s(r.principal_broker, LIMIT("principal_broker")),
    license_no: s(r.license_no, LIMIT("license_no")),
    license_state: s(r.license_state, LIMIT("license_state")),
    time_zone: s(r.time_zone, 64) || "America/Denver",
    title: s(r.title, LIMIT("title")),
    bio: s(r.bio, LIMIT("bio")),
    photo_url: photo,
    photo_version: typeof r.photo_version === "string" ? r.photo_version : null,
    share_contact_info: typeof r.share_contact_info === "boolean" ? r.share_contact_info : null,
    about: readAbout(r.about),
    brokerage_confirmed_at: typeof r.brokerage_confirmed_at === "string" ? r.brokerage_confirmed_at : null,
  };
}

function readAbout(v: unknown): Profile["about"] {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const r = v as Record<string, unknown>;
  return Object.fromEntries(ABOUT.map(([, k]) => [k, s(r[k], ABOUT_MAX)])) as Record<AboutKey, string>;
}

/** The answers that changed, trimmed (blank clears); null when none did. */
export function aboutChanges(before: Profile["about"], draft: Profile["about"]): Partial<Record<AboutKey, string | null>> | null {
  if (!before || !draft) return null;
  const out: Partial<Record<AboutKey, string | null>> = {};
  for (const [, k] of ABOUT) {
    const a = before[k].trim(), b = draft[k].trim();
    if (a !== b) out[k] = b || null;
  }
  return Object.keys(out).length ? out : null;
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
/** What ONE MOVE accepts (Vercel refuses bodies over 4.5 MB; vip50-web-crm#56). */
export const UPLOAD_MAX = 4 * 1024 * 1024;
/** What the agent may choose: the Brain shrinks it before uploading. */
export const PHOTO_MAX = 25 * 1024 * 1024;
/** A plain-words problem with a chosen photo, or null. */
export function photoProblem(file: { type: string; size: number }): string | null {
  if (!PHOTO_TYPES.includes(file.type)) return "Choose a JPEG, PNG, WebP or HEIC photo.";
  if (file.size > PHOTO_MAX) return "That photo is over 25 MB. Choose a smaller one.";
  return null;
}

/** The size a headshot is drawn at before upload: the long side at most `max`. */
export function fitSize(w: number, h: number, max = 1200): { w: number; h: number } {
  if (w <= max && h <= max) return { w, h };
  const k = max / Math.max(w, h);
  return { w: Math.round(w * k), h: Math.round(h * k) };
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

/** "Confirm your brokerage" (PROFILE.md v1.1-v1.2): while the legal name is unconfirmed or the address is missing. */
export function brokerageAsk(p: Profile): string | null {
  if (!p.brokerage.trim()) return "Add your brokerage's legal name and address.";
  if (!p.brokerage_confirmed_at) return `Is "${p.brokerage.trim()}" your brokerage's legal name, exactly as on Utah Division of Real Estate records?`;
  if (!p.brokerage_address.trim()) return "Add your brokerage's address. Your marketing emails wait until it is in.";
  return null;
}
