// Marquee's six tools as the Brain shows them before the agent has used them (Parry, 18 Oct: "the side information is
// blank"). Every name, address and number here is invented and shown labelled "Example". Pure: no fetching, nothing
// is posted, published or sent. The Brain's side panel shows these rows; "Open ..." shows the full view with the same
// rows, where Approve, Edit, Publish and Send to seller work on screen only.

export const MQ_KEYS = ["listings", "calendar", "posts", "reports", "presentations", "room_cards"] as const;
export type MqKey = (typeof MQ_KEYS)[number];

export const MQ_TITLE: Record<MqKey, string> = {
  listings: "Listings",
  calendar: "Calendar",
  posts: "Posts waiting",
  reports: "Seller reports",
  presentations: "Presentations",
  room_cards: "Room cards",
};

/** The tool key of a Marquee tool orb id (`marquee-tool-<key>`), else null. */
export function mqKeyOf(id: string | null | undefined): MqKey | null {
  if (!id || !id.startsWith("marquee-tool-")) return null;
  const k = id.slice("marquee-tool-".length);
  return (MQ_KEYS as readonly string[]).includes(k) ? (k as MqKey) : null;
}

/** The photo block's colours (a drawn stand-in for the listing photo; never a person's face). */
export type Tone = "dusk" | "sage" | "sand" | "slate" | "ember" | "sky";

export interface MqListing {
  id: string;
  street: string;
  city: string;
  price: number;
  status: "Live" | "Coming soon" | "Under contract";
  daysOnMarket: number | null; // null: not on the market yet
  beds: number;
  baths: number;
  sqft: number;
  step: number; // campaign step, of 9
  next: string; // the campaign's next step
  tone: Tone;
}

export const MQ_LISTINGS: MqListing[] = [
  { id: "maple", street: "1482 Maple Ridge Dr", city: "Bountiful", price: 689_000, status: "Live", daysOnMarket: 5, beds: 4, baths: 3, sqft: 3120, step: 4, next: "Approve 5 posts; the first posts tomorrow", tone: "dusk" },
  { id: "aspen", street: "88 Aspen Ct", city: "Kaysville", price: 529_900, status: "Coming soon", daysOnMarket: null, beds: 3, baths: 2, sqft: 2240, step: 2, next: "Listing appointment Thu; 2 posts to approve", tone: "sage" },
  { id: "willow", street: "310 Willow Bend Rd", city: "Farmington", price: 815_000, status: "Under contract", daysOnMarket: 21, beds: 5, baths: 4, sqft: 4010, step: 7, next: "Closing post when it records", tone: "sand" },
];

export const MQ_STEPS = 9;

export type Channel = "Instagram" | "Facebook" | "Instagram Story" | "Facebook Reel";

export interface MqPost {
  id: string;
  listing: string; // street
  channel: Channel;
  kind: string; // what the piece is
  caption: string;
  day: number; // posting day, days from today (0 today ... 6)
  time: string;
  tone: Tone;
}

export const MQ_POSTS: MqPost[] = [
  { id: "p1", listing: "1482 Maple Ridge Dr", channel: "Instagram", kind: "Just listed", caption: "Just listed in Bountiful: four bedrooms, a chef's kitchen and sunset views over the valley. Tour it this weekend.", day: 1, time: "9:00 AM", tone: "dusk" },
  { id: "p2", listing: "1482 Maple Ridge Dr", channel: "Facebook", kind: "Kitchen", caption: "The kitchen everyone gathers in: quartz island, walk-in pantry and a window over the garden.", day: 1, time: "7:00 PM", tone: "sand" },
  { id: "p3", listing: "1482 Maple Ridge Dr", channel: "Instagram Story", kind: "Open house", caption: "Open house Saturday, 11 to 2. Come see 1482 Maple Ridge Dr in person.", day: 2, time: "8:00 AM", tone: "ember" },
  { id: "p4", listing: "1482 Maple Ridge Dr", channel: "Facebook Reel", kind: "Walk-through", caption: "Sixty seconds through every room, from the front porch to the covered patio.", day: 3, time: "10:00 AM", tone: "slate" },
  { id: "p5", listing: "1482 Maple Ridge Dr", channel: "Instagram", kind: "Neighbourhood", caption: "Five minutes to the trailhead, two to the elementary school. Life near Maple Ridge.", day: 5, time: "11:00 AM", tone: "sage" },
  { id: "p6", listing: "88 Aspen Ct", channel: "Instagram", kind: "Coming soon", caption: "Coming soon to Kaysville: a three-bedroom on a quiet court with a big backyard.", day: 4, time: "5:00 PM", tone: "sky" },
  { id: "p7", listing: "88 Aspen Ct", channel: "Facebook", kind: "Backyard", caption: "Room for the garden, the swing set and summer dinners outside. 88 Aspen Ct, coming soon.", day: 6, time: "4:00 PM", tone: "sage" },
];

/** Pieces the agent approved and scheduled earlier (they post on their day; the agent switched that on). */
export interface MqCalPost {
  id: string;
  day: number; // days from today
  time: string;
  listing: string;
  channel: Channel;
  what: string;
}

export const MQ_SCHEDULED: MqCalPost[] = [
  { id: "c1", day: 0, time: "6:30 PM", listing: "1482 Maple Ridge Dr", channel: "Facebook", what: "Price and photos" },
  { id: "c2", day: 2, time: "12:00 PM", listing: "310 Willow Bend Rd", channel: "Instagram", what: "Under contract" },
  { id: "c3", day: 4, time: "9:00 AM", listing: "1482 Maple Ridge Dr", channel: "Instagram", what: "Primary suite" },
];

export type CalWords = "Scheduled" | "Approved, tap Publish" | "Waiting for you";

export interface MqDay {
  iso: string; // YYYY-MM-DD
  name: string; // "Today", "Tomorrow", else "Wed"
  short: string; // "Wed"
  date: string; // "21 Oct"
  posts: { id: string; time: string; listing: string; channel: Channel; what: string; post: string | null; words: CalWords }[];
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const at = (today: string, n: number) => new Date(Date.parse(`${today}T12:00:00Z`) + n * 86_400_000);
/** "Wed" for the day `n` days after `today`. */
export const dayShort = (today: string, n: number) => DAY_NAMES[at(today, n).getUTCDay()];
/** "Today", "Tomorrow", else "Wed". */
export const dayName = (today: string, n: number) => (n === 0 ? "Today" : n === 1 ? "Tomorrow" : dayShort(today, n));

const toMin = (t: string) => {
  const m = /^(\d+):(\d+) (AM|PM)$/.exec(t);
  if (!m) return 0;
  return ((Number(m[1]) % 12) + (m[3] === "PM" ? 12 : 0)) * 60 + Number(m[2]);
};

/** The next seven days from `today` (YYYY-MM-DD), each with its posts in time order and in words. A built piece reads
 * "Waiting for you" until the agent approves it, then "Approved, tap Publish": nothing posts that the agent did not
 * approve and publish (ECOSYSTEM §9.8). */
export function calendarWeek(today: string, s: MqState = MQ_START): MqDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = at(today, i);
    const built = MQ_POSTS.filter((p) => p.day === i).map((p) => ({
      id: p.id, time: p.time, listing: p.listing, channel: p.channel, what: p.kind, post: p.id,
      words: (s.published.includes(p.id) ? "Scheduled" : s.approved.includes(p.id) ? "Approved, tap Publish" : "Waiting for you") as CalWords,
    }));
    const done = MQ_SCHEDULED.filter((c) => c.day === i).map((c) => ({ ...c, post: null, words: "Scheduled" as CalWords }));
    return {
      iso: d.toISOString().slice(0, 10),
      name: dayName(today, i),
      short: dayShort(today, i),
      date: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`,
      posts: [...done, ...built].sort((a, b) => toMin(a.time) - toMin(b.time)),
    };
  });
}

export interface MqReport {
  id: string;
  listing: string;
  seller: string; // first name only
  week: number;
  views: number;
  saves: number;
  showings: number;
  viewsChange: number; // against last week, percent
  feedback: string;
  tone: Tone;
}

export const MQ_REPORTS: MqReport[] = [
  { id: "r1", listing: "1482 Maple Ridge Dr", seller: "Laura", week: 1, views: 1284, saves: 46, showings: 7, viewsChange: 0, feedback: "Buyers love the kitchen and the views. Two said the third bedroom feels small; one asked about the roof's age. Open house Saturday.", tone: "dusk" },
  { id: "r2", listing: "310 Willow Bend Rd", seller: "Mark", week: 3, views: 2310, saves: 88, showings: 12, viewsChange: 18, feedback: "Under contract after 12 showings. The buyer's inspection is Tuesday; appraisal ordered. Most visitors named the yard and the bonus room.", tone: "sand" },
];

export interface MqDeck {
  id: string;
  listing: string;
  kind: "Listing appointment" | "Marketing packet";
  pages: number;
  state: string;
  sections: string[];
  tone: Tone;
}

export const MQ_DECKS: MqDeck[] = [
  { id: "d1", listing: "88 Aspen Ct", kind: "Listing appointment", pages: 8, state: "Ready for Thursday", sections: ["About you and your home", "What homes near you sold for", "Suggested price range", "The marketing plan", "Photos, video and the 9 steps", "Weekly seller reports", "Our team", "Next steps"], tone: "sage" },
  { id: "d2", listing: "1482 Maple Ridge Dr", kind: "Marketing packet", pages: 12, state: "Approved", sections: ["The home at a glance", "Room by room", "Floor plan", "The neighbourhood", "Schools nearby", "Upgrades and care", "Utilities and costs", "Open house times", "Photos", "Video walk-through", "Your agent", "How to make an offer"], tone: "dusk" },
];

export interface MqRoom {
  id: string;
  room: string;
  caption: string;
  tone: Tone;
}

export const MQ_ROOMS_FOR = "1482 Maple Ridge Dr";
export const MQ_ROOMS: MqRoom[] = [
  { id: "k", room: "Kitchen", caption: "Quartz island that seats six, a walk-in pantry and a window over the garden.", tone: "sand" },
  { id: "g", room: "Great room", caption: "Vaulted ceiling, gas fireplace and west windows that catch every sunset.", tone: "dusk" },
  { id: "s", room: "Primary suite", caption: "On the main floor, with a soaking tub, two sinks and a walk-in closet.", tone: "slate" },
  { id: "y", room: "Backyard", caption: "Covered patio, raised garden beds and a lawn that backs onto open space.", tone: "sage" },
];

// ---- the example's local state (on screen only; nothing leaves the page) ------------------------------------------

export interface MqState {
  approved: string[]; // post ids
  captions: Record<string, string>; // edited captions
  published: string[]; // post ids the agent "published" (example: nothing posts)
  sent: string[]; // report ids marked sent (example: nothing is sent)
}

export const MQ_START: MqState = { approved: [], captions: {}, published: [], sent: [] };

export type MqAction =
  | { t: "approve"; id: string }
  | { t: "unapprove"; id: string }
  | { t: "caption"; id: string; text: string }
  | { t: "publish" }
  | { t: "send"; id: string };

const add = (xs: string[], id: string) => (xs.includes(id) ? xs : [...xs, id]);

/** The example's state after one action. Publish moves only approved posts; an edited caption is kept trimmed, and
 * an empty one goes back to Marquee's draft. Unknown ids change nothing. */
export function mqReduce(s: MqState, a: MqAction): MqState {
  const post = (id: string) => MQ_POSTS.some((p) => p.id === id);
  switch (a.t) {
    case "approve":
      return post(a.id) ? { ...s, approved: add(s.approved, a.id) } : s;
    case "unapprove":
      return s.published.includes(a.id) ? s : { ...s, approved: s.approved.filter((x) => x !== a.id) };
    case "caption": {
      if (!post(a.id) || s.published.includes(a.id)) return s;
      const text = a.text.trim().slice(0, 600);
      const captions = { ...s.captions };
      if (text) captions[a.id] = text;
      else delete captions[a.id];
      return { ...s, captions };
    }
    case "publish":
      return { ...s, published: s.approved.reduce(add, s.published) };
    case "send":
      return MQ_REPORTS.some((r) => r.id === a.id) ? { ...s, sent: add(s.sent, a.id) } : s;
  }
}

/** Posts still waiting: built and not yet published. */
export const mqWaiting = (s: MqState) => MQ_POSTS.filter((p) => !s.published.includes(p.id));
export const mqCaption = (s: MqState, p: MqPost) => s.captions[p.id] ?? p.caption;

export const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export const MQ_NOTHING_POSTS = "Nothing posts until you approve it and tap Publish.";
export const MQ_EXAMPLE_PUBLISHED = "(Example: nothing was published.)";
export const MQ_EXAMPLE_SENT = "(Example: nothing was sent.)";
