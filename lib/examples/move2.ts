import type { PieceKey, PieceState } from "../launch.ts";
import { MOVE_URL } from "../host.ts";
import { inRelationshipGroup, RELATIONSHIP_GROUPS } from "../people.ts";
import { moveGroupId, moveMenuHref, movePageId } from "../moveMenu.ts";
import type { GraphEdge, GraphNode } from "../graph/types.ts";

// ONE MOVE's remaining menu items in the example (walker 18 Oct; Parry 06:48: "the side information is blank").
//
// A. Contacts, VIP Management, Touch Audit, Hot/Warm/Cold and Business Rolodex have native Brain views that read ONE
//    MOVE's routes. The example agent has no sign-in, so those routes failed and the Classic page (a sign-in page)
//    showed. exampleMoveAnswer() answers the same routes from an invented store, in the routes' own shapes, so the
//    native views draw exactly as for a signed-in agent; their actions change the store, so a tick stays on screen.
//    Nothing leaves the browser.
// B. Drop-By Map, Referral Network, Buyer Needs, Your listings, Analytics, Video Library, VIP Docs and The Lounge had no
//    example orb: the example data for their side panels and full views (components/brain/views/MoveTools.tsx).
//
// Every name, address and number here is invented. People are drawn with initials only; listing photos are stand-ins
// drawn on property cards only.

// ---- shared ---------------------------------------------------------------------------------------------------------

export const EXAMPLE_SAVED = "(Example: nothing was saved.)";
export const EXAMPLE_SENT = "(Example: nothing was sent.)";
export const EXAMPLE_POSTED = "(Example: nothing was posted.)";

/** A well-formed, clearly invented id: 00000000-0000-4000-8000-0000000000NN. */
export const exampleId = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

// ---- A. the people store --------------------------------------------------------------------------------------------

type Tier = "vip50" | "vip100" | "sphere";
type Cls = "hot" | "warm" | "cold";
type Source = "open_house" | "website" | "referral" | null;

export interface ExPerson {
  id: string;
  first: string;
  last: string;
  tier: Tier;
  source: Source;
  cls: Cls | null;
  phone: string;
  email: string;
  city: string;
  /** days since the last touch */
  ago: number;
  pulse: { reason: string; urgency: "now" | "today" } | null;
  month: Record<string, boolean>;
  quarter: Record<string, boolean>;
  spouse: string | null;
  kids: string[];
  pets: string[];
  birthday: string; // MM-DD
  street: string;
  about: Record<string, string>;
  notes: { id: string; note: string; ago: number }[];
  /** ONE MOVE's tags and contact_type, as the Relationships board reads them (Biz VIP, Rising VIP, Mayor's Circle). */
  tags?: string[];
  contactType?: string;
  /** An open house visitor not sorted into a circle yet (ONE MOVE's house_only_at: New to sort). */
  toSort?: boolean;
  deleted?: boolean;
}

const VIP50_NAMES = [
  "Jen Alvarez", "Dave Kim", "Amy Chen", "Tom Reyes", "Kim Reyes", "Mark Miller", "Jane Parker", "Lena Brooks", "Owen Hart", "Priya Shah",
  "Marcus Bell", "Tessa Lund", "Caleb Ross", "Nina Ortiz", "Grant Fowler", "Holly Tran", "Ben Carver", "Rosa Diaz", "Luke Pratt", "Megan Cole",
  "Isaac Moon", "Ava Lindqvist", "Derek Stone", "Faith Ames", "Jared Nash", "Kara Webb", "Logan Price", "Mia Sorensen", "Noah Becker", "Olivia Hunt",
  "Peter Vance", "Quinn Harper", "Rachel Ford", "Sam Whitley", "Tara Gibbs", "Victor Lane", "Wendy Shaw", "Wyatt Cline", "Zoe Hale", "Aaron Frye",
  "Bella Knox", "Chris Dalton", "Dana Wolfe", "Eli Booth", "Fiona Marsh", "Gavin Rhodes", "Hannah Pike",
];
const VIP100_NAMES = [
  "Ian Cobb", "Julia Sloan", "Kyle Dunn", "Laura Finch", "Mason Reed", "Nora Bishop", "Oscar Vale", "Paige Holt", "Reid Monroe", "Sara Quinlan",
  "Trent Mayer", "Uma Patel", "Vince Ortega", "Willa Grant", "Xavier Lowe", "Yara Hassan", "Zach Mercer", "Abby Lowell", "Brett Haines", "Chloe Ramsey",
  "Drew Kessler", "Erin Doyle", "Felix Hardy", "Gina Lowry", "Hugo Barrett", "Ivy Mendez", "Jack Thorne", "Kelsey Byrd", "Liam Foster", "Maya Ruiz",
];
const OTHER: [string, Source][] = [
  ["Sofia Lindgren", "open_house"], ["Ethan Crowley", "open_house"], ["Grace Okafor", "open_house"], ["Henry Walsh", "open_house"], ["Lily Navarro", "open_house"],
  ["Miles Avery", "website"], ["Ruby Callahan", "website"], ["Jonah Pierce", "website"], ["Stella Moreno", "website"],
  ["Adam Kowal", "referral"], ["Leah Brennan", "referral"], ["Cole Jensby", "referral"],
  ["Nate Holloway", null], ["Elise Danner", null], ["Theo Marsh", null], ["Iris Calder", null],
];
const CITIES = ["Bountiful", "Centerville", "Farmington", "Kaysville", "Woods Cross", "North Salt Lake"];
const STREETS = ["Maple Ridge Dr", "Orchard Ln", "Canyon View Way", "Willow Bend Ct", "Aspen Hollow Rd", "Pioneer Pkwy", "Sunrise Cir", "Meadow Brook Ln"];
const RESTAURANTS = ["Sill's Cafe", "The Copper Pot", "Lucky Thai", "Bella Trattoria", "Rooftop Grill"];
const DRINKS = ["Hot chocolate", "Diet soda", "Iced latte", "Herbal tea", "Black coffee"];
const SPORTS = ["Pickleball", "Golf", "Skiing", "Utah Jazz games", "Trail running"];
const TRIPS = ["Maui", "Banff", "Italy", "Disney World", "Lake Powell"];
const KIDS = [["Ella", "Max"], ["Sophie"], [], ["Jack", "Lucy", "Ben"], ["Noah"]];
const PETS = [["Biscuit (dog)"], [], ["Luna (cat)"], ["Scout (dog)", "Pepper (cat)"], []];

const HWC: Record<string, { cls: Cls; note: string }> = {
  "Priya Shah": { cls: "hot", note: "Pre-approved to $640k. Wants a rambler in Farmington before school starts." },
  "Owen Hart": { cls: "hot", note: "Listing his Kaysville home in November. Walk-through booked." },
  "Rosa Diaz": { cls: "hot", note: "Saw the Orchard Ln open house. Wants 4 beds and a big yard." },
  "Miles Avery": { cls: "hot", note: "Website lead: asked about homes under $500k in Centerville." },
  "Caleb Ross": { cls: "warm", note: "Thinking of selling next spring once the basement is done." },
  "Laura Finch": { cls: "warm", note: "Relocating from Denver in about 6 months." },
  "Sofia Lindgren": { cls: "warm", note: "Renting now; lease ends in March." },
  "Grant Fowler": { cls: "warm", note: "Wants a rental property; waiting on a bonus." },
  "Adam Kowal": { cls: "warm", note: "Referred by Lena Brooks. First home, saving for down payment." },
  "Ruby Callahan": { cls: "warm", note: "Downsizing once the youngest moves out." },
  "Nora Bishop": { cls: "cold", note: "Might move closer to grandkids in a year or two." },
  "Henry Walsh": { cls: "cold", note: "Curious about values; no plans yet." },
  "Trent Mayer": { cls: "cold", note: "Would buy a cabin someday." },
  "Elise Danner": { cls: "cold", note: "Retiring in 2028; may move to St. George." },
  "Jonah Pierce": { cls: "cold", note: "Website lead from last spring; went quiet." },
  "Paige Holt": { cls: "cold", note: "Wants a bigger lot eventually." },
  "Theo Marsh": { cls: "cold", note: "Asked about investment duplexes." },
};

const PULSES: Record<string, { reason: string; urgency: "now" | "today" }> = {
  "Jen Alvarez": { reason: "Birthday tomorrow: call or video text", urgency: "today" },
  "Dave Kim": { reason: "No touch in 44 days", urgency: "now" },
  "Jane Parker": { reason: "New baby: send a card", urgency: "today" },
  "Priya Shah": { reason: "Hot: follow up on the Farmington homes", urgency: "now" },
  "Owen Hart": { reason: "Hot: confirm the walk-through", urgency: "today" },
  "Tessa Lund": { reason: "Home anniversary this week", urgency: "today" },
  "Marcus Bell": { reason: "Asked for a lender name", urgency: "today" },
  "Rosa Diaz": { reason: "Visited an open house Saturday", urgency: "today" },
};

const BIZ: [string, string | null, string | null, string][] = [
  ["Dana Whitfield", "biz-vip", null, "Lender"],
  ["Leo Garrison", "biz-vip", null, "Title officer"],
  ["Pete Marlow", null, "vendor", "Plumber"],
];

function mkPerson(n: number, name: string, tier: Tier, source: Source): ExPerson {
  const [first, ...rest] = name.split(" ");
  const last = rest.join(" ");
  const h = HWC[name];
  const i = n;
  const ago = name === "Dave Kim" ? 44 : (i * 7) % 39;
  const vip = tier !== "sphere";
  return {
    id: exampleId(n),
    first,
    last,
    tier,
    source,
    cls: h?.cls ?? null,
    phone: `(801) 555-${String(1000 + ((i * 137) % 9000)).slice(0, 4)}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
    city: CITIES[i % CITIES.length],
    ago,
    pulse: PULSES[name] ?? null,
    month: vip
      ? { call: i % 3 !== 0, video_text: i % 2 === 0, social: i % 4 !== 1, newsletter: i % 6 !== 5, mixer: i % 5 === 0 || i % 7 === 0 }
      : {},
    quarter: vip ? { face_to_face: i % 3 === 0, handwritten_note: i % 4 === 0, drop_by: i % 5 === 1 } : {},
    spouse: i % 3 === 2 ? null : ["Chris", "Jordan", "Taylor", "Morgan", "Alex", "Riley"][i % 6],
    kids: name === "Jane Parker" ? ["Ella", "baby Noah (new)"] : KIDS[i % KIDS.length],
    pets: PETS[i % PETS.length],
    birthday: name === "Jen Alvarez" ? "" : `${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
    street: `${100 + ((i * 53) % 900)} ${STREETS[i % STREETS.length]}`,
    about: {
      favorite_restaurant: RESTAURANTS[i % RESTAURANTS.length],
      morning_drink: DRINKS[i % DRINKS.length],
      favorite_sport: SPORTS[i % SPORTS.length],
      hometown: ["Ogden", "Boise", "Provo", "Phoenix", "Logan"][i % 5],
      dream_vacation: TRIPS[i % TRIPS.length],
    },
    notes: h ? [{ id: `n-${n}-1`, note: h.note, ago: Math.max(1, ago - 2) }] : [],
  };
}

export interface ExampleStore {
  today: string;
  people: ExPerson[];
  today_hwc: Record<Cls, boolean>;
  rolodex: { mine: RawBiz[]; community: RawCommunity[] };
  next: number;
}

export function makeExampleStore(today: string): ExampleStore {
  let n = 1;
  const people: ExPerson[] = [];
  for (const name of VIP50_NAMES) people.push(mkPerson(n++, name, "vip50", name === "Rosa Diaz" ? "open_house" : null));
  for (const name of VIP100_NAMES) people.push(mkPerson(n++, name, "vip100", null));
  for (const [name, src] of OTHER) people.push(mkPerson(n++, name, "sphere", src));
  // Biz VIPs (Julie, 21 Oct: put in as Biz VIP in ONE MOVE, then could not find them in the Brain), one Rising VIP, one Mayor's Circle
  for (const [name, tag, type, role] of BIZ) {
    const b = mkPerson(n++, name, "sphere", null);
    b.tags = [...(tag ? [tag] : []), role];
    if (type) b.contactType = type;
    people.push(b);
  }
  const rising = people.find((p) => p.tier === "sphere" && !p.tags);
  if (rising) rising.tags = ["rising-vip"];
  const mayor = people.find((p) => p.tier === "vip50");
  if (mayor) mayor.tags = ["mayors-circle"];
  // Jen's birthday is tomorrow, as the map says
  const jen = people.find((p) => p.first === "Jen")!;
  // My Contacts' rings and key (option C, 22 Oct): two past clients and three open house visitors still to sort
  for (const p of people) {
    if (p.first === "Leah" || p.first === "Cole") p.contactType = "past_client";
    if (p.first === "Ethan" || p.first === "Grace" || p.first === "Henry") p.toSort = true;
    if (fullName(p) === "Kara Webb" || fullName(p) === "Ian Cobb") p.birthday = ""; // VIPs with no birthday
  }
  jen.birthday = addDays(today, 1).slice(5);
  return { today, people, today_hwc: { hot: false, warm: false, cold: false }, rolodex: exampleRolodex(), next: 500 };
}

/**
 * The Weekly Review's example agent as an example store, so its names open a real example contact and a tick changes
 * the review (lib/review.ts demoRoster: same people, same boxes, same last touches). Nothing leaves the browser.
 */
export function makeReviewDemoStore(today: string, roster: { vip50: { id: string; name: string; month?: Record<string, boolean> | null; last_touch_on?: string | null }[] }): ExampleStore {
  const s = makeExampleStore(today);
  const base = s.people.slice(0, roster.vip50.length);
  roster.vip50.forEach((v, k) => {
    const p = base[k];
    const [first, ...rest] = v.name.split(" ");
    p.id = v.id;
    p.first = first;
    p.last = rest.join(" ");
    p.tier = "vip50";
    p.email = `${first.toLowerCase()}.${p.last.toLowerCase()}@example.com`;
    p.month = { ...(v.month ?? {}) };
    p.quarter = {};
    p.pulse = null;
    p.ago = v.last_touch_on ? Math.max(0, Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${v.last_touch_on}T12:00:00Z`)) / 86_400_000)) : 0;
  });
  s.people = base;
  return s;
}

const fullName = (p: ExPerson) => `${p.first} ${p.last}`;
const live = (s: ExampleStore) => s.people.filter((p) => !p.deleted);
const urgencyOf = (ago: number) => (ago > 30 ? "overdue" : ago > 21 ? "due_soon" : "ok");

// ---- A. the routes, in ONE MOVE's shapes -----------------------------------------------------------------------------

const TIER_GROUPS: [string, string][] = [["vip50", "VIP-50"], ["vip100", "VIP-100"], ["hwc", "Hot / Warm / Cold"], ["past_clients", "Past clients"], ["sphere", "Sphere"], ["to_sort", "New to sort"]];
// ONE MOVE also sends the sources nobody came from yet; My Contacts names them in one grey line.
const SOURCE_GROUPS: [string, string][] = [["open_house", "Open house visitors"], ["website", "Website leads"], ["referral", "Referrals"], ["lofty", "Lofty"], ["marquee", "Marquee"], ["showly", "Showly"], ["imported", "Imported"], ["other", "Other"]];
const relOf = (p: ExPerson) => ({ tags: p.tags, contactType: p.contactType, tier: p.tier === "sphere" ? null : p.tier });
const inGroup = (p: ExPerson, g: string) =>
  p.tier === g ||
  p.source === g ||
  inRelationshipGroup(g, relOf(p)) ||
  (g === "hwc" && !!p.cls) ||
  (g === "past_clients" && p.contactType === "past_client") ||
  (g === "to_sort" && !!p.toSort) ||
  (g === "vip_no_birthday" && p.tier !== "sphere" && !p.birthday) ||
  // "Other": came from nowhere ONE knows (a Sphere contact with no source and no Biz VIP role)
  (g === "other" && !p.source && p.tier === "sphere" && !p.tags && !p.contactType);

function groupsBody(s: ExampleStore) {
  const ps = live(s);
  const g = (key: string, label: string, kind: "tier" | "source") => {
    const m = ps.filter((p) => inGroup(p, key));
    return { key, label, kind, count: m.length, needs_you: m.filter((p) => p.pulse).length, needs_now: m.filter((p) => p.pulse?.urgency === "now").length };
  };
  return {
    total: ps.length,
    needs_you: ps.filter((p) => p.pulse).length,
    needs_now: ps.filter((p) => p.pulse?.urgency === "now").length,
    groups: [...TIER_GROUPS.map(([k, l]) => g(k, l, "tier")), ...RELATIONSHIP_GROUPS.map((r) => g(r.key, r.label, "tier")), ...SOURCE_GROUPS.map(([k, l]) => g(k, l, "source"))],
    gaps: { vip_no_birthday: ps.filter((p) => inGroup(p, "vip_no_birthday")).length, to_sort: ps.filter((p) => p.toSort).length, possible_duplicates: 1 },
  };
}

const SOURCE_LABEL: Record<string, string> = { open_house: "Open house", website: "Your website", referral: "Referral" };
function itemOf(s: ExampleStore, p: ExPerson) {
  return {
    id: p.id,
    name: fullName(p),
    first_name: p.first,
    photo: null,
    tier: p.tier === "sphere" ? null : p.tier,
    class: p.cls,
    source_label: p.source ? SOURCE_LABEL[p.source] : null,
    last_touch_on: addDays(s.today, -p.ago),
    pulse: p.pulse ? { reason: p.pulse.reason, urgency: p.pulse.urgency } : null,
  };
}

function listBody(s: ExampleStore, q: URLSearchParams) {
  let ps = live(s);
  const group = q.get("group");
  if (group) ps = ps.filter((p) => inGroup(p, group));
  const needle = (q.get("q") ?? "").trim().toLowerCase();
  if (needle) ps = ps.filter((p) => `${fullName(p)} ${p.email} ${p.phone} ${p.city} ${p.street}`.toLowerCase().includes(needle));
  const sort = q.get("sort") ?? "pulse";
  if (sort === "pulse") ps = ps.filter((p) => p.pulse).sort((a, b) => (a.pulse!.urgency === b.pulse!.urgency ? 0 : a.pulse!.urgency === "now" ? -1 : 1));
  else if (sort === "recent") ps = [...ps].sort((a, b) => a.ago - b.ago);
  else ps = [...ps].sort((a, b) => fullName(a).localeCompare(fullName(b)));
  const limit = Math.max(1, Math.min(100, Number(q.get("limit")) || 40));
  const start = Number(q.get("cursor")?.replace(/^c/, "")) || 0;
  const page = ps.slice(start, start + limit);
  return { total: ps.length, items: page.map((p) => itemOf(s, p)), next_cursor: start + limit < ps.length ? `c${start + limit}` : null };
}

const f = (key: string, label: string, type: string, value: unknown, extra: Record<string, unknown> = {}) => ({ key, label, type, value, editable: true, ...extra });
function personBody(s: ExampleStore, p: ExPerson) {
  const year = Number(s.today.slice(0, 4));
  return {
    id: p.id,
    name: fullName(p),
    first_name: p.first,
    last_name: p.last,
    photo: null,
    phone: p.phone,
    email: p.email,
    tier: p.tier === "sphere" ? null : p.tier,
    class: p.cls,
    stage: p.cls === "hot" ? "Active" : null,
    tags: [p.tier === "vip50" ? "VIP-50" : p.tier === "vip100" ? "VIP-100" : "Sphere", ...(p.source ? [SOURCE_LABEL[p.source]] : []), "Example", ...(p.tags ?? [])],
    source_label: p.source ? SOURCE_LABEL[p.source] : null,
    pulse: p.pulse ? { line: p.pulse.reason, next_step: p.pulse.reason.startsWith("New baby") ? "card" : "call", urgency: p.pulse.urgency } : null,
    timeline_count: 5,
    left_early: false,
    sections: [
      { key: "reach", label: "How to reach", summary: p.phone, fields: [f("phone", "Phone", "phone", p.phone), f("email", "Email", "email", p.email), f("best_time", "Best time", "choice", p.ago % 2 ? "Evenings" : "Mornings", { choices: ["Mornings", "Afternoons", "Evenings"] })] },
      {
        key: "family",
        label: "Family",
        summary: p.spouse ? `Spouse ${p.spouse}` : null,
        fields: [
          f("spouse", "Spouse or partner", "text", p.spouse),
          f("children", "Children", "list", p.kids),
          f("pets", "Pets", "list", p.pets),
          f("birthday", "Birthday", "date", p.birthday ? `${year}-${p.birthday}` : null),
        ],
      },
      { key: "home", label: "Home", summary: p.city, fields: [f("address", "Address", "text", `${p.street}, ${p.city}, UT`), f("bought_on", "Bought", "date", `${year - 3 - (Number(p.id.slice(-2)) % 6)}-06-15`)] },
      {
        key: "about",
        label: "Tell Us About You",
        summary: p.about.favorite_restaurant,
        fields: [
          f("favorite_restaurant", "Favorite Restaurant", "text", p.about.favorite_restaurant),
          f("morning_drink", "Morning Drink", "text", p.about.morning_drink),
          f("favorite_sport", "Favorite Sport", "text", p.about.favorite_sport),
          f("hometown", "Hometown", "text", p.about.hometown),
          f("dream_vacation", "Dream Vacation", "text", p.about.dream_vacation),
        ],
      },
    ],
  };
}

function timelineBody(s: ExampleStore, p: ExPerson) {
  const at = (d: number) => `${addDays(s.today, -d)}T17:00:00Z`;
  return {
    events: [
      { at: at(p.ago), kind: "call", product: "go", title: `Called ${p.first}`, detail: "Caught up about the kids' soccer season." },
      { at: at(p.ago + 6), kind: "text", product: "go", title: "Video text sent", detail: null },
      { at: at(p.ago + 15), kind: "touch", product: "move", title: "October newsletter sent", detail: null },
      { at: at(p.ago + 32), kind: "note", product: "move", title: "Note", detail: p.notes[0]?.note ?? "Loves the client mixers." },
      { at: at(p.ago + 60), kind: "open_house", product: "open", title: "Visited an open house", detail: "Orchard Ln, Centerville" },
    ],
    next_cursor: null,
  };
}

function rosterBody(s: ExampleStore) {
  const ps = live(s);
  const vp = (p: ExPerson) => ({
    id: p.id,
    name: fullName(p),
    first_name: p.first,
    month: p.month,
    month_done: Object.values(p.month).filter(Boolean).length,
    quarter: p.quarter,
    last_touch_on: addDays(s.today, -p.ago),
    urgency: urgencyOf(p.ago),
    photo: null,
  });
  const v50 = ps.filter((p) => p.tier === "vip50");
  return {
    cap: 50,
    month: s.today.slice(0, 7),
    counts: { vip50: v50.length, vip100: ps.filter((p) => p.tier === "vip100").length, fully_touched: v50.filter((p) => Object.values(p.month).every(Boolean)).length },
    vip50: v50.map(vp),
    vip100: ps.filter((p) => p.tier === "vip100").map(vp),
  };
}

/** The roster as ONE MOVE's vips route would answer it from this store (the review's example refetch). */
export const exampleRoster = (s: ExampleStore) => rosterBody(s);

function hwcBody(s: ExampleStore) {
  const ps = live(s).filter((p) => p.cls);
  return {
    date: s.today,
    today: s.today_hwc,
    people: ps.map((p) => ({
      id: p.id,
      name: fullName(p),
      class: p.cls,
      phone: p.phone,
      contact_id: p.id,
      photo: null,
      last_note: p.notes[p.notes.length - 1]?.note ?? null,
      last_note_at: p.notes.length ? `${addDays(s.today, -p.notes[p.notes.length - 1].ago)}T16:00:00Z` : null,
      added_at: `${addDays(s.today, -90)}T16:00:00Z`,
      notes: p.notes.map((x) => ({ id: x.id, note: x.note, at: `${addDays(s.today, -x.ago)}T16:00:00Z` })),
      last_touch_at: `${addDays(s.today, -p.ago)}T16:00:00Z`,
      class_since: addDays(s.today, -40),
      previous_class: null,
    })),
  };
}

// ---- A. Business Rolodex ---------------------------------------------------------------------------------------------

interface RawBiz { id: string; name: string; category: string; family: string; contact_name: string; phone: string; email: string; website: string | null; offer: string | null; city: string; notes: string | null; shared: boolean; group_by: string | null; image: null }
interface RawCommunity { key: string; name: string; category: string; family: string; contact_name: string; phone: string; email: string; website: string | null; offer: string | null; city: string; recommended_by: { name: string; me: boolean; since: string }[]; in_mine: boolean; group_by: null; image: null }

function exampleRolodex(): { mine: RawBiz[]; community: RawCommunity[] } {
  const b = (n: number, name: string, category: string, family: string, contact: string, city: string, offer: string | null, shared: boolean, notes: string | null = null): RawBiz => ({
    id: `biz-${n}`,
    name,
    category,
    family,
    contact_name: contact,
    phone: `(801) 555-${String(2100 + n * 37).slice(0, 4)}`,
    email: `hello@${name.toLowerCase().replace(/[^a-z]+/g, "")}.example`,
    website: null,
    offer,
    city,
    notes,
    shared,
    group_by: null,
    image: null,
  });
  const c = (n: number, name: string, category: string, family: string, contact: string, city: string, recs: string[]): RawCommunity => ({
    key: `com-${n}`,
    name,
    category,
    family,
    contact_name: contact,
    phone: `(801) 555-${String(3300 + n * 41).slice(0, 4)}`,
    email: `team@${name.toLowerCase().replace(/[^a-z]+/g, "")}.example`,
    website: null,
    offer: null,
    city,
    recommended_by: recs.map((r) => ({ name: r, me: false, since: "2026-08" })),
    in_mine: false,
    group_by: null,
    image: null,
  });
  return {
    mine: [
      b(1, "Summit Peak Lending", "Mortgage lender", "financing", "Erin Holt", "Bountiful", "Free rate review for your clients", true, "Fast pre-approvals, answers on weekends."),
      b(2, "Keystone Title", "Title company", "closing", "Marcy Lunt", "Farmington", null, true),
      b(3, "Rocky Ridge Plumbing", "Plumber", "repair", "Dan Ferris", "Centerville", "10% off for VIP-50 clients", false),
      b(4, "Bright Nest Cleaning", "Move-out cleaning", "cleaning", "Alma Ruiz", "Kaysville", null, false),
      b(5, "Wasatch Home Inspections", "Home inspector", "closing", "Paul Greer", "Bountiful", null, true),
      b(6, "Two Ladders Painting", "Painter", "repair", "Sean Abbott", "Woods Cross", null, false),
      b(7, "Canyon Movers", "Movers", "cleaning", "Rick Daines", "North Salt Lake", "Free boxes with every move", false),
      b(8, "The Copper Pot", "Restaurant", "food", "Lisa Grange", "Bountiful", "Private room for client mixers", false),
      b(9, "Green Acre Landscaping", "Landscaper", "repair", "Hector Salas", "Farmington", null, false),
    ],
    community: [
      c(1, "Alpine Roof Co.", "Roofer", "repair", "Josh Keller", "Layton", ["Kendra M.", "Ty R.", "Alicia P."]),
      c(2, "Bluebird Staging", "Home stager", "business", "Nicole Fry", "Salt Lake City", ["Brooke S.", "Dan W."]),
      c(3, "Pine Valley Insurance", "Home insurance", "financing", "Greg Olsen", "Bountiful", ["Ty R."]),
      c(4, "Sparkle Window Washing", "Window cleaning", "cleaning", "Amber Lowe", "Kaysville", ["Kendra M.", "Rachel V."]),
      c(5, "Main Street Florist", "Florist", "lifestyle", "June Park", "Centerville", ["Alicia P."]),
    ],
  };
}

const rolodexBody = (s: ExampleStore) => ({ my_city: "Bountiful", mine: s.rolodex.mine, community: s.rolodex.community });

// ---- A. the router ---------------------------------------------------------------------------------------------------

const API = `${MOVE_URL}/api/brain/`;
const ok = (body: unknown) => ({ status: 200, body });

/**
 * ONE MOVE's answer to one call, from the example store, or null for a route this does not cover (the caller then lets
 * the call go out as usual). POSTs change the store and answer the routes' own shapes. Pure apart from the store.
 */
export function exampleMoveAnswer(s: ExampleStore, method: string, url: string, body: unknown): { status: number; body: unknown } | null {
  if (!url.startsWith(API)) return null;
  const u = new URL(url);
  const path = u.pathname.replace(/^\/api\/brain\//, "");
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const byId = (id: unknown) => live(s).find((p) => p.id === id);
  const get = method === "GET";

  // People (VIP-SUMMARY §3k)
  if (path === "people/groups" && get) return ok(groupsBody(s));
  if (path === "people" && get) return ok(listBody(s, u.searchParams));
  if (path === "people" && method === "POST") {
    const first = String(b.first_name ?? "").trim();
    if (!first) return { status: 400, body: { error: "The first name is required." } };
    const p = mkPerson(s.next++, `${first} ${String(b.last_name ?? "").trim() || "(new)"}`, b.tier === "vip50" || b.tier === "vip100" ? b.tier : "sphere", null);
    if (typeof b.phone === "string") p.phone = b.phone;
    if (typeof b.email === "string") p.email = b.email;
    p.ago = 0;
    s.people.push(p);
    return ok({ id: p.id });
  }
  const pm = /^people\/([0-9a-f-]{36})(\/timeline)?$/.exec(path);
  if (pm) {
    const p = byId(pm[1]);
    if (!p) return { status: 404, body: { error: "That contact isn't there any more." } };
    if (pm[2]) return ok(timelineBody(s, p));
    if (method === "DELETE") {
      p.deleted = true;
      return ok({ ok: true });
    }
    if (method === "POST") {
      const fields = (b.fields && typeof b.fields === "object" ? b.fields : {}) as Record<string, unknown>;
      for (const [k, v] of Object.entries(fields)) {
        const t = typeof v === "string" ? v : Array.isArray(v) ? v : v == null ? "" : String(v);
        if (k === "phone" && typeof t === "string") p.phone = t;
        else if (k === "email" && typeof t === "string") p.email = t;
        else if (k === "spouse" && typeof t === "string") p.spouse = t || null;
        else if (k === "children" && Array.isArray(t)) p.kids = t.map(String);
        else if (k === "pets" && Array.isArray(t)) p.pets = t.map(String);
        else if (k === "birthday" && typeof t === "string") p.birthday = t.slice(5, 10);
        else if (k in p.about && typeof t === "string") p.about[k] = t;
      }
    }
    return ok(personBody(s, p));
  }

  // Ask a group for permission (LEADS §2.3a): the groups, then each person's own yes/no link. Nothing is sent.
  if (path === "permissions/ask" && get) {
    const tiers: [string, string][] = [["vip50", "VIP-50"], ["vip100", "VIP-100"], ["sphere", "Sphere"]];
    const g = u.searchParams.get("group");
    if (!g) return ok({ groups: tiers.map(([key, label]) => ({ key, label, count: Math.min(6, live(s).filter((p) => p.tier === key).length) })) });
    const ps = live(s).filter((p) => p.tier === g).slice(0, 6);
    return ok({
      people: ps.map((p, i) => ({
        contact_id: p.id,
        name: fullName(p),
        phone: p.phone,
        text: `Hi ${p.first}, it's me. Is it OK if I keep you posted on homes and the market now and then? Tap yes or no: https://move.vip50one.com/ok/example${i + 1}`,
      })),
    });
  }
  if (path === "permissions/ask" && method === "POST") return ok({ ok: true });

  // One contact's card (the Brain's contact panel: boxes, last touch, phone) and the touches it logs
  if (path === "contact" && get) {
    const p = byId(u.searchParams.get("id"));
    if (!p) return { status: 404, body: { error: "That contact isn't there any more." } };
    return ok({
      id: p.id,
      name: fullName(p),
      first_name: p.first,
      phone: p.phone,
      email: p.email,
      tier: p.tier === "sphere" ? "none" : p.tier,
      source_label: p.source ? SOURCE_LABEL[p.source] : null,
      last_touch: p.ago < 3650 ? { kind: p.ago === 0 ? "touch" : "call", on: addDays(s.today, -p.ago) } : null,
      month: p.month,
      quarter: p.quarter,
      open_tasks: [],
      offers: [],
    });
  }

  // VIP Management and Touch Audit (§3d, §3f)
  if (path === "vips" && get) return ok(rosterBody(s));
  if (path === "vip/tier" && method === "POST") {
    const p = byId(b.contact_id);
    if (!p || (b.tier !== "vip50" && b.tier !== "vip100")) return { status: 400, body: { error: "That didn't save. Nothing was changed." } };
    if (b.tier === "vip50" && live(s).filter((x) => x.tier === "vip50").length >= 50) return { status: 409, body: { error: "The VIP-50 is full. Swap someone out first." } };
    p.tier = b.tier;
    return ok({ ok: true, ...rosterBody(s) });
  }
  if (path === "vip/swap" && method === "POST") {
    const out = byId(b.out_id);
    const into = byId(b.in_id);
    if (!out || !into) return { status: 400, body: { error: "That didn't save. Nothing was changed." } };
    [out.tier, into.tier] = [into.tier, out.tier];
    return ok({ ok: true, ...rosterBody(s) });
  }
  if (path === "touch" && method === "POST") {
    const p = byId(b.contact_id);
    const kind = String(b.kind ?? "");
    if (!p) return { status: 400, body: { ok: false, error: "That didn't save. Nothing was changed." } };
    if (kind === "text") p.month.call = true; // a logged text ticks the call box, as ONE MOVE does
    else if (kind === "email") p.ago = 0;
    else if (kind in p.month || ["call", "video_text", "social"].includes(kind)) p.month[kind] = true;
    else p.quarter[kind] = true;
    p.ago = 0;
    if (p.pulse && /touch|call|video/i.test(p.pulse.reason)) p.pulse = null;
    return ok({ ok: true });
  }

  // Hot/Warm/Cold (§3h)
  if (path === "hwc" && get) return ok(hwcBody(s));
  if (path === "hwc/contacts" && get) {
    const q = (u.searchParams.get("q") ?? "").toLowerCase();
    return ok({ matches: live(s).filter((p) => !p.cls && fullName(p).toLowerCase().includes(q)).slice(0, 8).map((p) => ({ id: p.id, name: fullName(p), phone: p.phone })) });
  }
  if (path.startsWith("hwc/") && method === "POST") {
    const what = path.slice(4);
    const p = byId(b.id);
    if (what === "opened" && (b.class === "hot" || b.class === "warm" || b.class === "cold")) s.today_hwc[b.class] = true;
    else if (what === "credit" && p?.cls) {
      s.today_hwc[p.cls] = true;
      p.ago = 0;
    } else if (what === "move" && p && (b.class === "hot" || b.class === "warm" || b.class === "cold")) p.cls = b.class;
    else if (what === "note" && p && typeof b.note === "string") p.notes.push({ id: `n-${s.next++}`, note: b.note.slice(0, 2000), ago: 0 });
    else if (what === "remove" && p) p.cls = null;
    else if (what === "pulse" && p) {
      return ok({
        summary: `${p.first} is ${p.cls ?? "on your list"}: ${p.notes[p.notes.length - 1]?.note ?? "no notes yet"} Last touch ${p.ago} days ago. (Example answer.)`,
        actions: [`Call ${p.first} today`, "Send two homes that fit", "Set a follow-up for Friday"],
        text_draft: `Hi ${p.first}, it's Sarah. I found two homes I think you'll like. Want me to send them over?`,
      });
    } else if (what === "add") {
      const cls = b.class === "hot" || b.class === "warm" || b.class === "cold" ? b.class : "warm";
      const existing = byId(b.contact_id);
      const p2 = existing ?? mkPerson(s.next++, String(b.name ?? "New person").trim() || "New person", "sphere", null);
      if (!existing) s.people.push(p2);
      p2.cls = cls;
      p2.ago = 0;
      if (typeof b.note === "string" && b.note.trim()) p2.notes.push({ id: `n-${s.next++}`, note: b.note.trim(), ago: 0 });
      return ok({ ...hwcBody(s), added_id: p2.id });
    } else if (p && typeof b.follow_up_on === "string") {
      // a reminder date: kept on the note list
      p.notes.push({ id: `n-${s.next++}`, note: `Follow up on ${b.follow_up_on}`, ago: 0 });
    }
    return ok(hwcBody(s));
  }

  // Business Rolodex (§3i)
  if (path === "rolodex" && get) return ok(rolodexBody(s));
  if (path === "rolodex" && method === "POST" && b.action === "biz_vip") {
    const biz = s.rolodex.mine.find((x) => x.id === b.id);
    if (!biz) return { status: 404, body: { ok: false, error: "That business is no longer in your Rolodex." } };
    const name = biz.contact_name || biz.name;
    const have = s.people.find((p) => fullName(p) === name);
    const p2 = have ?? mkPerson(s.next++, name, "sphere", null);
    if (!have) s.people.push(p2);
    return ok({ ok: true, contact_id: p2.id, name, created: !have, href: `/contacts/${p2.id}` });
  }
  if (path.startsWith("rolodex/") && method === "POST") {
    const what = path.slice(8);
    const r = s.rolodex;
    if (what === "share") r.mine = r.mine.map((x) => (x.id === b.id ? { ...x, shared: b.shared === true } : x));
    else if (what === "delete") r.mine = r.mine.filter((x) => x.id !== b.id);
    else if (what === "add") {
      const c = r.community.find((x) => x.key === b.key);
      if (c && !c.in_mine) {
        c.in_mine = true;
        r.mine.push({ id: `biz-${s.next++}`, name: c.name, category: c.category, family: c.family, contact_name: c.contact_name, phone: c.phone, email: c.email, website: null, offer: null, city: c.city, notes: null, shared: false, group_by: null, image: null });
      }
    } else if (what === "save") {
      const was = r.mine.find((x) => x.id === b.id);
      const fam = typeof b.group === "string" ? b.group : undefined;
      const text = (k: string) => (typeof b[k] === "string" ? (b[k] as string) : undefined);
      if (was) {
        Object.assign(was, {
          ...(text("name") ? { name: text("name") } : {}),
          ...(text("category") !== undefined ? { category: text("category") } : {}),
          ...(text("contact_name") !== undefined ? { contact_name: text("contact_name") } : {}),
          ...(text("phone") !== undefined ? { phone: text("phone") } : {}),
          ...(text("notes") !== undefined ? { notes: text("notes") } : {}),
          ...("group" in b ? { family: fam ?? was.family, group_by: fam ? "agent" : "pulse" } : {}),
        });
      } else if (text("name")) {
        r.mine.push({ id: `biz-${s.next++}`, name: text("name")!, category: text("category") ?? "", family: fam ?? "other", contact_name: text("contact_name") ?? "", phone: text("phone") ?? "", email: text("email") ?? "", website: null, offer: text("offer") ?? null, city: text("city") ?? "Bountiful", notes: text("notes") ?? null, shared: false, group_by: fam ? "agent" : null, image: null });
      }
    }
    return ok(rolodexBody(s));
  }
  return null;
}

/** The ONE MOVE pages whose native Brain view this store answers. */
export const EXAMPLE_NATIVE = new Set(["contacts", "vip", "audit", "hwc", "rolodex"]);

// ---- B. the example orbs ---------------------------------------------------------------------------------------------

export type M2Key = "dropby" | "referrals" | "needs" | "listings" | "analytics" | "videos" | "docs" | "lounge";
/** Each tool's orb: its ONE MOVE page, the line under it, and where it hangs (the first parent found). */
export const M2_TOOLS: { key: M2Key; path: string; label: string; parents: string[]; line: string }[] = [
  { key: "dropby", path: "/drop-by", label: "Drop-By Map", parents: [moveGroupId("people"), "move-1"], line: "Example: 5 drop-bys left this quarter" },
  { key: "referrals", path: "/referral-network", label: "Referral Network", parents: [moveGroupId("people"), "move-0"], line: "Example: 6 agents · 2 referrals out" },
  { key: "needs", path: "/buyer-needs", label: "Buyer Needs", parents: [moveGroupId("people"), "move-0"], line: "Example: 3 needs · 4 homes fit" },
  { key: "listings", path: "/listings", label: "Your listings", parents: [moveGroupId("people")], line: "Example: 3 listings · 1 launching" },
  { key: "analytics", path: "/analytics", label: "Analytics", parents: [moveGroupId("trackers")], line: "Example: 212 touches this month" },
  { key: "videos", path: "/content", label: "Video Library", parents: [moveGroupId("learn")], line: "Example: 8 videos · 3 watched" },
  { key: "docs", path: "/vip-docs", label: "VIP Docs", parents: [moveGroupId("learn")], line: "Example: 6 documents" },
  { key: "lounge", path: "/lounge", label: "The Lounge", parents: [], line: "Example: 4 team posts" },
];
export const M2_PATHS: ReadonlySet<string> = new Set(M2_TOOLS.map((t) => t.path));
const M2_BY_ID = new Map(M2_TOOLS.map((t) => [movePageId(t.path), t.key] as const));
/** The example tool an orb id stands for, or null. */
export const m2KeyOf = (id: string | null | undefined): M2Key | null => (id ? M2_BY_ID.get(id) ?? null : null);

/**
 * The walk-through's orbs for these tools, each under the first of its parents found (else ONE MOVE). Run again once
 * Learn's group is there, it moves Video Library and VIP Docs under it. Nothing when ONE MOVE is locked or missing.
 */
export function withExampleMoveTools<g extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: g): g {
  const move = g.nodes.find((n) => n.id === "move");
  if (!move || move.locked) return g;
  const have = new Set(g.nodes.map((n) => n.id));
  const ids = new Set(M2_TOOLS.map((t) => movePageId(t.path)));
  const nodes = g.nodes.filter((n) => !ids.has(n.id));
  const edges = g.edges.filter((e) => !ids.has(e.target));
  M2_TOOLS.forEach((t, i) => {
    const id = movePageId(t.path);
    const parentId = t.parents.find((p) => have.has(p)) ?? "move";
    nodes.push({ id, type: "feature", label: t.label, secondaryLabel: t.line, parentId, product: "move", importance: 0.3 - i * 0.005, href: moveMenuHref(t.path) });
    edges.push({ id: `${parentId}>${id}`, source: parentId, target: id, relationshipType: "belongs_to", strength: 1 });
  });
  return { ...g, nodes, edges };
}

// Drop-By Map (quarterly touch: drop-by)
export interface DropBy { id: string; name: string; area: string; street: string; idea: string; last: string; done: boolean }
export const DROP_BYS: DropBy[] = [
  { id: "db1", name: "Jen Alvarez", area: "Bountiful", street: "412 Maple Ridge Dr", idea: "Birthday cupcakes", last: "July 9", done: false },
  { id: "db2", name: "Mark Miller", area: "Bountiful", street: "88 Orchard Ln", idea: "Pumpkin and a note", last: "June 30", done: false },
  { id: "db3", name: "Tessa Lund", area: "Bountiful", street: "1290 Sunrise Cir", idea: "Home anniversary card", last: "May 2", done: true },
  { id: "db4", name: "Jane Parker", area: "Centerville", street: "57 Willow Bend Ct", idea: "Baby gift: board books", last: "June 12", done: false },
  { id: "db5", name: "Owen Hart", area: "Centerville", street: "730 Canyon View Way", idea: "Market report in person", last: "August 3", done: true },
  { id: "db6", name: "Amy Chen", area: "Farmington", street: "215 Aspen Hollow Rd", idea: "Fall treats", last: "July 21", done: false },
  { id: "db7", name: "Dave Kim", area: "Farmington", street: "64 Pioneer Pkwy", idea: "Jazz schedule magnet", last: "April 28", done: false },
  { id: "db8", name: "Lena Brooks", area: "Kaysville", street: "903 Meadow Brook Ln", idea: "Thank-you for the referral", last: "August 19", done: true },
];
export function dropByAreas(list: readonly DropBy[]): { area: string; items: DropBy[]; left: number }[] {
  const areas = [...new Set(list.map((d) => d.area))];
  return areas.map((area) => {
    const items = list.filter((d) => d.area === area);
    return { area, items, left: items.filter((d) => !d.done).length };
  });
}

// Referral Network (§3af)
export interface RefAgent { id: string; name: string; brokerage: string; market: string; focus: string; sent: number; got: number }
export const REF_AGENTS: RefAgent[] = [
  { id: "ra1", name: "Kendra Mills", brokerage: "Example Realty Group", market: "Phoenix, AZ", focus: "First-time buyers", sent: 2, got: 1 },
  { id: "ra2", name: "Ty Robbins", brokerage: "Sample Homes Co.", market: "Boise, ID", focus: "Relocation", sent: 1, got: 2 },
  { id: "ra3", name: "Alicia Price", brokerage: "Demo Properties", market: "Las Vegas, NV", focus: "Luxury", sent: 0, got: 1 },
  { id: "ra4", name: "Brooke Sand", brokerage: "Placeholder Realty", market: "Denver, CO", focus: "Families", sent: 1, got: 0 },
  { id: "ra5", name: "Dan Weller", brokerage: "Example Realty Group", market: "St. George, UT", focus: "Retirees", sent: 3, got: 1 },
  { id: "ra6", name: "Rachel Voss", brokerage: "Sample Homes Co.", market: "Austin, TX", focus: "Investors", sent: 0, got: 0 },
];
export interface Referral { id: string; client: string; agentId: string; status: "Sent" | "Talking" | "Under contract" | "Closed"; when: string; note?: string }
export const REFERRALS: Referral[] = [
  { id: "rf1", client: "Elise Danner", agentId: "ra5", status: "Talking", when: "Oct 9" },
  { id: "rf2", client: "Laura Finch", agentId: "ra4", status: "Under contract", when: "Sep 22" },
  { id: "rf3", client: "Nora Bishop", agentId: "ra2", status: "Closed", when: "Aug 14" },
];

// Buyer Needs (§3ah)
export interface Need { id: string; buyer: string; beds: number; maxPrice: number; areas: string[]; must: string[]; posted: string }
export interface ExListing { id: string; street: string; city: string; price: number; beds: number; baths: number; sqft: number; features: string[]; hue: number; agent: string }
export const NEEDS: Need[] = [
  { id: "nd1", buyer: "Priya Shah", beds: 4, maxPrice: 640_000, areas: ["Farmington", "Kaysville"], must: ["Rambler"], posted: "Oct 12" },
  { id: "nd2", buyer: "Rosa Diaz", beds: 4, maxPrice: 575_000, areas: ["Centerville", "Bountiful"], must: ["Big yard"], posted: "Oct 14" },
  { id: "nd3", buyer: "Miles Avery", beds: 3, maxPrice: 500_000, areas: ["Centerville"], must: [], posted: "Oct 16" },
];
export const NEED_LISTINGS: ExListing[] = [
  { id: "nl1", street: "1840 Aspen Hollow Rd", city: "Farmington", price: 625_000, beds: 4, baths: 3, sqft: 2860, features: ["Rambler", "Big yard"], hue: 28, agent: "Example agent Ty R." },
  { id: "nl2", street: "322 Orchard Ln", city: "Centerville", price: 489_000, beds: 3, baths: 2, sqft: 1940, features: ["Big yard"], hue: 200, agent: "You" },
  { id: "nl3", street: "77 Canyon View Way", city: "Bountiful", price: 559_000, beds: 4, baths: 3, sqft: 2410, features: ["Big yard", "Mountain view"], hue: 150, agent: "Example agent Kendra M." },
  { id: "nl4", street: "905 Pioneer Pkwy", city: "Kaysville", price: 612_000, beds: 5, baths: 3, sqft: 3120, features: ["Rambler"], hue: 320, agent: "Example agent Dan W." },
  { id: "nl5", street: "48 Willow Bend Ct", city: "Centerville", price: 699_000, beds: 5, baths: 4, sqft: 3600, features: ["Pool"], hue: 260, agent: "Example agent Brooke S." },
  { id: "nl6", street: "16 Sunrise Cir", city: "Woods Cross", price: 430_000, beds: 3, baths: 2, sqft: 1700, features: [], hue: 90, agent: "Example agent Alicia P." },
];
/** The listings that fit a need: enough beds, at or under the price, in one of its areas, with everything it must have. */
export function fitsFor(n: Need, list: readonly ExListing[] = NEED_LISTINGS): ExListing[] {
  return list.filter((l) => l.beds >= n.beds && l.price <= n.maxPrice && (!n.areas.length || n.areas.includes(l.city)) && n.must.every((m) => l.features.includes(m)));
}
export const money = (n: number) => `$${n.toLocaleString("en-US")}`;
export const NEED_AREAS = ["Bountiful", "Centerville", "Farmington", "Kaysville", "Woods Cross"];

// Your listings (LAUNCH.md §5), drawn as the same photo cards a live agent sees (components/brain/ListingCards.tsx)
export type ExLaunch = Partial<Record<PieceKey, PieceState>>;
export interface MyListing {
  id: string; street: string; city: string; price: number; status: "Launching" | "Active" | "Under contract"; days: number;
  beds: number; baths: number; sqft: number; views: number; showings: number; tone: "dusk" | "sage" | "sand" | "slate" | "ember" | "sky";
  fits: number; openHouse: string | null; marquee: string | null; launch: ExLaunch | null;
  tours?: { count: number; next: string }; // Showly tours booked (example)
}
export const MY_LISTINGS: MyListing[] = [
  { id: "ml1", street: "1212 Maple Ridge Dr", city: "Bountiful, UT 84010", price: 549_000, status: "Launching", days: 0, beds: 4, baths: 3, sqft: 2860, views: 0, showings: 0, tone: "dusk", fits: 3, openHouse: null, marquee: "Photos in; Marquee is building the campaign", launch: null },
  { id: "ml2", street: "322 Orchard Ln", city: "Centerville, UT 84014", price: 489_000, status: "Active", days: 12, beds: 3, baths: 2, sqft: 1980, views: 1420, showings: 9, tone: "sage", fits: 2, openHouse: "Sat 24 Oct, 11:00 AM · 6 signed up ahead", marquee: "2 pieces to approve · 3 scheduled · 5 posted this month", launch: { marquee_page: "done", site_page: "done", open_house: "ready", ad_draft: "ready", buyer_notes: "done" }, tours: { count: 3, next: "2026-10-22" } },
  { id: "ml3", street: "640 Meadow Brook Ln", city: "Kaysville, UT 84037", price: 715_000, status: "Under contract", days: 21, beds: 5, baths: 4, sqft: 4010, views: 2210, showings: 14, tone: "sand", fits: 0, openHouse: null, marquee: "Closing post waits until it records", launch: { marquee_page: "done", site_page: "done", open_house: "done", ad_draft: "done", buyer_notes: "done" } },
];
export const EXAMPLE_LAUNCHED: ExLaunch = { marquee_page: "ready", site_page: "drafting", open_house: "drafting", ad_draft: "drafting", buyer_notes: "ready" };

// Analytics (Trackers)
export const ANALYTICS = {
  month: "October",
  touches: [
    { label: "Calls", value: 86, color: "#f5c542" },
    { label: "Video texts", value: 41, color: "#ff8fc7" },
    { label: "Social", value: 52, color: "#9b8cff" },
    { label: "Handwritten notes", value: 14, color: "#c3a6ff" },
    { label: "Face to face", value: 11, color: "#5fd69b" },
    { label: "Drop-bys", value: 8, color: "#5aa9ff" },
  ],
  weeks: [
    { label: "Sep 22", score: 104 },
    { label: "Sep 29", score: 92 },
    { label: "Oct 6", score: 118 },
    { label: "Oct 13", score: 64 },
  ],
  numbers: [
    { label: "VIP-50 fully touched", value: "68%" },
    { label: "New contacts", value: "23" },
    { label: "Referrals in", value: "3" },
    { label: "Closings this year", value: "11 of 18" },
  ],
};

// Video Library and VIP Docs (Learn)
export interface Video { id: string; title: string; mins: number; topic: string; watched: boolean; about: string }
export const VIDEOS: Video[] = [
  { id: "v1", title: "Your first week with the VIP-50", mins: 12, topic: "Start", watched: true, about: "Pick your 50, set your touches and run your first Power Hour." },
  { id: "v2", title: "Running a VIP mixer", mins: 18, topic: "Events", watched: true, about: "Pick a place, invite with a video text, and follow up the next day." },
  { id: "v3", title: "The five monthly touches", mins: 9, topic: "Touches", watched: true, about: "Call, video text, social, newsletter and mixer invite: what counts and why." },
  { id: "v4", title: "Hot, Warm and Cold in ten minutes a day", mins: 10, topic: "Pipeline", watched: false, about: "Work each class every day so nothing goes cold by accident." },
  { id: "v5", title: "Drop-bys that people remember", mins: 7, topic: "Touches", watched: false, about: "Small, personal, on the doorstep in under two minutes." },
  { id: "v6", title: "Asking for referrals without asking", mins: 14, topic: "Referrals", watched: false, about: "The words that make it easy for your VIPs to send people to you." },
  { id: "v7", title: "Open house follow-up", mins: 11, topic: "Open houses", watched: false, about: "The four phases, and the call you make the same evening." },
  { id: "v8", title: "Weekly Review: 20 minutes on Friday", mins: 8, topic: "Planning", watched: false, about: "Score the week, keep your commitments honest, plan Monday." },
];
export interface Doc { id: string; title: string; kind: string; pages: number; updated: string; lines: string[] }
export const DOCS: Doc[] = [
  { id: "d1", title: "VIP-50 playbook", kind: "Guide", pages: 24, updated: "Sep 2026", lines: ["1. Choose your 50: people who already like and trust you.", "2. Touch every VIP five ways every month.", "3. See every VIP face to face once a quarter.", "4. Ask, thank and give back: referrals follow."] },
  { id: "d2", title: "Touch scripts", kind: "Scripts", pages: 6, updated: "Oct 2026", lines: ["Call: \"Hi Jen, it's Sarah. You came to mind today...\"", "Video text: 20 seconds, their name first, one question.", "Note: one specific memory, no business ask."] },
  { id: "d3", title: "Mixer planning checklist", kind: "Checklist", pages: 2, updated: "Aug 2026", lines: ["Six weeks out: pick the place and date.", "Four weeks: video-text invites to every VIP.", "One week: reminder and RSVP count.", "Next day: thank-you texts."] },
  { id: "d4", title: "Referral thank-you ideas", kind: "List", pages: 1, updated: "Jul 2026", lines: ["Dinner for two at their favorite restaurant.", "A handwritten note within 24 hours.", "A shout-out on social (with their OK)."] },
  { id: "d5", title: "Open house four phases", kind: "Guide", pages: 8, updated: "Sep 2026", lines: ["Plan, Prepare, Host, Follow Up.", "The host gets the leads; every lead shows where it came from."] },
  { id: "d6", title: "Weekly Review worksheet", kind: "Worksheet", pages: 2, updated: "Oct 2026", lines: ["Score: daily points plus weekly bonus. Minimum 100.", "Commitments: Kept, Partly, Missed, with a note."] },
];

// The Lounge (team posts)
export interface LoungePost { id: string; author: string; role: string; when: string; text: string; likes: number; replies: { author: string; text: string }[] }
export const LOUNGE: LoungePost[] = [
  { id: "lp1", author: "Kendra Mills", role: "Team agent", when: "2 hours ago", text: "Mixer at The Copper Pot last night: 22 VIPs came and two asked about listing in the spring. Video-text invites work.", likes: 9, replies: [{ author: "Dan Weller", text: "Stealing this idea for November." }] },
  { id: "lp2", author: "Morgan Hale", role: "Coach", when: "Yesterday", text: "Weekly reminder: the minimum is 100 points. Three of you are within 10. Finish strong today.", likes: 14, replies: [] },
  { id: "lp3", author: "Ty Robbins", role: "Team agent", when: "Yesterday", text: "Anyone have a good roofer in Layton? Client needs a quote before closing.", likes: 3, replies: [{ author: "Alicia Price", text: "Alpine Roof Co. It's in the Rolodex community." }] },
  { id: "lp4", author: "Brooke Sand", role: "Team agent", when: "Oct 15", text: "Closed my 10th of the year. Eight came from VIP-50 referrals.", likes: 21, replies: [{ author: "Kendra Mills", text: "Huge. Congrats!" }, { author: "Rachel Voss", text: "That's the system working." }] },
];

// ---- B. what the example's actions do, on screen only ---------------------------------------------------------------

export interface M2State {
  drops: DropBy[];
  refs: Referral[];
  needs: Need[];
  listings: MyListing[];
  videos: Video[];
  posts: LoungePost[];
  liked: Record<string, boolean>;
  note: Partial<Record<M2Key, string>>;
}
export type M2Act =
  | { t: "drop"; id: string }
  | { t: "refer"; client: string; agentId: string; note: string }
  | { t: "need"; need: Need }
  | { t: "launch"; id: string }
  | { t: "listingNote"; text: string }
  | { t: "watched"; id: string }
  | { t: "post"; text: string }
  | { t: "like"; id: string }
  | { t: "reply"; id: string; text: string };

export function m2Reduce(s: M2State, a: M2Act): M2State {
  switch (a.t) {
    case "drop": {
      const d = s.drops.find((x) => x.id === a.id);
      if (!d) return s;
      return { ...s, drops: s.drops.map((x) => (x.id === a.id ? { ...x, done: !x.done, last: x.done ? x.last : "Today" } : x)), note: { ...s.note, dropby: d.done ? `${d.name}: back on the list.` : `Drop-by with ${d.name} done. It counts as this quarter's drop-by touch. ${EXAMPLE_SAVED}` } };
    }
    case "refer": {
      const ag = REF_AGENTS.find((x) => x.id === a.agentId);
      if (!ag || !a.client.trim()) return { ...s, note: { ...s.note, referrals: "Pick an agent and name the client first." } };
      const r: Referral = { id: `rf-${s.refs.length + 1}`, client: a.client.trim(), agentId: ag.id, status: "Sent", when: "Today", note: a.note.trim() || undefined };
      return { ...s, refs: [r, ...s.refs], note: { ...s.note, referrals: `Referral of ${r.client} to ${ag.name} in ${ag.market} is on your list. ${EXAMPLE_SENT}` } };
    }
    case "need":
      return { ...s, needs: [a.need, ...s.needs], note: { ...s.note, needs: `${a.need.buyer}'s need is posted to your team. ${fitsFor(a.need).length} homes fit now. ${EXAMPLE_SENT}` } };
    case "launch": {
      const l = s.listings.find((x) => x.id === a.id);
      if (!l || l.launch) return s;
      return { ...s, listings: s.listings.map((x) => (x.id === a.id ? { ...x, launch: EXAMPLE_LAUNCHED } : x)), note: { ...s.note, listings: `Launch started for ${l.street}: Pulse is drafting all five pieces, and you approve each one before anything goes out. ${EXAMPLE_SAVED}` } };
    }
    case "listingNote":
      return { ...s, note: { ...s.note, listings: a.text } };
    case "watched":
      return { ...s, videos: s.videos.map((v) => (v.id === a.id ? { ...v, watched: !v.watched } : v)), note: { ...s.note, videos: `Marked. ${EXAMPLE_SAVED}` } };
    case "post":
      if (!a.text.trim()) return s;
      return { ...s, posts: [{ id: `lp-${s.posts.length + 1}`, author: "Sarah Bennett (you)", role: "Team agent", when: "Just now", text: a.text.trim(), likes: 0, replies: [] }, ...s.posts], note: { ...s.note, lounge: `Posted to the team. ${EXAMPLE_POSTED}` } };
    case "like":
      return { ...s, liked: { ...s.liked, [a.id]: !s.liked[a.id] } };
    case "reply":
      if (!a.text.trim()) return s;
      return { ...s, posts: s.posts.map((p) => (p.id === a.id ? { ...p, replies: [...p.replies, { author: "Sarah Bennett (you)", text: a.text.trim() }] } : p)), note: { ...s.note, lounge: `Reply posted. ${EXAMPLE_POSTED}` } };
  }
}


export const m2Start = (): M2State => ({ drops: DROP_BYS, refs: REFERRALS, needs: NEEDS, listings: MY_LISTINGS, videos: VIDEOS, posts: LOUNGE, liked: {}, note: {} });
