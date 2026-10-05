import type { Field, Person, Timeline } from "./people.ts";

// Call Prep (PULSE-ROADMAP #1, Parry, 5 Oct): a ten-second card before every call. Built only from
// what ONE MOVE already sends for one person (VIP-SUMMARY §3k.3 sections and §3k.6 timeline), so a
// new field in ONE MOVE's catalogue can show here with no contract change. Rules only, never made up:
// every line comes from a field the agent or their history filled in.

export interface CallPrep {
  name: string;
  first: string;
  pulse: string | null;
  lastTalk: string | null; // "Called 3 weeks ago: Sold their house"
  family: string[]; // "Spouse: Mike", "Kids: Avery, Kira (dog)"
  favourites: string[]; // "Favorite Restaurant: Cafe Rio"
  comingUp: string[]; // "Birthday in 4 days (Oct 9)"
  openItems: string[]; // "Follow up was due Oct 2"
  ask: string[]; // up to three things to ask, from the facts above
}

const DAY = 86_400_000;

function field(p: Person, key: string): Field | undefined {
  for (const s of p.sections) for (const f of s.fields) if (f.key === key) return f;
  return undefined;
}
function text(p: Person, key: string): string | null {
  const v = field(p, key)?.value;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  return null;
}
function list(p: Person, key: string): string[] {
  const v = field(p, key)?.value;
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string" && v.trim()) return v.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
  return [];
}

/** The next time a date ("1980-03-05" or "--03-05") comes round, from today; days away and a label. */
export function nextOccurrence(value: string, today: Date): { days: number; label: string } | null {
  const m = /^(?:\d{4}|--)-?(\d{2})-(\d{2})$/.exec(value) ?? /^\d{4}-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  const month = Number(m[1]) - 1, day = Number(m[2]);
  const t0 = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  let next = Date.UTC(today.getUTCFullYear(), month, day);
  if (next < t0) next = Date.UTC(today.getUTCFullYear() + 1, month, day);
  const label = new Date(next).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return { days: Math.round((next - t0) / DAY), label };
}

function ago(at: string, today: Date): string {
  const d = Math.max(0, Math.round((today.getTime() - new Date(at).getTime()) / DAY));
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 14) return `${d} days ago`;
  if (d < 60) return `${Math.round(d / 7)} weeks ago`;
  if (d < 730) return `${Math.round(d / 30)} months ago`;
  return `${Math.round(d / 365)} years ago`;
}

const TALK: Partial<Record<string, string>> = { call: "Called", text: "Texted", email: "Emailed", touch: "Touched", note: "Note" };
const FAVOURITES: [string, string][] = [
  ["favorite_restaurant", "Favorite restaurant"],
  ["morning_drink", "Morning drink"],
  ["drink_prep", "Coffee"],
  ["sports_team", "Favorite sport"],
  ["hobbies", "Hobbies"],
  ["hometown", "Hometown"],
  ["dream_vacation", "Dream vacation"],
  ["treat", "Favorite candy"],
  ["favorite_store", "Favorite store"],
  ["book_movie", "Favorite movie"],
];
const SPECIAL: [string, string][] = [
  ["birthday", "Birthday"],
  ["spouse_birthday", "Spouse's birthday"],
  ["anniversary", "Anniversary"],
  ["home_purchase_date", "Home anniversary"],
];

/** The card. `today` is passed in so the card is the same on every screen and in tests. */
export function callPrep(p: Person, t: Timeline | null, today: Date): CallPrep {
  const first = p.firstName ?? p.name.split(/\s+/)[0];
  const talk = t?.events.find((e) => e.kind in TALK);
  const lastTalk = talk ? `${TALK[talk.kind]} ${ago(talk.at, today)}: ${talk.title}` : null;

  const family: string[] = [];
  const spouse = text(p, "spouse_name");
  if (spouse) family.push(`Spouse: ${spouse}`);
  const kids = list(p, "children");
  if (kids.length) family.push(`Kids: ${kids.join(", ")}`);
  const pets = list(p, "pets");
  if (pets.length) family.push(`Pets: ${pets.join(", ")}`);
  const kidsInt = text(p, "kids_interests");
  if (kidsInt) family.push(`Kids are into: ${kidsInt}`);

  const favourites = FAVOURITES.flatMap(([k, label]) => {
    const v = text(p, k);
    return v ? [`${label}: ${v}`] : [];
  }).slice(0, 4);

  const comingUp: string[] = [];
  const soon: { key: string; label: string; days: number }[] = [];
  for (const [k, label] of SPECIAL) {
    const v = text(p, k);
    const n = v ? nextOccurrence(v, today) : null;
    if (n && n.days <= 30) {
      comingUp.push(n.days === 0 ? `${label} today` : `${label} in ${n.days} ${n.days === 1 ? "day" : "days"} (${n.label})`);
      soon.push({ key: k, label, days: n.days });
    }
  }

  const openItems: string[] = [];
  const fu = text(p, "next_followup");
  if (fu) {
    const d = Math.round((Date.parse(fu) - Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) / DAY);
    if (Number.isFinite(d) && d <= 7) openItems.push(d < 0 ? `Follow-up was due ${-d} ${d === -1 ? "day" : "days"} ago` : d === 0 ? "Follow-up due today" : `Follow-up due in ${d} ${d === 1 ? "day" : "days"}`);
  }
  const vipNote = text(p, "vip_notes");
  if (vipNote) openItems.push(`Your note: ${vipNote.length > 140 ? `${vipNote.slice(0, 137)}...` : vipNote}`);

  // What to ask: the first three that apply, most personal first.
  const ask: string[] = [];
  const b = soon.find((s) => s.key === "birthday");
  if (b) ask.push(b.days === 0 ? `Wish ${first} a happy birthday.` : `Ask ${first} about birthday plans.`);
  const sb = soon.find((s) => s.key === "spouse_birthday");
  if (sb && spouse) ask.push(`${spouse}'s birthday is coming: ask about plans.`);
  const an = soon.find((s) => s.key === "anniversary");
  if (an) ask.push("Their anniversary is coming: congratulate them.");
  const ha = soon.find((s) => s.key === "home_purchase_date");
  if (ha) ask.push("Their home anniversary is coming: ask how they love the house.");
  if (kids.length) ask.push(`Ask how ${kids[0].replace(/\s*\(.*\)$/, "").replace(/\s+born.*$/i, "")} is doing.`);
  const team = text(p, "sports_team");
  if (team) ask.push(`Ask about ${team}.`);
  const trip = text(p, "dream_vacation");
  if (trip) ask.push(`Ask if they have booked ${trip} yet.`);
  const serve = text(p, "how_can_i_serve");
  if (serve) ask.push(`They told you how to serve them: "${serve.length > 80 ? `${serve.slice(0, 77)}...` : serve}"`);
  if (!ask.length) ask.push(`Ask ${first} what is new, and fill in what you learn.`);

  return { name: p.name, first, pulse: p.pulse?.line ?? null, lastTalk, family, favourites, comingUp, openItems, ask: ask.slice(0, 3) };
}
