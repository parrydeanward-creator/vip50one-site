// Example data for the recorded Brain tour (/dashboard?demo=1). The recorder (Playwright) answers ONE MOVE's live
// API (https://move.vip50one.com/api/...) and this site's own signed-in routes with invented data, so every native
// screen (Contacts, VIP rings, Touch Audit, Hot/Warm/Cold, Rolodex, Daily and Weekly Tracker, My Profile, the contact
// card, the team cards) draws instead of falling back to the Classic iframe. Nothing reaches a real server for these
// routes: every move.vip50one.com/api/* request and the listed site routes are always fulfilled here.
//
// Every person, business, address and number is invented: example.com emails, 555-01xx phone numbers, made-up
// Utah-style street names. The agent is Sarah Bennett (sarah@example.com), ONE Complete + ONE Growth, team lead of the
// invented "Summit Home Group". Names match the demo graph (lib/graph/demo.ts, lib/graph/move.ts): Jen Alvarez
// (birthday tomorrow), Amy Chen (sent a referral), Marcus Lee (lunch), Dave Kim (handwritten note), the Millers (Showly
// tour), Jane Smith (new baby, deal in due diligence), Rosa Diaz (overdue follow-up)...
//
// Saving works: ticks, swaps, notes, profile edits and so on change the in-memory state below, so the screen shows the
// saved state and a reload keeps it (until installFixtures is called again, which starts fresh).
//
//   import { installFixtures } from "./tour-fixtures.mjs";
//   await installFixtures(page);              // before page.goto(...)
//   await installFixtures(page, { log: true }); // print each answered request

export const MOVE = "https://move.vip50one.com";
const SITE_ORIGIN_FALLBACK = "http://localhost:3102";

// ---- dates ----------------------------------------------------------------------------------------------------------

const DAY = 86_400_000;
const denverDay = (ms = Date.now()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
const addDays = (ymd, n) => new Date(Date.parse(`${ymd}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const mondayOf = (ymd) => {
  const d = new Date(`${ymd}T12:00:00Z`);
  return addDays(ymd, -((d.getUTCDay() + 6) % 7));
};
/** An ISO time `days` from today (negative = past), at about `hour` Mountain time. */
const at = (days, hour = 11, min = 0) => {
  const ymd = addDays(denverDay(), days);
  // Mountain time is UTC-6 (summer) / UTC-7: use 6 hours, which keeps every hour of the day on the right Denver day
  return new Date(Date.parse(`${ymd}T00:00:00Z`) + ((hour + 6) * 60 + min) * 60_000).toISOString();
};
const day = (days) => addDays(denverDay(), days);
/** "--MM-DD" (no year) for a day `days` from today. */
const md = (days) => `--${day(days).slice(5)}`;

// ---- small helpers --------------------------------------------------------------------------------------------------

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** A stable UUID for person n (ONE MOVE's readers want real UUIDs). */
export const uuid = (n, kind = "a") => `0000${kind === "a" ? "0000" : "b0b0"}-5a1e-4c0d-8e00-${String(n).padStart(12, "0")}`;
const pad2 = (n) => String(n).padStart(2, "0");
const phoneOf = (n) => `(801) 555-01${pad2(n % 100)}`;
const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
const clone = (x) => JSON.parse(JSON.stringify(x));

// ---- the agent ------------------------------------------------------------------------------------------------------

export const AGENT = {
  email: "sarah@example.com",
  full_name: "Sarah Bennett",
  first: "Sarah",
  team: "Summit Home Group",
  city: "Draper",
};

export const TEAM_AGENTS = [
  { id: uuid(1, "b"), name: "Sarah Bennett", role: "owner" },
  { id: uuid(2, "b"), name: "Kyle Hansen", role: "admin" },
  { id: uuid(3, "b"), name: "Megan Ostler", role: "agent" },
  { id: uuid(4, "b"), name: "Brady Cole", role: "agent" },
  { id: uuid(5, "b"), name: "Natalie Price", role: "agent" },
  { id: uuid(6, "b"), name: "Jordan Wells", role: "agent" },
  { id: uuid(7, "b"), name: "Chloe Barnes", role: "agent" },
];

// ---- the people -----------------------------------------------------------------------------------------------------

const CITIES = [
  ["Draper", "84020"], ["Sandy", "84092"], ["South Jordan", "84095"], ["Lehi", "84043"], ["Riverton", "84065"],
  ["Herriman", "84096"], ["Holladay", "84117"], ["Cottonwood Heights", "84121"], ["Alpine", "84004"], ["Bountiful", "84010"],
];
const STREETS = [
  "Maple Ridge Dr", "Willow Lane", "Juniper Hollow Ct", "Aspen Bluff Way", "Sage Creek Rd", "Quail Run Dr", "Cedar Bend Ln",
  "Granite Peak Cir", "Red Pine Ct", "Silver Fox Way", "Lark Meadow Dr", "Canyon Vista Ln", "Bridle Path Rd", "Golden Aster Way",
];
const addressOf = (n) => {
  const [city, zip] = CITIES[n % CITIES.length];
  return `${100 + ((n * 373) % 9800)} ${STREETS[(n * 5) % STREETS.length]}, ${city}, UT ${zip}`;
};

const FIRST = [
  "Aaron", "Abby", "Adam", "Alexis", "Andrea", "Austin", "Bailey", "Blake", "Brandon", "Brooke", "Caleb", "Carmen", "Cody", "Colin",
  "Dallin", "Derek", "Elena", "Emily", "Erin", "Gavin", "Grace", "Hannah", "Hunter", "Isaac", "Jared", "Jenna", "Kara", "Kelsey",
  "Landon", "Lauren", "Logan", "Madison", "Mason", "McKay", "Nolan", "Olivia", "Paige", "Rachel", "Ryan", "Sadie", "Spencer",
  "Tanner", "Tessa", "Trevor", "Whitney", "Zach", "Zoe", "Wyatt", "Leah", "Owen",
];
const LAST = [
  "Adams", "Allred", "Bishop", "Bowen", "Call", "Christensen", "Dalton", "Ellis", "Farr", "Fisher", "Gardner", "Hale", "Harmon",
  "Holt", "Kimball", "Larsen", "Lund", "Madsen", "Merrill", "Nielsen", "Olsen", "Pace", "Peterson", "Pratt", "Reese", "Rowley",
  "Sorensen", "Stoddard", "Thatcher", "Webb", "Whitaker", "Young", "Barlow", "Carver", "Draper", "Everett", "Frost", "Gibbs",
  "Hatch", "Ivie", "Kerr", "Lowe", "Monson", "Nash", "Ostrander", "Pugh", "Rasband", "Sato", "Tolman", "Vargas",
];

const SOURCE_LABEL = {
  sphere: "Sphere",
  open_house: "Open house, 1482 Maple Ridge Dr",
  website: "Your website",
  lofty: "Lofty",
  marquee: "Marquee campaign",
  showly: "Showly tour",
  imported: "Imported from your phone",
  other: "Referral",
};

// The named people, first: VIP-50 (n 1-47), then VIP-100 (n 48-77). Everything not given is filled in by `filler`.
const NAMED = [
  // VIP-50
  { first: "Jen", last: "Alvarez", tier: "vip50", source: "sphere", birthday: md(1), bdayYear: 1986, spouse: "Carlos", kids: ["Mia (girl) born 2015-04-11", "Leo (boy) born 2018-09-02"], occupation: "Pediatric nurse", restaurant: "Cafe Rio", drink: "Diet Coke", vip_notes: "Loves a handwritten card. Referred the Nguyens last spring.", pulse: { reason: "Birthday tomorrow. Call her.", urgency: "today" }, cls: null },
  { first: "Amy", last: "Chen", tier: "vip50", source: "past_clients", occupation: "CPA", restaurant: "Pago", drink: "Oat milk latte", vip_notes: "Sent you a referral 12 days ago (her coworker).", pulse: { reason: "Sent you a referral. Say thank you.", urgency: "today" } },
  { first: "Marcus", last: "Lee", tier: "vip50", source: "sphere", occupation: "Owns Lee Custom Cabinets", restaurant: "Lucky Bowl Ramen", drink: "Americano", vip_notes: "Lunch on the calendar. Ask about his shop expansion.", pulse: { reason: "No face-to-face in 94 days.", urgency: "now" } },
  { first: "Dave", last: "Kim", tier: "vip50", source: "past_clients", spouse: "Grace", occupation: "Software engineer", vip_notes: "Referred the Nguyens; they closed 20 days ago.", pulse: { reason: "Handwritten thank-you note is due.", urgency: "today" } },
  { first: "Sarah", last: "Mitchell", tier: "vip50", source: "sphere", occupation: "Dental hygienist", restaurant: "Tucanos", drink: "Peppermint tea" },
  { first: "Jane", last: "Smith", tier: "vip50", source: "past_clients", spouse: "Ryan", kids: ["Ivy (girl) born 2026-10-02"], cls: "hot", occupation: "Interior designer", vip_notes: "Buying up: under contract on 9 Aspen Bluff Way, due diligence ends today.", pulse: { reason: "New baby. Send a card and a gift.", urgency: "today" } },
  { first: "Mike", last: "Torres", tier: "vip50", source: "sphere", occupation: "High school football coach", sport: "Utah Utes" },
  { first: "Annie", last: "Park", tier: "vip50", source: "past_clients", occupation: "Pharmacist", drink: "Matcha" },
  { first: "Dave", last: "Ortiz", tier: "vip50", source: "sphere", occupation: "Electrician", sport: "Real Salt Lake" },
  { first: "Rosa", last: "Diaz", tier: "vip50", source: "open_house", cls: "warm", occupation: "Teacher", vip_notes: "Wants to sell in spring; asked for a market update.", pulse: { reason: "Follow-up is 3 days overdue.", urgency: "now" } },
  { first: "Tom", last: "Reyes", tier: "vip50", source: "past_clients", spouse: "Lisa", anniversary: md(12), occupation: "Firefighter" },
  { first: "Dana", last: "Ruiz", tier: "vip50", source: "sphere", occupation: "Realtor's lender friend, loan officer" },
  { first: "Sam", last: "Patel", tier: "vip50", source: "sphere", occupation: "Physical therapist" },
  { first: "Priya", last: "Shah", tier: "vip50", source: "website", occupation: "Product manager", pulse: { reason: "Text her the new listings in Lehi.", urgency: "today" } },
  { first: "Ben", last: "Ortiz", tier: "vip50", source: "sphere", cls: "warm", occupation: "Contractor" },
  // VIP-100 (from n 48)
  { n: 48, first: "Tom", last: "Miller", tier: "vip100", source: "showly", cls: "hot", spouse: "Kate", kids: ["Ella (girl) born 2019-06-20"], occupation: "Airline pilot", vip_notes: "The Millers: touring again; said Yes to two homes in Draper.", pulse: { reason: "The Millers said Yes to 2 homes. Book the second tour.", urgency: "today" } },
  { n: 49, first: "Chris", last: "Parker", tier: "vip100", source: "showly", cls: "hot", spouse: "Dana", occupation: "Orthodontist", vip_notes: "The Parkers: toured 742 Willow Lane today." },
  { n: 50, first: "Sam", last: "Reyes", tier: "vip100", source: "website", cls: "hot", occupation: "Nurse anesthetist" },
  { n: 51, first: "Sara", last: "Kent", tier: "vip100", source: "open_house", cls: "cold", occupation: "Graphic designer" },
];

const HWC_EXTRA = [
  // [n, class] for people without a class above, so the lists are full (4 hot, 5 warm, 3 cold)
  [16, "warm"], [17, "warm"], [52, "warm"], [53, "cold"], [910, "cold"],
];

const POOL_SIZE = 1284;

function buildPeople() {
  const r = rng(50);
  const people = new Map();
  const byN = new Map(NAMED.map((p, i) => [p.n ?? i + 1, p]));
  for (let n = 1; n <= POOL_SIZE; n++) {
    const named = byN.get(n);
    const first = named?.first ?? FIRST[(n * 7) % FIRST.length];
    const last = named?.last ?? LAST[(n * 11 + Math.floor(n / FIRST.length)) % LAST.length];
    let tier = named?.tier ?? (n <= 47 ? "vip50" : n <= 77 ? "vip100" : null);
    let group = tier;
    let source = named?.source;
    if (!group) {
      const x = r();
      group = n >= 906 && n <= 908 ? "to_sort" : x < 0.16 ? "past_clients" : "sphere";
    } else r();
    if (!source) {
      const y = r();
      source = y < 0.3 ? "imported" : y < 0.47 ? "open_house" : y < 0.56 ? "website" : y < 0.66 ? "lofty" : y < 0.68 ? "marquee" : y < 0.7 ? "showly" : y < 0.78 ? "other" : "sphere";
      if (group === "to_sort") source = "open_house";
    } else r();
    if (named?.source === "past_clients") {
      group = tier ?? "past_clients";
      source = "other";
    }
    const bday = named?.birthday ?? (r() < 0.75 ? `${1955 + Math.floor(r() * 45)}-${pad2(1 + Math.floor(r() * 12))}-${pad2(1 + Math.floor(r() * 28))}` : null);
    const p = {
      n,
      id: uuid(n),
      first,
      last,
      name: `${first} ${last}`,
      tier: tier ?? "none",
      group,
      pastClient: named?.source === "past_clients" || group === "past_clients",
      source,
      sourceLabel: n >= 906 && n <= 908 ? "Open house, 1482 Maple Ridge Dr (Saturday)" : SOURCE_LABEL[source] ?? "Other",
      phone: phoneOf(n),
      email: `${slug(first)}.${slug(last)}${n > 99 ? n : ""}@example.com`,
      address: addressOf(n),
      birthday: bday && named?.bdayYear && bday.startsWith("--") ? `${named.bdayYear}${bday.slice(1)}` : bday,
      spouse: named?.spouse ?? (n <= 120 && r() < 0.5 ? FIRST[(n * 3) % FIRST.length] : null),
      kids: named?.kids ?? [],
      anniversary: named?.anniversary ?? null,
      occupation: named?.occupation ?? (n <= 120 ? ["Teacher", "Accountant", "Nurse", "Engineer", "Small business owner", "Dentist", "Sales manager", "Designer"][n % 8] : null),
      restaurant: named?.restaurant ?? (n <= 77 ? ["Hires Big H", "Pizzeria Seven Twelve", "Red Iguana", "Sweeto Burrito", "Cubby's", "Sill-Ice"][n % 6] : null),
      drink: named?.drink ?? (n <= 77 ? ["Dirty Dr Pepper", "Coffee, black", "Hot chocolate", "Sparkling water", "Chai latte"][n % 5] : null),
      sport: named?.sport ?? (n <= 77 ? ["Utah Jazz", "BYU Cougars", "Utah Utes", "Utah Hockey Club"][n % 4] : null),
      vipNotes: named?.vip_notes ?? null,
      cls: named?.cls ?? null,
      pulse: named?.pulse ?? null,
      lastTouchDays: named?.pulse?.urgency === "now" ? 21 + (n % 9) : tier === "vip50" ? 1 + ((n * 7) % 10) : tier === "vip100" ? 2 + ((n * 3) % 16) : 30 + ((n * 13) % 400),
      month: null,
      quarter: null,
    };
    people.set(p.id, p);
  }
  for (const [n, cls] of HWC_EXTRA) {
    const p = people.get(uuid(n));
    if (p && !p.cls) p.cls = cls;
  }
  // VIP touches this month: about 68% of the VIP-50's monthly boxes done (Touch Audit "68%").
  const t = rng(7);
  const MONTH = ["call", "video_text", "social", "newsletter", "mixer"];
  const QUARTER = ["face_to_face", "handwritten_note", "drop_by"];
  for (const p of people.values()) {
    if (p.tier !== "vip50" && p.tier !== "vip100") continue;
    const share = p.tier === "vip50" ? 0.69 : 0.45;
    p.month = Object.fromEntries(MONTH.map((k) => [k, t() < share]));
    p.quarter = Object.fromEntries(QUARTER.map((k) => [k, t() < (p.tier === "vip50" ? 0.55 : 0.3)]));
  }
  const set = (n, month, quarter) => {
    const p = people.get(uuid(n));
    Object.assign(p.month, month);
    Object.assign(p.quarter, quarter ?? {});
  };
  set(1, { call: false, video_text: true, social: true, newsletter: true, mixer: true }); // Jen: call her
  set(2, { call: false, newsletter: true }); // Amy: thank her
  set(3, { call: true }, { face_to_face: false }); // Marcus: lunch
  set(4, {}, { handwritten_note: false }); // Dave Kim: note
  set(10, { call: false, video_text: false }); // Rosa
  for (const n of [5, 7, 8, 12, 13]) set(n, { call: true, video_text: true, social: true, newsletter: true, mixer: true });
  return people;
}

const MONTH_KEYS = ["call", "video_text", "social", "newsletter", "mixer"];
const monthDone = (p) => MONTH_KEYS.filter((k) => p.month?.[k]).length;
const urgencyOf = (p) => (p.pulse?.urgency === "now" ? "overdue" : p.lastTouchDays > 30 || monthDone(p) <= 1 ? "overdue" : monthDone(p) <= 3 ? "due_soon" : "ok");

// ---- the rest of the state ------------------------------------------------------------------------------------------

const DAILY_SECTIONS = [
  ["habits", "Daily Habits", [["made_bed", "Made Bed", 1], ["affirmations", "Affirmations", 1], ["gratitudes", "Gratitudes", 1], ["exercise", "Exercise", 1], ["tracked_macros", "Tracked Macros", 1], ["positive_reading", "Positive Reading", 1]]],
  ["contacts", "Contacts", [["hot_contact", "Hot Contact", 1], ["warm_contact", "Warm Contact", 1], ["cold_contact", "Cold Contact", 1]]],
  ["calls", "Calls", [1, 2, 3, 4, 5].map((n) => [`call_${n}`, `Call #${n}`, 1])],
  ["video_texts", "Video Texts", [1, 2, 3, 4, 5].map((n) => [`video_text_${n}`, `Video Text #${n}`, 1])],
  ["other", "Other Activities", [["social_post_1", "Social Post #1", 1], ["social_post_2", "Social Post #2", 1], ["meditation_visualization", "Meditation / Visualization", 1], ["lunch_face_to_face", "Lunch / Face to Face", 2], ["note_1", "Handwritten Note #1", 1], ["note_2", "Handwritten Note #2", 1]]],
];
const WEEKLY_SECTIONS = [
  ["bonus", "Weekly Activities", [
    ["lead_gen_crm_drip", "Lead Gen / CRM / Drip", 5], ["mixer_participation", "Mixer Participation", 5], ["mixer_invite_sent", "Mixer invite sent", 5, true],
    ["newsletter_sent", "Newsletter sent", 5, true], ["listing_buyer_activity", "Listing – Buyer Activity", 5], ["lunch_coffee_ff_additional", "Lunch / Coffee F/F 1", 5],
    ["lunch_coffee_ff_additional_2", "Lunch / Coffee F/F 2", 5], ["agent_attraction_1", "Agent Attraction 1", 10], ["agent_attraction_2", "Agent Attraction 2", 10],
    ["open_houses", "Open Houses", 10], ["meet_client_show_homes", "Meet Client – Show Homes", 5], ["education_events", "Education", 5],
  ]],
  ["drop_bys", "Drop-Bys", [1, 2, 3, 4].map((n) => [`drop_by_${n}`, `Drop-By ${n}`, 5])],
];

// Home Reports (HOME-REPORT.md §5.2, 16 Oct): three running on past clients (one due now, one sent, one later this
// month); the other past clients with an address and an email wait in the bulk start.
const lastMonthOf = (ymd) => {
  const [y, m] = ymd.slice(0, 7).split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${pad2(m - 1)}`;
};
function buildHomeReports(people) {
  const reports = new Map();
  const month = lastMonthOf(denverDay());
  const before = lastMonthOf(`${month}-15`);
  const past = [...people.values()].filter((p) => p.pastClient && p.address && p.email);
  const seed = [
    { day: 5, by: "agent", sent: before },
    { day: 1, by: "bulk", sent: month },
    { day: 28, by: "site_request", sent: null },
  ];
  seed.forEach((r, i) => {
    const p = past[i];
    if (!p) return;
    const id = uuid(900 + i, "b");
    reports.set(p.id, [{
      id, address: p.address, send_day: r.day, is_on: true, started_by: r.by, note: null, last_sent_month: r.sent, stopped_at: null, stopped_by: null,
      sends: r.sent ? [{ month: r.sent, channel: r.sent === month ? "email" : "rpr", via: r.sent === month ? "auto" : "agent", sent_at: `${r.sent}-${pad2(r.day)}T15:00:00Z` }] : [],
    }]);
  });
  return reports;
}

function freshState() {
  const people = buildPeople();
  return {
    people,
    homeReports: buildHomeReports(people),
    homeReportAuto: false,
    daily: new Set(["made_bed", "affirmations", "gratitudes", "exercise", "positive_reading", "hot_contact", "call_1", "call_2", "call_3", "video_text_1", "video_text_2", "social_post_1", "note_1", "meditation_visualization"]),
    weekly: new Set(["lead_gen_crm_drip", "mixer_invite_sent", "open_houses", "meet_client_show_homes"]),
    hwcOpened: { hot: true, warm: false, cold: false },
    hwc: buildHwc(people),
    rolodex: buildRolodex(),
    profile: buildProfile(),
    notify: { dm: true, community: false },
    google: { connected: true, calendarOn: true },
    adsConsent: true,
    listed: true,
    modes: { birthdays: "ask_me", follow_up: "autopilot", listing_alerts: "autopilot", concierge: "ask_me", nurture: "off" },
    rezen: { connected: true, boxes: { profile: true, deals: true, payouts: false, cap: true, revshare: true, network: true, plans: false, share_lead: false } },
    connectorOn: true,
    sends: new Map(),
    permissions: new Map(),
    seats: { seats: 8, used: 7 },
    invite: { code: "summit-7Hk2Qa", uses: 2, made: at(-2, 9) },
    members: TEAM_AGENTS.map((m) => ({ ...m, active: true, left_at: null })),
    nextId: 1,
  };
}

let S = freshState();
/** Start over: every tick, swap and edit forgotten. installFixtures calls this. */
export function resetFixtures() {
  S = freshState();
}

// ---- readers' shapes ------------------------------------------------------------------------------------------------

function vipRow(p) {
  return {
    id: p.id,
    name: p.name,
    first_name: p.first,
    month: { ...p.month },
    month_done: monthDone(p),
    quarter: { ...p.quarter },
    last_touch_on: day(-p.lastTouchDays),
    urgency: urgencyOf(p),
    promoted_at: p.tier === "vip50" ? at(-200 - p.n) : null,
    photo: null,
  };
}
function vipsBody() {
  const all = [...S.people.values()];
  const vip50 = all.filter((p) => p.tier === "vip50");
  const vip100 = all.filter((p) => p.tier === "vip100");
  return {
    cap: 50,
    month: denverDay().slice(0, 7),
    counts: { vip50: vip50.length, vip100: vip100.length, fully_touched: vip50.filter((p) => monthDone(p) === 5).length },
    vip50: vip50.map(vipRow),
    vip100: vip100.map(vipRow),
  };
}

function groupsOf(p) {
  const g = [];
  if (p.tier === "vip50") g.push("vip50");
  if (p.tier === "vip100") g.push("vip100");
  if (p.cls) g.push("hwc");
  if (p.pastClient) g.push("past_clients");
  if (p.group === "sphere") g.push("sphere");
  if (p.group === "to_sort") g.push("to_sort");
  if (["open_house", "lofty", "website", "marquee", "showly", "imported", "other"].includes(p.source)) g.push(p.source);
  return g;
}
const GROUP_DEFS = [
  ["vip50", "VIP-50", "tier"], ["vip100", "VIP-100", "tier"], ["hwc", "Hot / Warm / Cold", "tier"], ["past_clients", "Past clients", "tier"],
  ["sphere", "Sphere", "tier"], ["to_sort", "New to sort", "tier"], ["open_house", "Open houses", "source"], ["lofty", "Lofty", "source"],
  ["website", "Website", "source"], ["marquee", "Marquee", "source"], ["showly", "Showly", "source"], ["imported", "Imported", "source"], ["other", "Other", "source"],
];
function groupsBody() {
  const all = [...S.people.values()];
  const groups = GROUP_DEFS.map(([key, label, kind]) => {
    const mine = all.filter((p) => groupsOf(p).includes(key));
    const needs = mine.filter((p) => p.pulse);
    return { key, label, kind, count: mine.length, needs_you: needs.length, needs_now: needs.filter((p) => p.pulse.urgency === "now").length };
  });
  const needs = all.filter((p) => p.pulse);
  return {
    total: all.length,
    needs_you: needs.length,
    needs_now: needs.filter((p) => p.pulse.urgency === "now").length,
    groups,
    gaps: { vip_no_birthday: all.filter((p) => p.tier === "vip50" && !p.birthday).length, to_sort: all.filter((p) => p.group === "to_sort").length, possible_duplicates: 6 },
  };
}
const itemOf = (p) => ({
  id: p.id,
  name: p.name,
  first_name: p.first,
  photo: null,
  tier: p.tier === "none" ? null : p.tier,
  class: p.cls,
  source_label: p.sourceLabel,
  last_touch_on: day(-p.lastTouchDays),
  pulse: p.pulse ? { reason: p.pulse.reason, urgency: p.pulse.urgency } : null,
});
function peopleList(url) {
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const group = url.searchParams.get("group");
  const sort = url.searchParams.get("sort") ?? "pulse";
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit")) || 40));
  const offset = Number((url.searchParams.get("cursor") ?? "o0").slice(1)) || 0;
  let list = [...S.people.values()];
  if (group) list = list.filter((p) => groupsOf(p).includes(group));
  if (q) list = list.filter((p) => `${p.name} ${p.email} ${p.phone} ${p.address}`.toLowerCase().includes(q));
  if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === "recent") list.sort((a, b) => a.lastTouchDays - b.lastTouchDays);
  else list.sort((a, b) => (b.pulse ? (b.pulse.urgency === "now" ? 2 : 1) : 0) - (a.pulse ? (a.pulse.urgency === "now" ? 2 : 1) : 0) || a.n - b.n);
  const items = list.slice(offset, offset + limit).map(itemOf);
  return { total: list.length, items, next_cursor: offset + limit < list.length ? `o${offset + limit}` : null };
}

const fv = (key, label, type, value, editable = true, choices) => ({ key, label, type, value: value ?? null, editable, ...(choices ? { choices } : {}) });
const YESNO = ["Yes", "No"];
function personBody(p) {
  const yes = (b) => (b ? "Yes" : "No");
  const filled = (fields) => fields.filter((f) => f.value != null && !(Array.isArray(f.value) && !f.value.length)).length;
  const sec = (key, label, fields, summary) => ({ key, label, summary: summary ?? (filled(fields) ? `${filled(fields)} filled` : null), fields });
  const rich = p.n <= 77;
  const home = p.address;
  const family = [
    fv("spouse_name", "Spouse", "text", p.spouse ? `${p.spouse} ${p.last}` : null),
    fv("spouse_birthday", "Spouse birthday", "date", p.spouse && rich ? `--${pad2(1 + (p.n % 12))}-${pad2(3 + (p.n % 25))}` : null),
    fv("spouse_phone", "Spouse phone", "phone", p.spouse && rich ? `(801) 555-01${pad2((p.n + 50) % 100)}` : null),
    fv("spouse_email", "Spouse email", "email", null),
    fv("spouse_occupation", "Spouse occupation", "text", null),
    fv("anniversary", "Wedding anniversary", "date", p.anniversary),
    fv("children", "Children", "list", p.kids, false),
    fv("kids_interests", "Kids' interests", "text", p.kids.length ? "Soccer, piano" : null),
    fv("pets", "Pets", "list", rich && p.n % 3 === 0 ? ["Biscuit (dog)"] : [], false),
    fv("birthday_notes", "Family notes", "text", null),
  ];
  const kids = p.kids.length;
  const familySummary = [p.spouse ? "Spouse" : null, kids ? `${kids} kid${kids === 1 ? "" : "s"}` : null, rich && p.n % 3 === 0 ? "1 pet" : null].filter(Boolean).join(", ") || null;
  return {
    id: p.id,
    name: p.name,
    first_name: p.first,
    last_name: p.last,
    photo: null,
    phone: p.phone,
    email: p.email,
    tier: p.tier === "none" ? null : p.tier,
    class: p.cls,
    stage: p.pastClient ? "Past client" : p.cls === "hot" ? "Active buyer" : "Sphere",
    tags: [p.pastClient ? "past client" : null, p.tier === "vip50" ? "VIP-50" : null, p.source === "open_house" ? "open house" : null].filter(Boolean),
    source_label: p.sourceLabel,
    pulse: p.pulse ? { line: p.pulse.reason, next_step: p.pulse.reason.startsWith("Text") ? "text" : p.pulse.reason.includes("card") || p.pulse.reason.includes("note") ? "card" : "call", urgency: p.pulse.urgency } : null,
    timeline_count: timelineOf(p).length,
    sections: [
      sec("contact", "How to reach them", [
        fv("phone", "Phone", "phone", p.phone), fv("email", "Email", "email", p.email), fv("address", "Mailing address", "text", home),
        fv("best_contact_time", "Best time to reach", "text", rich ? ["Evenings", "Mornings before 9", "Lunch hour", "Weekends"][p.n % 4] : null),
        fv("birthday", "Birthday", "date", p.birthday), fv("occupation", "Occupation", "text", p.occupation),
        fv("how_know_agent", "How we met", "text", rich ? ["Church", "Kids' soccer team", "Neighbors", "Past client", "Open house"][p.n % 5] : null),
        fv("source", "Came from", "text", p.sourceLabel, false), fv("source_detail", "Came from, in your words", "text", null, false),
      ]),
      sec("relationship", "Relationship", [
        fv("stage", "Stage", "text", p.pastClient ? "Past client" : p.cls === "hot" ? "Active buyer" : "Sphere", false),
        fv("next_followup", "Follow up on", "date", p.pulse ? day(p.pulse.urgency === "now" ? -3 : 1) : null),
        fv("last_touch_date", "Last touch", "date", day(-p.lastTouchDays), false),
        fv("vip_notes", "VIP notes", "text", p.vipNotes), fv("notes", "General notes", "text", rich ? "Prefers texts over calls during the work day." : null),
        fv("other_info", "Other notes", "text", null), fv("fav_gift_type", "Favorite kind of gift", "text", rich ? ["Treats", "Gift cards", "Something for the kids", "Plants"][p.n % 4] : null),
      ]),
      sec("about", "Tell Us About You", [
        fv("hobbies", "Hobbies / Interests", "text", rich ? ["Mountain biking", "Pickleball", "Baking", "Skiing", "Gardening"][p.n % 5] : null),
        fv("favorite_restaurant", "Favorite Restaurant", "text", p.restaurant), fv("favorite_store", "Favorite Store", "text", rich ? ["Target", "Costco", "REI", "Nordstrom"][p.n % 4] : null),
        fv("morning_drink", "Morning Drink", "text", p.drink), fv("drink_prep", "Coffee Preference", "text", null),
        fv("sports_team", "Favorite Sport", "text", p.sport), fv("adult_beverage", "Favorite Drink", "text", null),
        fv("treat", "Favorite Candy", "text", rich ? ["Peanut M&Ms", "Swedish Fish", "Dark chocolate", "Crumbl cookies"][p.n % 4] : null),
        fv("hometown", "Hometown", "text", rich ? ["Boise", "Provo", "Phoenix", "St. George", "Sacramento"][p.n % 5] : null),
        fv("favorite_color", "Favorite Color", "text", rich ? ["Navy", "Sage green", "Gold", "Coral"][p.n % 4] : null),
        fv("dream_vacation", "Dream Vacation", "text", rich ? ["Italy", "Maui", "Japan", "Iceland"][p.n % 4] : null),
        fv("book_movie", "Favorite Movie", "text", null), fv("how_can_i_serve", "How Can I Serve You", "text", null),
      ]),
      sec("family", "Family", family, familySummary),
      sec("home", "Home", [
        fv("home_address", "Home address", "text", home), fv("home_purchase_date", "Bought on", "date", p.pastClient ? day(-400 - p.n * 9) : null),
        fv("years_in_home", "Years in home", "number", p.pastClient ? 1 + (p.n % 9) : null), fv("number_of_bedrooms", "Bedrooms", "number", rich ? 3 + (p.n % 3) : null),
        fv("bathrooms", "Bathrooms", "number", rich ? 2 + (p.n % 2) : null), fv("square_feet", "Square feet", "text", rich ? String(1800 + (p.n * 97) % 2400) : null),
        fv("lot_size", "Lot size", "text", null), fv("home_notes", "Home notes", "text", null),
      ]),
      sec("searching", "Searching", [
        fv("price_min", "Price from", "money", p.cls === "hot" ? 550000 : null), fv("price_max", "Price to", "money", p.cls === "hot" ? 750000 : null),
        fv("areas_of_interest", "Areas", "list", p.cls === "hot" ? ["Draper", "South Jordan"] : null),
      ]),
      sec("work", "Work", [
        fv("business_name", "Business", "text", p.n === 3 ? "Lee Custom Cabinets" : null), fv("position_title", "Title", "text", null), fv("industry", "Industry", "text", null),
        fv("business_address", "Business address", "text", null), fv("website", "Website", "url", null), fv("how_to_refer_you", "How to refer them", "text", null),
        fv("has_secondary_income", "Side income", "choice", null, true, YESNO), fv("side_income_desc", "Side income, what", "text", null),
        fv("offers_discount", "Offers a discount", "choice", null, true, YESNO), fv("discount_details", "Discount", "text", null), fv("business_notes", "Business notes", "text", null),
      ]),
      sec("online", "Online", [
        fv("linkedin_url", "LinkedIn", "url", null), fv("facebook_url", "Facebook", "url", null), fv("instagram_url", "Instagram", "url", null),
        fv("twitter_url", "X (Twitter)", "url", null), fv("youtube_url", "YouTube", "url", null), fv("tiktok_url", "TikTok", "url", null),
      ]),
      sec("touches", "This month's touches", [
        fv("touch_call", "Call", "choice", p.month ? yes(p.month.call) : null, false, YESNO), fv("touch_text", "Video text", "choice", p.month ? yes(p.month.video_text) : null, false, YESNO),
        fv("touch_social", "Social", "choice", p.month ? yes(p.month.social) : null, false, YESNO), fv("touch_newsletter", "Newsletter", "choice", p.month ? yes(p.month.newsletter) : null, false, YESNO),
        fv("touch_mixer", "Mixer invite", "choice", p.month ? yes(p.month.mixer) : null, false, YESNO), fv("touch_market_report", "Market report", "choice", null, false, YESNO),
        fv("touch_face_to_face", "Face to face", "date", p.quarter?.face_to_face ? day(-20 - (p.n % 40)) : null, false),
        fv("touch_note", "Handwritten note", "date", p.quarter?.handwritten_note ? day(-10 - (p.n % 50)) : null, false),
        fv("touch_drop_by", "Drop-by", "date", p.quarter?.drop_by ? day(-30 - (p.n % 40)) : null, false),
      ]),
      sec("permissions", "Permissions", [
        fv("email_consent", "Email allowed", "choice", "Yes", false, YESNO), fv("sms_consent", "Texts allowed", "choice", rich ? "Yes" : null, false, YESNO),
        fv("email_unsubscribed_at", "Unsubscribed from email", "date", null, false), fv("sms_opted_out_at", "Opted out of texts", "date", null, false),
      ]),
    ],
  };
}

function timelineOf(p) {
  const ev = [];
  const add = (d, kind, product, title, detail = null, h = 10) => ev.push({ at: at(d, h), kind, product, title, detail });
  if (p.n === 6) add(-13, "note", "move", "Note", "Jane had their baby, a girl named Ivy! Mom and baby are home and doing great.");
  if (p.n === 6) add(-3, "deal", "move", "Under contract: 9 Aspen Bluff Way", "Due diligence ends today.");
  if (p.n === 1) add(-40, "note", "move", "Note", "Jen's oldest starts piano lessons. Carlos is training for the St. George marathon.");
  if (p.n === 2) add(-12, "note", "move", "Referral", "Amy referred her coworker, Kayla Brooks, who is buying in Lehi.");
  if (p.n === 4) add(-20, "deal", "move", "Closed: the Nguyens", "Referred by Dave Kim.");
  if (p.n === 3) add(-94, "touch", "move", "Lunch with Marcus", "At Lucky Bowl Ramen. He is expanding the shop next year.");
  if (p.n === 48) {
    add(-1, "showing", "showly", "Toured 4 homes with the Millers", "Said Yes to 2: 1482 Maple Ridge Dr and 77 Quail Run Dr.", 15);
    add(-8, "web", "move", "Saved a search on your website", "Draper, 4+ beds, $550k-$750k.");
  }
  if (p.n === 49) add(0, "showing", "showly", "Toured 3 homes with the Parkers", "Said Yes to 742 Willow Lane.", 9);
  if (p.n === 10) add(-4, "open_house", "open", "Visited your open house", "1482 Maple Ridge Dr. Thinking of selling in spring.", 13);
  if (p.source === "open_house" && p.n > 10) add(-4 - (p.n % 30), "open_house", "open", "Signed in at your open house", "1482 Maple Ridge Dr.", 14);
  if (p.source === "website") add(-2 - (p.n % 9), "web", "move", "Looked at 6 homes on your website", null, 21);
  if (p.month?.call) add(-(p.n % 10) - 1, "call", "move", "Call", "Caught up. All good.", 16);
  if (p.month?.video_text) add(-(p.n % 12) - 2, "text", "go", "Video text", "Sent from ONE GO.", 9);
  if (p.month?.newsletter) add(-9, "email", "move", "October newsletter", "Opened.", 7);
  if (p.month?.mixer) add(-6, "email", "move", "Fall Client Mixer invite", "Said yes.", 12);
  if (p.quarter?.handwritten_note) add(-30 - (p.n % 20), "touch", "move", "Handwritten note", null);
  add(-p.lastTouchDays - 60, "task", "move", "Added to ONE MOVE", p.sourceLabel);
  return ev.sort((a, b) => b.at.localeCompare(a.at));
}

function contactCard(p) {
  const tasks = [];
  if (p.pulse) tasks.push({ id: `task-${p.n}`, title: p.pulse.reason, due: day(p.pulse.urgency === "now" ? -3 : 0) });
  const lt = timelineOf(p).find((e) => ["call", "text", "email", "touch"].includes(e.kind));
  return {
    id: p.id,
    name: p.name,
    first_name: p.first,
    phone: p.phone,
    email: p.email,
    tier: p.tier,
    stage: p.pastClient ? "Past client" : p.cls === "hot" ? "Active buyer" : "Sphere",
    source_label: p.sourceLabel,
    last_touch: lt ? { kind: lt.kind === "text" ? "video_text" : lt.kind, on: lt.at.slice(0, 10) } : { kind: "call", on: day(-p.lastTouchDays) },
    month: p.month ? { ...p.month } : {},
    quarter: p.quarter ? { ...p.quarter } : {},
    open_tasks: tasks,
    link: `${MOVE}/contacts/${p.id}`,
    offers: [],
  };
}

function logTouch(body) {
  const p = S.people.get(body?.contact_id);
  if (!p) return { ok: false, error: "That contact isn't there any more." };
  const kind = body.kind;
  const box = kind === "text" ? "video_text" : kind;
  if (p.month && box in p.month) p.month[box] = true;
  else if (p.quarter && box in p.quarter) p.quarter[box] = true;
  p.lastTouchDays = 0;
  if (p.pulse && (box === "call" || box === "handwritten_note" || box === "face_to_face")) p.pulse = null;
  if (box === "call") for (const k of ["call_1", "call_2", "call_3", "call_4", "call_5"]) if (!S.daily.has(k)) { S.daily.add(k); break; }
  if (box === "video_text") for (const k of [1, 2, 3, 4, 5].map((n) => `video_text_${n}`)) if (!S.daily.has(k)) { S.daily.add(k); break; }
  return { ok: true, completed_task: !!body.task_id };
}

// ---- trackers -------------------------------------------------------------------------------------------------------

function dailyBody() {
  const sections = DAILY_SECTIONS.map(([key, label, boxes]) => ({ key, label, boxes: boxes.map(([k, l, pts]) => ({ key: k, label: l, points: pts, done: S.daily.has(k) })) }));
  const score = sections.flatMap((s) => s.boxes).reduce((n, b) => n + (b.done ? b.points : 0), 0);
  return { date: denverDay(), score, max: 26, week: { score: weeklyBody().score, minimum: 100 }, sections };
}
const PAST_DAYS = [22, 19, 15, 21, 18, 12];
function weeklyBody() {
  const today = denverDay();
  const start = mondayOf(today);
  const todayScore = DAILY_SECTIONS.flatMap(([, , b]) => b).reduce((n, [k, , pts]) => n + (S.daily.has(k) ? pts : 0), 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return { date, points: date < today ? PAST_DAYS[i] : date === today ? todayScore : 0 };
  });
  const sections = WEEKLY_SECTIONS.map(([key, label, boxes]) => ({ key, label, boxes: boxes.map(([k, l, pts, auto]) => ({ key: k, label: l, points: pts, done: S.weekly.has(k), auto: !!auto })) }));
  const daily_points = days.reduce((n, d) => n + d.points, 0);
  const bonus_points = sections.flatMap((s) => s.boxes).reduce((n, b) => n + (b.done ? b.points : 0), 0);
  const score = daily_points + bonus_points;
  return { week_start: start, score, minimum: 100, met: score >= 100, daily_points, bonus_points, days, sections };
}
const tick = (set, body) => {
  if (body && typeof body.key === "string" && typeof body.done === "boolean") body.done ? set.add(body.key) : set.delete(body.key);
};

// ---- Hot / Warm / Cold ----------------------------------------------------------------------------------------------

function buildHwc(people) {
  const out = [];
  const notes = {
    48: ["Said Yes to 1482 Maple Ridge Dr and 77 Quail Run Dr. Want a second look Saturday.", "Pre-approved to $750k with Dana."],
    6: ["Due diligence ends today on 9 Aspen Bluff Way. Inspection items all handled."],
    49: ["Loved 742 Willow Lane. Asking about the HOA."],
    50: ["Relocating from Phoenix in January. Wants Herriman or Riverton."],
    10: ["Thinking of selling in spring. Send a market update for her street."],
    15: ["Might list his rental next summer."],
    51: ["Just looking for now; renewing her lease in June."],
  };
  for (const p of people.values()) {
    if (!p.cls) continue;
    const nn = notes[p.n] ?? [p.cls === "cold" ? "Check in next quarter." : "Wants to talk after the holidays."];
    out.push({
      id: `hwc-${p.n}`,
      name: p.name,
      class: p.cls,
      phone: p.phone,
      contact_id: p.id,
      photo: null,
      last_note: nn[0],
      last_note_at: at(-(p.n % 6) - 1, 15),
      added_at: at(-30 - (p.n % 50)),
      notes: nn.map((note, i) => ({ id: `hn-${p.n}-${i}`, note, at: at(-(p.n % 6) - 1 - i * 6, 15) })),
      last_touch_at: at(p.cls === "hot" ? -(p.n % 3) - 1 : p.cls === "warm" ? -12 - (p.n % 15) : -50 - (p.n % 20), 16),
      class_since: day(-40 - (p.n % 30)),
      previous_class: p.n === 48 ? "warm" : null,
      due_on: null,
      follow_up_on: p.n === 10 ? day(-3) : null,
      follow_up_by: p.n === 10 ? "agent" : null,
    });
  }
  return out;
}
function hwcBody() {
  const today = denverDay();
  const d = S.daily;
  return { date: today, today: { hot: S.hwcOpened.hot || d.has("hot_contact"), warm: S.hwcOpened.warm || d.has("warm_contact"), cold: S.hwcOpened.cold || d.has("cold_contact") }, people: clone(S.hwc) };
}
function hwcPost(path, b) {
  const who = S.hwc.find((x) => x.id === b?.id);
  switch (path) {
    case "opened":
      if (b?.class in S.hwcOpened) {
        S.hwcOpened[b.class] = true;
        S.daily.add(`${b.class}_contact`);
      }
      break;
    case "credit":
      if (who) {
        S.daily.add(`${who.class}_contact`);
        who.last_touch_at = new Date().toISOString();
      }
      break;
    case "move":
      if (who && ["hot", "warm", "cold"].includes(b.class)) {
        who.previous_class = who.class;
        who.class = b.class;
        who.class_since = denverDay();
      }
      break;
    case "note":
      if (who && typeof b.note === "string" && b.note.trim()) {
        const n = { id: `hn-new-${S.nextId++}`, note: b.note.trim(), at: new Date().toISOString() };
        who.notes.unshift(n);
        who.last_note = n.note;
        who.last_note_at = n.at;
      }
      break;
    case "note/delete":
      if (who) who.notes = who.notes.filter((n) => n.id !== b.note_id);
      break;
    case "remove":
      S.hwc = S.hwc.filter((x) => x.id !== b?.id);
      break;
    case "remind":
      if (who) {
        if (b.action === "done") {
          who.last_touch_at = new Date().toISOString();
          who.follow_up_on = null;
        } else if (b.action === "snooze") who.follow_up_on = day(Number(b.days) || 3);
        else if (b.action === "set") who.follow_up_on = b.on ?? null;
        who.follow_up_by = who.follow_up_on ? "agent" : null;
      }
      break;
    case "add": {
      const cls = ["hot", "warm", "cold"].includes(b?.class) ? b.class : "warm";
      S.hwc.push({
        id: `hwc-new-${S.nextId++}`, name: String(b?.name ?? "New person").slice(0, 120), class: cls, phone: b?.phone ?? null, contact_id: b?.contact_id ?? null, photo: null,
        last_note: b?.note ?? null, last_note_at: b?.note ? new Date().toISOString() : null, added_at: new Date().toISOString(),
        notes: b?.note ? [{ id: `hn-new-${S.nextId++}`, note: b.note, at: new Date().toISOString() }] : [], last_touch_at: new Date().toISOString(),
        class_since: denverDay(), previous_class: null, due_on: null, follow_up_on: null, follow_up_by: null,
      });
      break;
    }
  }
  return hwcBody();
}
function hwcPulse(b) {
  const who = S.hwc.find((x) => x.id === b?.id);
  const first = who?.name.split(" ")[0] ?? "them";
  const hot = who?.class === "hot";
  return {
    summary: hot
      ? `${first} is close. ${who.last_note ?? ""} The next step is getting them back in front of the homes they liked.`.trim()
      : `${first} is ${who?.class ?? "warm"}: not ready yet, but worth a friendly touch so you stay their agent.`,
    actions: hot ? [`Call ${first} today and book the second showing.`, "Send the two homes' disclosures ahead of time.", "Ask Dana for an updated pre-approval letter."] : [`Text ${first} a short check-in this week.`, "Send them this month's market update for their area."],
    text_draft: hot ? `Hi ${first}! Want to see those two homes again this Saturday? I can do 10 or 2. -- Sarah` : `Hi ${first}, thinking of you! Anything I can help with this fall? -- Sarah`,
  };
}

// ---- Rolodex --------------------------------------------------------------------------------------------------------

function buildRolodex() {
  const b = (id, name, category, family, contact_name, n, extra = {}) => ({
    id, name, category, family, contact_name, phone: phoneOf(n), email: `hello@${slug(name).replace(/\./g, "")}.example.com`.replace("hello@", `${slug(contact_name.split(" ")[0])}@`),
    website: `https://www.example.com/${slug(name).replace(/\./g, "-")}`, offer: null, city: "Draper", image: null, notes: null, shared: false, group_by: "rules", ...extra,
  });
  const mine = [
    b("r1", "Wasatch Home Lending", "Mortgage lender", "financing", "Dana Ruiz", 61, { offer: "Free rate review for your clients", shared: true, notes: "Fast pre-approvals, answers on weekends." }),
    b("r2", "Northstar Insurance", "Home insurance", "financing", "Kevin Marsh", 62),
    b("r3", "Canyon Gate Title", "Title and escrow", "closing", "Laura Benson", 63, { shared: true, notes: "Ask for Laura; mobile signings." }),
    b("r4", "Clear View Home Inspections", "Home inspector", "closing", "Matt Rowe", 64, { offer: "$50 off for VIP clients", shared: true }),
    b("r5", "Blue Pine Plumbing", "Plumber", "repair", "Josh Tanner", 65),
    b("r6", "Granite Roofing Co.", "Roofer", "repair", "Ray Gill", 66),
    b("r7", "Kessler Electric", "Electrician", "repair", "Dave Ortiz", 67, { notes: "Dave is on my VIP-50." }),
    b("r8", "Alpine Yard & Landscape", "Landscaping", "repair", "Nate Ferris", 68),
    b("r9", "Bright Side Cleaning", "House cleaning", "cleaning", "Maria Lopez", 69, { offer: "Move-out clean at 15% off", shared: true }),
    b("r10", "Summit Movers Co.", "Movers", "cleaning", "Tyler Grant", 70),
    b("r11", "Hearth & Table Catering", "Caterer", "food", "Emma Sorensen", 71, { notes: "Did the Fall Client Mixer." }),
    b("r12", "Copper Kettle Bakery", "Bakery", "food", "Lily Hart", 72, { notes: "Closing-gift cookie boxes." }),
    b("r13", "Lumen Listing Photography", "Photographer", "business", "Jace Moore", 73, { shared: true }),
    b("r14", "Ridgeline Auto Detail", "Auto detailing", "auto", "Chase Ward", 74),
    b("r15", "Lee Custom Cabinets", "Cabinets", "repair", "Marcus Lee", 75, { notes: "Marcus, VIP-50." }),
    b("r16", "Stillwater Staging", "Home staging", "lifestyle", "Rina Vos", 76, { group_by: "pulse" }),
  ];
  const c = (key, name, category, family, contact_name, n, recs, extra = {}) => ({
    key, name, category, family, contact_name, phone: phoneOf(n), email: null, website: null, offer: null, city: extra.city ?? "Sandy", image: null,
    recommended_by: recs.map(([name, days, me]) => ({ name, me: !!me, since: day(-days) })), in_mine: false, group_by: "rules", ...extra,
  });
  const community = [
    c("c1", "Canyon Gate Title", "Title and escrow", "closing", "Laura Benson", 63, [["You", 120, true], ["Kyle H.", 80], ["Megan O.", 40]], { in_mine: true, city: "Draper" }),
    c("c2", "Wasatch Home Lending", "Mortgage lender", "financing", "Dana Ruiz", 61, [["You", 200, true], ["Natalie P.", 60]], { in_mine: true, city: "Draper" }),
    c("c3", "Peak Pest Control", "Pest control", "repair", "Ivan Cruz", 81, [["Brady C.", 30], ["Jordan W.", 22]]),
    c("c4", "Juniper Window Washing", "Window cleaning", "cleaning", "Hope Abel", 82, [["Chloe B.", 15]]),
    c("c5", "Sage Creek Florals", "Florist", "lifestyle", "Ava Lund", 83, [["Megan O.", 50], ["Kyle H.", 12], ["Natalie P.", 9]], { offer: "10% off closing bouquets" }),
    c("c6", "Granite State Solar", "Solar", "repair", "Ben Olds", 84, [["Jordan W.", 70]], { city: "Lehi" }),
    c("c7", "Trailhead Tax & Books", "Accountant", "business", "Mia Grover", 85, [["Kyle H.", 44], ["Brady C.", 18]], { city: "South Jordan" }),
    c("c8", "Little Sprouts Daycare", "Childcare", "lifestyle", "Ruth Gale", 86, [["Chloe B.", 27]], { city: "Riverton" }),
  ];
  return { mine, community };
}
const rolodexBody = () => ({ my_city: AGENT.city, mine: clone(S.rolodex.mine), community: clone(S.rolodex.community) });
function rolodexPost(path, b) {
  const R = S.rolodex;
  if (path === "delete") R.mine = R.mine.filter((x) => x.id !== b?.id);
  else if (path === "share") {
    const x = R.mine.find((m) => m.id === b?.id);
    if (x) x.shared = !!b.shared;
  } else if (path === "add") {
    const c = R.community.find((m) => m.key === b?.key);
    if (c && !c.in_mine) {
      c.in_mine = true;
      R.mine.push({ id: `r-new-${S.nextId++}`, name: c.name, category: c.category, family: c.family, contact_name: c.contact_name, phone: c.phone, email: c.email, website: c.website, offer: c.offer, city: c.city, image: null, notes: null, shared: false, group_by: "rules" });
    }
  } else if (path === "save") {
    const x = b?.id ? R.mine.find((m) => m.id === b.id) : null;
    const fields = ["name", "category", "contact_name", "phone", "email", "website", "offer", "city", "notes"];
    if (x) {
      for (const k of fields) if (k in b) x[k] = b[k];
      if ("group" in b) {
        x.group_by = b.group == null ? "pulse" : "agent";
        if (b.group) x.family = b.group;
      }
    } else if (b?.name) {
      R.mine.push({ id: `r-new-${S.nextId++}`, family: b.group ?? "other", image: null, shared: false, group_by: b.group ? "agent" : "pulse", ...Object.fromEntries(fields.map((k) => [k, b[k] ?? null])) });
    }
  }
  return rolodexBody();
}

// ---- My Profile -----------------------------------------------------------------------------------------------------

function buildProfile() {
  return {
    email: AGENT.email,
    full_name: AGENT.full_name,
    preferred_name: "Sarah",
    mobile: "(801) 555-0142",
    brokerage: "Summit Peak Realty, LLC",
    team_name: AGENT.team,
    brokerage_address: "2750 Canyon Gate Blvd, Suite 210, Draper, UT 84020",
    principal_broker: "Mark Ellison",
    license_no: "10482771-SA00",
    license_state: "UT",
    legal_name: "Sarah Anne Bennett",
    ure_member_id: "SB48210",
    time_zone: "America/Denver",
    title: "REALTOR, Team Lead",
    bio: "Sarah has helped more than 200 Wasatch Front families buy and sell homes. She lives in Draper with her husband and three kids, coaches youth soccer, and believes the best business comes from relationships that last.",
    photo_url: null,
    photo_version: null,
    share_contact_info: true,
    about: {
      hobbies_interests: "Trail running, baking sourdough",
      favorite_restaurant_bar: "Tsunami Sushi",
      favorite_store: "Anthropologie",
      morning_drink: "Coffee",
      morning_drink_prep: "Iced vanilla latte, oat milk",
      favorite_sports_team: "Utah Jazz",
      favorite_adult_beverage: "Lime Rickey",
      favorite_treat: "Crumbl cookies",
      hometown_city: "Boise, Idaho",
      favorite_color: "Sage green",
      dream_vacation: "Amalfi Coast",
      favorite_movie_book: "The Greatest Showman",
      how_can_i_serve_you: "Send me anyone thinking about moving. I'll take great care of them.",
    },
    brokerage_confirmed_at: at(-30, 9),
    vip_50_wins: "Closed 14 homes this year, 9 from referrals. Hit 100 points six weeks in a row. Fall Client Mixer: 38 people came.",
  };
}
function profilePost(b) {
  const p = S.profile;
  if (!b || typeof b !== "object") return p;
  for (const [k, v] of Object.entries(b)) {
    if (k === "about" && v && typeof v === "object") for (const [ak, av] of Object.entries(v)) p.about[ak] = av ?? "";
    else if (k === "brokerage_confirmed") p.brokerage_confirmed_at = new Date().toISOString();
    else if (k === "share_contact_info") p.share_contact_info = !!v;
    else if (k === "vip_50_wins") p.vip_50_wins = v ?? "";
    else if (k in p && (typeof v === "string" || v === null)) {
      p[k] = v ?? "";
      if (k === "brokerage") p.brokerage_confirmed_at = null;
    }
  }
  return p;
}

const pulseModesBody = () => {
  const Q = {
    birthdays: "Birthdays and home anniversaries: how should Pulse help?",
    follow_up: "After an open house or tour, how should Pulse follow up with visitors?",
    listing_alerts: "When a client's saved search has new homes, how should Pulse send them?",
    concierge: "When a new lead comes in, how should Pulse answer first?",
    nurture: "For leads who aren't ready yet, how should Pulse keep in touch?",
  };
  const EX = {
    birthdays: '"Happy birthday, Jen! Hope the year ahead is a great one. -- Sarah"',
    follow_up: '"Thanks for stopping by 1482 Maple Ridge Dr on Saturday. Any questions about it? -- Sarah"',
    listing_alerts: '"3 new homes match your Draper search this week: [links]"',
    concierge: "\"Hi Sam, thanks for asking about 88 Red Pine Ct. I'm Sarah's assistant. When would you like to see it?\"",
    nurture: "\"Hi Sam, rates eased a little this month. Still thinking about spring? -- Sarah's assistant\"",
  };
  return {
    asked_at: at(-40, 10),
    modes: { off: "Off", ask_me: "Ask me", autopilot: "Autopilot" },
    mode_lines: { off: "Pulse won't do this.", ask_me: "Pulse writes it; you tap Send.", autopilot: "Pulse sends emails for you within your rules. Never showings, offers, contracts or money; never your VIP-50." },
    autopilot_confirm: "Pulse will send these emails without asking you first. You'll see every one in your weekly “Pulse did this” report and can stop it any time. Texts still wait for you to tap Send on your phone.",
    handback_line: "Pulse always hands these back to you: showings, offers, contracts, money, lending, legal, complaints, fair housing.",
    workers: Object.keys(Q).map((w) => ({ worker: w, question: Q[w], example: EX[w], mode: S.modes[w], chosen: S.modes[w] !== "off" || w === "nurture", autopilot_blocked: null, ask_me_blocked: null })),
  };
};

const REZEN_BOXES = [
  ["profile", "My profile", "licence, phone, office"], ["deals", "My deals", "open and closed deals, dates, price, clients"], ["payouts", "My payouts", "what each closing paid me"],
  ["cap", "My cap", "cap progress this year"], ["revshare", "My revenue share", "paid, pending, by tier"], ["network", "My network", "sponsor tree and downline (names and status)"],
  ["plans", "My plans", "commission, revenue share and equity plans"], ["share_lead", "Share with my team lead", "the ticked boxes above, except money"],
];
function rezenBody() {
  const on = S.rezen.boxes;
  const read = {};
  if (S.rezen.connected && on.deals) read.deals = { read_at: at(0, 6), data: { open: [1, 2, 3], closed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] } };
  if (S.rezen.connected && on.revshare) read.revshare = { read_at: at(0, 6), data: { paid: 4860 } };
  if (S.rezen.connected && on.network) read.network = { read_at: at(0, 6), data: { total: 6 } };
  return {
    connected: S.rezen.connected,
    name: S.rezen.connected ? AGENT.full_name : null,
    email: S.rezen.connected ? AGENT.email : null,
    connected_at: S.rezen.connected ? at(-21, 14) : null,
    last_read_at: S.rezen.connected ? at(0, 6) : null,
    error: null,
    boxes: REZEN_BOXES.map(([key, label, brings]) => ({ key, label, brings, on: !!on[key] })),
    read,
  };
}

const membershipBody = () => ({ plan: "complete", growth: true, status: "active", access: "paid", stripe: true });
const googleBody = () => ({
  available: true,
  connected: S.google.connected,
  last_photos_at: S.google.connected ? at(-2, 8) : null,
  calendar_available: true,
  calendar_on: S.google.calendarOn,
  calendar_synced_at: S.google.calendarOn ? at(0, 7, 40) : null,
  calendar_error: null,
});
const badgesBody = () => ({
  weekly: [
    { name: "Touch Titan", target: 25, count: 21, earned: false, times: 9 },
    { name: "Call Champion", target: 15, count: 15, earned: true, times: 14 },
    { name: "Social Spark", target: 7, count: 7, earned: true, times: 11 },
    { name: "Task Crusher", target: 20, count: 13, earned: false, times: 6 },
    { name: "Relationship Builder", target: 10, count: 10, earned: true, times: 8 },
    { name: "Power Agent", target: 100, count: weeklyBody().score, earned: weeklyBody().score >= 100, times: 12 },
  ],
  milestones: [
    { name: "First 50", description: "Fill all 50 VIP-50 seats.", target: 50, progress: 47, earned: false, earned_at: null },
    { name: "Building Momentum", description: "Hit 100 points four weeks in a row.", target: 4, progress: 4, earned: true, earned_at: at(-60, 12) },
    { name: "Referral Magnet", description: "Ten referrals in a year.", target: 10, progress: 9, earned: false, earned_at: null },
    { name: "Mixer Host", description: "Host your first client mixer.", target: 1, progress: 1, earned: true, earned_at: at(-90, 20) },
    { name: "100-Day Streak", description: "Tick the Daily Tracker 100 days in a row.", target: 100, progress: 64, earned: false, earned_at: null },
  ],
});

function permissionsBody(p) {
  const saved = S.permissions.get(p.id);
  if (saved) return saved;
  const v = {
    channels: [
      { channel: "sms", label: "Texts", address: p.phone, state: p.n <= 77 ? "yes" : "unknown", needs_added_back: false, carrier_note: null, since: p.n <= 77 ? at(-300 - p.n, 12) : null },
      { channel: "email", label: "Email", address: p.email, state: "yes", needs_added_back: false, carrier_note: null, since: at(-320 - p.n, 12) },
    ],
    hows: [{ key: "in_person", label: "Told me in person" }, { key: "text_reply", label: "Replied YES to a text" }, { key: "form", label: "Signed a form" }, { key: "open_house", label: "Open house sign-in" }],
    history: [{ at: at(-320 - p.n, 12), channel: "email", granted: true, line: "Email allowed: signed a form" }, ...(p.n <= 77 ? [{ at: at(-300 - p.n, 12), channel: "sms", granted: true, line: "Texts allowed: told me in person" }] : [])],
  };
  S.permissions.set(p.id, v);
  return v;
}
function permissionsPost(p, b) {
  const v = permissionsBody(p);
  const ch = v.channels.find((c) => c.channel === b?.channel);
  if (ch && typeof b.granted === "boolean") {
    ch.state = b.granted ? "yes" : "no";
    ch.since = new Date().toISOString();
    v.history.unshift({ at: ch.since, channel: ch.channel, granted: b.granted, line: `${ch.label} ${b.granted ? "allowed" : "stopped"}: changed in ONE Brain` });
  }
  return v;
}
function sendsBody(p) {
  if (!S.sends.has(p.id)) {
    const items = [];
    if (p.month?.newsletter) items.push({ id: `s-${p.n}-1`, from: "move", what: "October newsletter", channel: "email", status: "sent", reason: null, at: at(-9, 7), can_stop: false });
    if (p.n === 1) items.push({ id: "s-1-2", from: "pulse", what: "Birthday email (Ask me: waiting for you)", channel: "email", status: "held", reason: "Ask me: you tap Send.", at: at(1, 8), can_stop: true });
    if (p.source === "open_house") items.push({ id: `s-${p.n}-3`, from: "pulse", what: "Open house thank-you", channel: "email", status: "sent", reason: null, at: at(-3, 18), can_stop: false });
    if (p.cls === "hot") items.push({ id: `s-${p.n}-4`, from: "pulse", what: "New homes in Draper, 4+ beds", channel: "email", status: "queued", reason: null, at: at(1, 7), can_stop: true });
    S.sends.set(p.id, { stopped_all: false, stopped_at: null, items });
  }
  return S.sends.get(p.id);
}
function sendsPost(p, b) {
  const s = sendsBody(p);
  if (b?.action === "stop") for (const i of s.items) if (i.id === b.id) Object.assign(i, { status: "stopped", can_stop: false });
  if (b?.action === "stop_all") Object.assign(s, { stopped_all: true, stopped_at: new Date().toISOString() });
  if (b?.action === "start_again") Object.assign(s, { stopped_all: false, stopped_at: null });
  return s;
}

// ---- the routes -----------------------------------------------------------------------------------------------------

const json = (t) => {
  try {
    return t ? JSON.parse(t) : null;
  } catch {
    return null;
  }
};
const personFrom = (url, re) => S.people.get(decodeURIComponent(re.exec(url.pathname)?.[1] ?? "")) ?? null;
const notFound = { __status: 404, error: "That contact isn't there any more." };

// Home Reports (HOME-REPORT §5.2): the same answers as ONE MOVE's /api/brain/home-report routes.
const reportsOf = (id) => S.homeReports.get(id) ?? [];
function homeReportGet(url) {
  const p = S.people.get(url.searchParams.get("contact_id"));
  if (!p) return notFound;
  return { reports: clone(reportsOf(p.id)), suggested_address: p.address || null, can_email: !!p.email, email: p.email || null, autostart: S.homeReportAuto };
}
function homeReportStart(p, b, by) {
  if (reportsOf(p.id).some((r) => r.is_on)) return { __status: 409, error: "A Home Report for this home is already running." };
  const address = String(b?.address ?? p.address ?? "").trim();
  if (address.length < 5) return { __status: 400, error: "Which home? Add the address.", field: "address" };
  const day = b?.send_day == null ? 5 : Number(b.send_day);
  if (!Number.isInteger(day) || day < 1 || day > 28) return { __status: 400, error: "Pick a day from 1 to 28.", field: "send_day" };
  const report = { id: uuid(950 + S.nextId++, "b"), address, send_day: day, is_on: true, started_by: by, note: typeof b?.note === "string" && b.note.trim() ? b.note.trim() : null, last_sent_month: null, stopped_at: null, stopped_by: null, sends: [] };
  S.homeReports.set(p.id, [report, ...reportsOf(p.id)]);
  return { ok: true, report };
}
function homeReportPost(b) {
  if (typeof b?.autostart === "boolean" && b.id === undefined && b.contact_id === undefined) {
    S.homeReportAuto = b.autostart;
    return { ok: true, autostart: b.autostart };
  }
  const all = [...S.homeReports.values()].flat();
  if (b?.id !== undefined) {
    const r = all.find((x) => x.id === b.id);
    if (!r) return { __status: 404, error: "Report not found." };
    if (b.rpr_url !== undefined) {
      if (!/^https:\/\/\S+\.\S+/.test(String(b.rpr_url).trim())) return { __status: 400, error: "Paste the https link to the RPR report.", field: "rpr_url" };
      const month = lastMonthOf(denverDay());
      if (r.last_sent_month === month) return { __status: 409, error: "This month is already recorded." };
      r.last_sent_month = month;
      r.sends.unshift({ month, channel: "rpr", via: "agent", sent_at: new Date().toISOString() });
      return { ok: true, month };
    }
    const day = Number(b.send_day ?? r.send_day);
    if (!Number.isInteger(day) || day < 1 || day > 28) return { __status: 400, error: "Pick a day from 1 to 28.", field: "send_day" };
    r.send_day = day;
    r.note = typeof b.note === "string" && b.note.trim() ? b.note.trim() : null;
    return { ok: true, report: r };
  }
  const p = S.people.get(b?.contact_id);
  return p ? homeReportStart(p, b, "agent") : { __status: 404, error: "Contact not found." };
}
function homeReportStop(url) {
  const r = [...S.homeReports.values()].flat().find((x) => x.id === url.searchParams.get("id") && x.is_on);
  if (r) Object.assign(r, { is_on: false, stopped_at: new Date().toISOString(), stopped_by: "agent" });
  return { ok: true };
}
function homeReportBulk() {
  const running = new Set([...S.homeReports].filter(([, rs]) => rs.some((r) => r.is_on)).map(([id]) => id));
  const people = [...S.people.values()].filter((p) => p.pastClient && p.address && p.email && !running.has(p.id)).slice(0, 8);
  return { people: people.map((p) => ({ id: p.id, name: p.name, address: p.address })).sort((a, b) => a.name.localeCompare(b.name)), day: 5 };
}
function homeReportBulkPost(b) {
  const ids = Array.isArray(b?.contact_ids) ? [...new Set(b.contact_ids)] : [];
  if (!ids.length) return { __status: 400, error: "Pick at least one person.", field: "contact_ids" };
  let started = 0;
  const skipped = [];
  for (const id of ids) {
    const p = S.people.get(id);
    const out = p ? homeReportStart(p, { address: p.address, send_day: 5 }, "bulk") : { error: "No address." };
    if (out.ok) started++;
    else skipped.push({ id, why: out.error });
  }
  return { ok: true, started, skipped };
}
function homeReportMonth() {
  const today = denverDay();
  const month = lastMonthOf(today);
  const reports = [...S.homeReports].flatMap(([cid, rs]) => rs.filter((r) => r.is_on).map((r) => ({
    id: r.id, contact_id: cid, name: S.people.get(cid)?.name ?? "No name", address: r.address, send_day: r.send_day, sent: r.last_sent_month === month, started_by: r.started_by,
  }))).sort((a, b) => a.send_day - b.send_day);
  return { month, today, autostart: S.homeReportAuto, reports };
}

const mv = (path) => (url) => url.origin === MOVE && (typeof path === "string" ? url.pathname === `/api/brain/${path}` : path.test(url.pathname));
const site = (path) => (url, _m, origin) => url.origin === origin && (typeof path === "string" ? url.pathname === `/api/${path}` : path.test(url.pathname));
const GET = (m) => m === "GET" || m === "HEAD";

/**
 * Every answered route: { match(url: URL, method, siteOrigin), body(url, method, postData) | object, status? }.
 * First match wins. A body may carry `__status` to set the status for that one answer.
 * (`match` also accepts a string URL, so FIXTURES can be used outside installFixtures.)
 */
const ROUTES = [
  // VIP Management, Touch Audit
  { match: (u, m) => mv("vips")(u) && GET(m), body: () => vipsBody() },
  { match: (u, m) => mv("vip/swap")(u) && m === "POST", body: (_u, _m, d) => {
      const b = json(d);
      const out = S.people.get(b?.out_id), into = S.people.get(b?.in_id);
      if (!out || !into) return { __status: 400, ok: false, error: "Pick two people to swap." };
      [out.tier, into.tier] = [into.tier, out.tier];
      return { ok: true };
    } },
  { match: (u, m) => mv("vip/tier")(u) && m === "POST", body: (_u, _m, d) => {
      const b = json(d);
      const p = S.people.get(b?.contact_id);
      if (!p || !["vip50", "vip100"].includes(b.tier)) return { __status: 400, ok: false, error: "That didn't go through." };
      if (b.tier === "vip50" && [...S.people.values()].filter((x) => x.tier === "vip50").length >= 50) return { __status: 409, ok: false, error: "Your VIP-50 is full." };
      p.tier = b.tier;
      p.month ??= { call: false, video_text: false, social: false, newsletter: false, mixer: false };
      p.quarter ??= { face_to_face: false, handwritten_note: false, drop_by: false };
      return { ok: true };
    } },
  // The contact card, logging a touch, tasks
  { match: (u, m) => mv("contact")(u) && GET(m), body: (u) => {
      const p = S.people.get(u.searchParams.get("id"));
      return p ? contactCard(p) : notFound;
    } },
  { match: (u, m) => mv("touch")(u) && m === "POST", body: (_u, _m, d) => logTouch(json(d)) },
  { match: (u) => mv("contacts")(u), body: (u) => {
      const q = (u.searchParams.get("q") ?? "").toLowerCase();
      const hits = q.length < 2 ? [] : [...S.people.values()].filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
      return { contacts: hits.map((p) => ({ id: p.id, name: p.name, tier: p.tier, phone_last4: p.phone.slice(-4) })) };
    } },
  { match: (u, m) => (mv("task/link")(u) || mv("task/done")(u)) && m === "POST", body: () => ({ ok: true }) },
  { match: (u) => mv("dial")(u), body: (u, m) => (m === "POST" ? { ok: true, id: `dial-${S.nextId++}`, expires_at: new Date(Date.now() + 60_000).toISOString() } : { sent_at: at(0, 9), opened_at: new Date().toISOString(), expired: false }) },
  { match: (u, m) => mv("talk")(u) && m === "POST", body: (_u, _m, d) => {
      const words = String(json(d)?.text ?? "");
      return { note: words.trim() || "Caught up today.", fields: [], follow_up: { title: "Check in again", in_days: 14 }, by: "Pulse" };
    } },
  { match: (u, m) => mv("talk/apply")(u) && m === "POST", body: (_u, _m, d) => {
      const b = json(d);
      return { ok: true, saved: { note: !!b?.note, fields: Array.isArray(b?.fields) ? b.fields.length : 0, task: !!b?.follow_up } };
    } },
  { match: (u, m) => mv("life-events/keep")(u) && m === "POST", body: () => ({ ok: true }) },
  { match: (u) => mv("signals")(u), body: (u) => {
      const id = u.searchParams.get("contact_id");
      const p = id ? S.people.get(id) : null;
      if (p && p.source === "website") return { signals: [{ contact_id: p.id, name: p.name, words: "Looked at 6 homes this week, 2 of them twice", came_back: true, high_interest: true, likely_seller: false, at: at(0, 7) }] };
      return { signals: [] };
    } },
  // Contacts (§3k)
  { match: (u, m) => mv("people/groups")(u) && GET(m), body: () => groupsBody() },
  { match: (u, m) => mv("people")(u) && GET(m), body: (u) => peopleList(u) },
  { match: (u, m) => mv("people")(u) && m === "POST", body: (_u, _m, d) => {
      const b = json(d) ?? {};
      const n = POOL_SIZE + S.nextId++;
      const first = String(b.first_name ?? "New").trim() || "New", last = String(b.last_name ?? "Contact").trim();
      const p = { ...S.people.get(uuid(POOL_SIZE)), n, id: uuid(n), first, last, name: `${first} ${last}`.trim(), tier: b.tier && b.tier !== "none" ? b.tier : "none", group: "to_sort", pastClient: false, source: "other", sourceLabel: "Added in ONE Brain", phone: b.phone || phoneOf(n), email: b.email || `${slug(first)}@example.com`, pulse: null, cls: null, lastTouchDays: 0, month: null, quarter: null, kids: [], spouse: null, vipNotes: null };
      S.people.set(p.id, p);
      return personBody(p);
    } },
  { match: (u) => mv(/^\/api\/brain\/people\/[^/]+\/timeline$/)(u), body: (u) => {
      const p = personFrom(u, /\/people\/([^/]+)\/timeline$/);
      return p ? { events: timelineOf(p), next_cursor: null } : notFound;
    } },
  { match: (u) => mv(/^\/api\/brain\/people\/[^/]+\/permissions$/)(u), body: (u, m, d) => {
      const p = personFrom(u, /\/people\/([^/]+)\/permissions$/);
      if (!p) return notFound;
      return m === "POST" ? { ok: true, ...permissionsPost(p, json(d)) } : permissionsBody(p);
    } },
  { match: (u) => mv(/^\/api\/brain\/people\/[^/]+\/sends$/)(u), body: (u, m, d) => {
      const p = personFrom(u, /\/people\/([^/]+)\/sends$/);
      if (!p) return notFound;
      return m === "POST" ? { ok: true, ...sendsPost(p, json(d)) } : sendsBody(p);
    } },
  { match: (u) => mv(/^\/api\/brain\/people\/[0-9a-f-]{36}$/)(u), body: (u, m, d) => {
      const p = personFrom(u, /\/people\/([^/]+)$/);
      if (!p) return notFound;
      if (m === "POST") {
        const f = json(d)?.fields ?? {};
        if ("phone" in f) p.phone = f.phone ?? "";
        if ("email" in f) p.email = f.email ?? "";
        if ("address" in f) p.address = f.address ?? "";
        if ("birthday" in f) p.birthday = f.birthday;
        if ("occupation" in f) p.occupation = f.occupation;
        if ("vip_notes" in f) p.vipNotes = f.vip_notes;
        if ("favorite_restaurant" in f) p.restaurant = f.favorite_restaurant;
        if ("morning_drink" in f) p.drink = f.morning_drink;
        if ("sports_team" in f) p.sport = f.sports_team;
        if ("spouse_name" in f) p.spouse = f.spouse_name ? String(f.spouse_name).split(" ")[0] : null;
        if ("anniversary" in f) p.anniversary = f.anniversary;
      }
      return personBody(p);
    } },
  { match: (u) => mv(/^\/api\/brain\/permissions\/ask$/)(u), body: (u, m) => {
      if (m === "POST") return { ok: true };
      const g = u.searchParams.get("group");
      if (!g) return { groups: [{ key: "vip50", label: "VIP-50", count: 9 }, { key: "past_clients", label: "Past clients", count: 41 }, { key: "open_house", label: "Open house visitors", count: 27 }] };
      const list = [...S.people.values()].filter((p) => groupsOf(p).includes(g)).slice(0, 12);
      return { people: list.map((p) => ({ contact_id: p.id, name: p.name, phone: p.phone, text: `Hi ${p.first}, it's Sarah Bennett. Is it OK if I text you now and then about homes and events? Tap to say yes or no: ${MOVE}/ok/${p.n.toString(36)}x7` })) };
    } },
  // Trackers
  { match: (u) => mv("daily")(u), body: (_u, m, d) => {
      if (m === "POST") tick(S.daily, json(d));
      return dailyBody();
    } },
  { match: (u) => mv("weekly")(u), body: (_u, m, d) => {
      if (m === "POST") tick(S.weekly, json(d));
      return weeklyBody();
    } },
  // Hot / Warm / Cold
  { match: (u, m) => mv("hwc")(u) && GET(m), body: () => hwcBody() },
  { match: (u) => mv("hwc/contacts")(u), body: (u) => {
      const q = (u.searchParams.get("q") ?? "").toLowerCase();
      return { matches: [...S.people.values()].filter((p) => q.length > 1 && p.name.toLowerCase().includes(q)).slice(0, 8).map((p) => ({ id: p.id, name: p.name, phone: p.phone })) };
    } },
  { match: (u, m) => mv("hwc/pulse")(u) && m === "POST", body: (_u, _m, d) => hwcPulse(json(d)) },
  { match: (u, m) => mv(/^\/api\/brain\/hwc\/.+/)(u) && m === "POST", body: (u, _m, d) => hwcPost(u.pathname.replace("/api/brain/hwc/", ""), json(d)) },
  // Business Rolodex
  { match: (u, m) => mv("rolodex")(u) && GET(m), body: () => rolodexBody() },
  { match: (u, m) => mv(/^\/api\/brain\/rolodex\/.+/)(u) && m === "POST", body: (u, _m, d) => rolodexPost(u.pathname.replace("/api/brain/rolodex/", ""), json(d)) },
  // My Profile
  { match: (u) => mv("profile")(u), body: (_u, m, d) => (m === "POST" ? profilePost(json(d)) : S.profile) },
  { match: (u) => mv("profile/photo")(u), body: () => S.profile },
  { match: (u) => mv("network/listed")(u), body: (_u, m, d) => {
      if (m === "POST") S.listed = json(d)?.listed === true;
      return m === "POST" ? { ok: true, listed: S.listed } : { listed: S.listed };
    } },
  { match: (u) => mv("pulse-modes")(u), body: (_u, m, d) => {
      if (m === "POST") for (const [w, mode] of Object.entries(json(d)?.modes ?? {})) if (w in S.modes && ["off", "ask_me", "autopilot"].includes(mode)) S.modes[w] = mode;
      return m === "POST" ? { ok: true, ...pulseModesBody() } : pulseModesBody();
    } },
  { match: (u) => mv("rezen")(u), body: () => rezenBody() },
  { match: (u, m) => mv("rezen/boxes")(u) && m === "POST", body: (_u, _m, d) => {
      const b = json(d);
      if (b && b.box in S.rezen.boxes) S.rezen.boxes[b.box] = !!b.on;
      return { ok: true };
    } },
  { match: (u, m) => mv("rezen/connect")(u) && m === "POST", body: () => {
      S.rezen.connected = true;
      return { ok: true, name: AGENT.full_name };
    } },
  { match: (u, m) => mv("rezen/disconnect")(u) && m === "POST", body: () => {
      S.rezen.connected = false;
      return { ok: true };
    } },
  { match: (u) => mv("connector")(u), body: (_u, m, d) => {
      if (m === "POST" && typeof json(d)?.on === "boolean") S.connectorOn = json(d).on;
      return {
        ...(m === "POST" ? { ok: true } : {}),
        allowed: true,
        on: S.connectorOn,
        server_url: `${MOVE}/mcp`,
        connected: [{ client_id: "claude-desktop-sb", client_name: "Claude", connected_at: at(-6, 20), last_used_at: at(0, 7, 12) }],
      };
    } },
  { match: (u) => mv("connector/log")(u), body: () => ({
      log: [
        { line: "Claude read your week (scores and tracker)", at: at(0, 7, 12) },
        { line: "Claude looked up Jen Alvarez", at: at(0, 7, 10) },
        { line: "Claude read today's VIP touches", at: at(-1, 18, 4) },
        { line: "Claude read your Hot/Warm/Cold list", at: at(-2, 12, 30) },
      ],
    }) },
  { match: (u, m) => mv("connector/revoke")(u) && m === "POST", body: () => ({ ok: true }) },
  // Team (TEAM-ONBOARDING): the team lead's cards
  { match: (u) => mv("team/seats")(u), body: (_u, m) => {
      if (m === "POST") S.seats.seats += 1;
      const { seats, used } = S.seats;
      return m === "POST" ? { ok: true, seats, used } : { ok: true, comped: false, seats, used, free: seats - used, price_words: "$50 a month", confirm: "Add one more seat for $50 a month, billed with your ONE Team plan? You can remove it later." };
    } },
  { match: (u) => mv("team/invite")(u), body: (_u, m) => {
      if (m === "DELETE") S.invite = null;
      else if (m === "POST") S.invite = { code: `summit-${Math.random().toString(36).slice(2, 8)}`, uses: 0, made: new Date().toISOString() };
      const l = S.invite;
      return { ok: true, link: l ? { url: `${MOVE}/join/team/${l.code}`, expires_at: new Date(Date.parse(l.made) + 7 * DAY).toISOString(), uses: l.uses, max_uses: 25, line: null } : null };
    } },
  { match: (u, m) => mv("team/members/add")(u) && m === "POST", body: (_u, _m, d) => {
      const b = json(d) ?? {};
      if (S.members.some((x) => x.name.toLowerCase() === String(b.name ?? "").toLowerCase())) return { ok: true, already: true };
      if (S.seats.used >= S.seats.seats) return { __status: 402, ok: false, error: "Every seat is in use. Add a seat first." };
      S.members.push({ id: uuid(100 + S.nextId++, "b"), name: String(b.name ?? "New agent"), role: b.role === "admin" ? "admin" : "agent", active: true, left_at: null });
      S.seats.used += 1;
      return { ok: true, emailed: true };
    } },
  { match: (u) => mv("team/members")(u), body: (_u, m, d) => {
      if (m === "PUT") {
        const b = json(d);
        const x = S.members.find((y) => y.id === b?.user_id);
        if (x && typeof b.active === "boolean") Object.assign(x, { active: b.active, left_at: b.active ? null : new Date().toISOString() });
      }
      return { ...(m === "PUT" ? { ok: true } : {}), team: { name: AGENT.team, role: "owner" }, members: S.members.map((x) => ({ user_id: x.id, name: x.name, role: x.role, active: x.active, left_at: x.left_at })) };
    } },
  { match: (u) => mv("team/ads-consent")(u), body: (_u, m, d) => {
      if (m === "POST") S.adsConsent = json(d)?.agree === true;
      return { team: AGENT.team, consented_at: S.adsConsent ? at(-30, 10) : null, role: "owner" };
    } },
  // This site's own signed-in routes
  { match: site("membership"), body: (_u, m) => (m === "POST" ? { error: "Billing opens in Stripe on the live site. This is the example." } : membershipBody()) },
  { match: site("notifications"), body: (_u, m, d) => {
      const b = json(d);
      if (m === "POST" && b && b.key in S.notify) S.notify[b.key] = !!b.on;
      return m === "POST" ? { ok: true } : S.notify;
    } },
  { match: site("badges"), body: () => badgesBody() },
  { match: site("google/status"), body: () => googleBody() },
  { match: site("google/photos"), body: () => ({ ok: true, added: 12 }) },
  { match: site("google/disconnect"), body: () => {
      S.google.connected = false;
      return { ok: true };
    } },
  { match: site("google/calendar/sync"), body: () => ({ ok: true }) },
  { match: site("google/calendar/disconnect"), body: () => {
      S.google.calendarOn = false;
      return { ok: true };
    } },
  { match: site(/^\/api\/google\//), body: () => ({ ok: true }) },
  { match: site("lead-mail"), body: () => ({
      address: "leads+sbennett7@leads.vip50one.com",
      recent: [
        { received_at: at(0, 6, 52), summary: "Zillow: Sam Reyes, 88 Red Pine Ct", status: "lead" },
        { received_at: at(-1, 19, 5), summary: "Realtor.com: Kayla Brooks, Lehi", status: "lead" },
        { received_at: at(-3, 13, 40), summary: "Homes.com: Owen Pratt", status: "lead" },
      ],
    }) },
  { match: site("site"), body: () => ({ site_host: "sarah-bennett.vip50homes.com", team_sites: [], agent_team_sites: [] }) },
  { match: site("site/posts"), body: () => ({ host: null, posts: [] }) },
  { match: site(/^\/api\/site\//), body: () => ({ ok: true }) },
  { match: site("site-alerts"), body: () => ({ alerts: [] }) },
  { match: site("timeline"), body: () => ({ dated: [] }) },
  // Home Reports (HOME-REPORT §5.2): the card on a person, the bulk start, the monthly card, the My Profile switch
  { match: (u, m) => mv("home-report/bulk")(u) && GET(m), body: () => homeReportBulk() },
  { match: (u, m) => mv("home-report/bulk")(u) && m === "POST", body: (_u, _m, d) => homeReportBulkPost(json(d)) },
  { match: (u, m) => mv("home-report/month")(u) && GET(m), body: () => homeReportMonth() },
  { match: (u, m) => mv("home-report")(u) && GET(m), body: (u) => homeReportGet(u) },
  { match: (u, m) => mv("home-report")(u) && m === "POST", body: (_u, _m, d) => homeReportPost(json(d)) },
  { match: (u, m) => mv("home-report")(u) && m === "DELETE", body: (u) => homeReportStop(u) },
  // Anything else on ONE MOVE's API: a quiet "not here" for reads (cards hide), "done" for writes. Never the real server.
  { match: (u, m) => u.origin === MOVE && u.pathname.startsWith("/api/") && GET(m), status: 404, body: { error: "Not in this example." } },
  { match: (u) => u.origin === MOVE && u.pathname.startsWith("/api/"), body: { ok: true } },
];

const toUrl = (url) => (url instanceof URL ? url : new URL(url));
export const FIXTURES = ROUTES.map((r) => ({
  match: (url, method = "GET", origin) => r.match(toUrl(url), String(method).toUpperCase(), origin ?? siteOriginOf(toUrl(url))),
  body: r.body,
  ...(r.status ? { status: r.status } : {}),
}));
// Outside installFixtures, a site route is any non-ONE MOVE origin's /api/...
const siteOriginOf = (u) => (u.origin === MOVE ? SITE_ORIGIN_FALLBACK : u.origin);

// Pulse on this site's own server, in example mode: answered by the local server with demo: true (never MASTER).
const LOCAL_DEMO = ["/api/ask", "/api/draft"];

/**
 * Answer the tour's API calls from the fixtures above. Call before page.goto. Options:
 *   log: print each answered request; reset (default true): start from fresh example data.
 */
export async function installFixtures(page, { log = false, reset = true } = {}) {
  if (reset) resetFixtures();
  await page.route("**/*", async (route) => {
    const req = route.request();
    let url;
    try {
      url = new URL(req.url());
    } catch {
      return route.continue();
    }
    const method = req.method().toUpperCase();
    const headers = req.headers();
    const origin = headers.origin || SITE_ORIGIN_FALLBACK;
    let siteOrigin;
    try {
      siteOrigin = new URL(page.url()).origin;
    } catch {
      siteOrigin = SITE_ORIGIN_FALLBACK;
    }
    if (!siteOrigin.startsWith("http")) siteOrigin = url.origin === MOVE ? SITE_ORIGIN_FALLBACK : url.origin;
    const cors = {
      "access-control-allow-origin": origin,
      "access-control-allow-credentials": "true",
      "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
      "access-control-allow-headers": "content-type",
      vary: "Origin",
    };
    const isMoveApi = url.origin === MOVE && url.pathname.startsWith("/api/");
    if (isMoveApi && method === "OPTIONS") return route.fulfill({ status: 204, headers: cors, body: "" });

    if (url.origin === siteOrigin && LOCAL_DEMO.includes(url.pathname) && method === "POST") {
      const b = json(req.postData()) ?? {};
      // "Who haven't I called in 60 days?": the VIP-50 people who need a call, as Pulse would answer it from the
      // agent's records (Parry, 15 Oct: "it is supposed to be the vip-50 orbs with the ones that need a call").
      const q = typeof b.question === "string" ? b.question : "";
      const days = /call/i.test(q) && /(\d+)\s*days?/i.exec(q);
      if (url.pathname === "/api/ask" && days) {
        const n = Number(days[1]);
        const vips = [...S.people.values()].filter((x) => x.tier === "vip50").slice(4, 12);
        const people = vips.map((x, i) => ({ contactId: x.id, name: x.name, phone: x.phone ?? null, reasons: ["VIP-50", i < 2 ? "No call logged" : `Last call ${n + 4 + i * 6} days ago`] }));
        const body = { question: q, answer: `${people.length} of your VIP-50 haven't had a call in ${n} days. Start with ${people[0].name} and ${people[1].name}: no call logged yet.`, results: [], source: "ai", people };
        if (log) console.log(`[fixtures] POST /api/ask -> ${people.length} VIP-50 people`);
        return route.fulfill({ status: 200, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      }
      try {
        const res = await route.fetch({ postData: JSON.stringify({ ...b, demo: true }), headers: { ...headers, "content-type": "application/json" } });
        if (log) console.log(`[fixtures] ${method} ${url.pathname} -> local demo ${res.status()}`);
        return route.fulfill({ response: res });
      } catch {
        return route.fulfill({ status: 503, headers: { "content-type": "application/json" }, body: JSON.stringify({ error: "Pulse is resting in this example." }) });
      }
    }

    const hit = ROUTES.find((r) => r.match(url, method, siteOrigin));
    if (!hit) return route.continue();
    let body;
    try {
      body = typeof hit.body === "function" ? hit.body(url, method, req.postData()) : hit.body;
    } catch (e) {
      console.error(`[fixtures] ${method} ${url.href} threw: ${e}`);
      return route.fulfill({ status: 500, headers: { ...cors, "content-type": "application/json" }, body: JSON.stringify({ error: "Example data error." }) });
    }
    let status = hit.status ?? 200;
    if (body && typeof body === "object" && "__status" in body) {
      status = body.__status;
      body = { ...body };
      delete body.__status;
    }
    if (log) console.log(`[fixtures] ${method} ${url.origin === MOVE ? url.href.replace(MOVE, "MOVE") : url.pathname + url.search} -> ${status}`);
    return route.fulfill({
      status,
      headers: { ...cors, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      body: JSON.stringify(body ?? {}),
    });
  });
}
