// ONE Growth's example content for the Brain's side panels and full views (Parry, 18 Oct: "there are still many
// features that when it shows them the side information is blank"). Every piece round the Growth orb shows the example
// itself, and its full view works on it locally. Invented people, invented places, labelled "Example". Nothing here
// is sent, published, ordered or spent: ad spend is the agent's own, at cost, and only after the agent's own tap.
// Pure: no fetching, no secrets.

export const GROWTH_EXAMPLE_LABEL = "Example";
export const NOTHING_SENT = "(Example: nothing was sent.)";
export const NOTHING_PUBLISHED = "(Example: nothing was published and nothing was spent.)";
export const SPEND_LINE = "Ad spend is yours, at cost, on your own ad accounts. Nothing runs or spends until you tap Publish.";

/** The piece key from a Growth child key: "adreq:summit-home.vip50homes.com" -> "adreq". */
export type GrowthKey = "ads" | "areas" | "landing" | "speed" | "signals" | "inbox" | "results" | "adreq";
export const GROWTH_KEYS: GrowthKey[] = ["ads", "areas", "landing", "speed", "signals", "inbox", "results", "adreq"];
export function pieceKey(key: string): GrowthKey | null {
  const k = key.split(":")[0] as GrowthKey;
  return GROWTH_KEYS.includes(k) ? k : null;
}
export const GROWTH_TITLES: Record<GrowthKey, string> = {
  ads: "Pulse Ads",
  areas: "Farm areas",
  landing: "Landing pages",
  speed: "Speed to lead",
  signals: "Seller signals",
  inbox: "Lead inbox",
  results: "Results",
  adreq: "Ad requests",
};

// ---- Pulse Ads ----
export type AdStatus = "draft" | "approved" | "live" | "paused";
export interface ExampleAd {
  id: string;
  headline: string;
  body: string;
  area: string;
  channel: "Facebook and Instagram" | "Google";
  dailyBudget: number;
  status: AdStatus;
  picture: string; // what the picture shows (a placeholder block draws it)
  results?: { spend: number; clicks: number; leads: number };
}
export const EXAMPLE_ADS: ExampleAd[] = [
  {
    id: "ad-1",
    headline: "What sold on your street this fall?",
    body: "Get the October sales report for Willow Creek, prepared by a local agent. Free, no obligation.",
    area: "Willow Creek, Draper",
    channel: "Facebook and Instagram",
    dailyBudget: 15,
    status: "live",
    picture: "Street of homes at dusk",
    results: { spend: 312, clicks: 486, leads: 11 },
  },
  {
    id: "ad-2",
    headline: "First home in Lehi? Start with the guide.",
    body: "Down payment help, the steps in order and what homes cost now. Download the free buyer guide.",
    area: "Lehi and Saratoga Springs",
    channel: "Facebook and Instagram",
    dailyBudget: 12,
    status: "draft",
    picture: "Front porch with a new family",
  },
  {
    id: "ad-3",
    headline: "Thinking of selling in Holladay?",
    body: "Ask for a market analysis prepared by your agent, with the homes that sold near you.",
    area: "Holladay",
    channel: "Google",
    dailyBudget: 10,
    status: "draft",
    picture: "Tree-lined street in autumn",
  },
];

/** The buttons an ad shows in its state. Approve never publishes; Publish is its own tap. */
export function adButtons(s: AdStatus): { label: string; to: AdStatus }[] {
  if (s === "draft") return [{ label: "Approve", to: "approved" }, { label: "Pause", to: "paused" }];
  if (s === "approved") return [{ label: "Publish", to: "live" }, { label: "Pause", to: "paused" }];
  if (s === "live") return [{ label: "Pause", to: "paused" }];
  return [{ label: "Resume", to: "live" }];
}
export function adNote(to: AdStatus): string {
  if (to === "approved") return `Approved. It runs only once you tap Publish. ${NOTHING_PUBLISHED}`;
  if (to === "live") return `Published on your own ad account; spend is yours, at cost. ${NOTHING_PUBLISHED}`;
  return `Paused. No more spend on this ad. ${NOTHING_PUBLISHED}`;
}
export const AD_STATUS_WORDS: Record<AdStatus, string> = { draft: "Draft, waiting for you", approved: "Approved, not published", live: "Live", paused: "Paused" };

/** Cost per lead in whole dollars and cents; null with no leads. */
export function costPerLead(spend: number, leads: number): number | null {
  if (!(leads > 0) || !(spend >= 0)) return null;
  return Math.round((spend / leads) * 100) / 100;
}
export const money = (n: number, cents = false) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`;

// ---- Farm areas ----
export interface ExampleArea { id: string; name: string; homes: number; lastPostcard: string; turnover: number; nextNote: string }
export const EXAMPLE_AREAS: ExampleArea[] = [
  { id: "area-1", name: "Willow Creek, Draper", homes: 1240, lastPostcard: "2026-10-02", turnover: 6.1, nextNote: "November market note: 14 sales, days on market up to 31." },
  { id: "area-2", name: "Maple Hollow, Holladay", homes: 860, lastPostcard: "2026-09-18", turnover: 4.8, nextNote: "November market note: 7 sales, two new listings near the school." },
];
export const POSTCARD_NOTE = `Postcard drafted for your approval. It prints and mails, per card at cost, only after you approve it. ${NOTHING_SENT}`;

// ---- Landing pages ----
export interface ExampleLanding { id: string; title: string; kind: string; path: string; visitors: number; leads: number; lead: string; ask: string }
export const EXAMPLE_LANDING: ExampleLanding[] = [
  { id: "lp-1", title: "What is my Draper home worth?", kind: "Home value", path: "/home-value/draper", visitors: 412, leads: 9, lead: "Your agent prepares a market analysis for your home and sends it to you.", ask: "Ask for my analysis" },
  { id: "lp-2", title: "First-time buyer guide: Utah County", kind: "Buyer guide", path: "/guides/first-home", visitors: 288, leads: 6, lead: "The steps in order, down payment help and what homes cost now.", ask: "Send me the guide" },
  { id: "lp-3", title: "Moving to Salt Lake: the relocation guide", kind: "Relocation", path: "/relocating/salt-lake", visitors: 175, leads: 3, lead: "Neighbourhoods, schools from the official state list, and the commute.", ask: "Send me the guide" },
];
/** Leads per 100 visitors, one decimal. */
export function convRate(visitors: number, leads: number): number {
  return visitors > 0 ? Math.round((leads / visitors) * 1000) / 10 : 0;
}

// ---- Speed to lead ----
export type PulseMode = "off" | "ask" | "auto";
export const MODES: { key: PulseMode; label: string; line: string }[] = [
  { key: "off", label: "Off", line: "Pulse does nothing. New leads wait for you." },
  { key: "ask", label: "Ask me", line: "Pulse drafts the first reply in seconds; you tap Send." },
  { key: "auto", label: "Autopilot", line: "Pulse sends the first email reply for you, within the guardrails." },
];
export const GUARDRAILS =
  "Guardrails, always: Pulse hands back showings, offers, contracts and money; checks consent, do-not-call, quiet hours and frequency before every send; says it is your assistant. Autopilot covers email only: texts open on your phone for you to send.";
export const EXAMPLE_REPLY_SECONDS: Record<PulseMode, number[]> = {
  off: [1260, 2400, 540, 3900, 1800],
  ask: [95, 140, 62, 210, 118],
  auto: [22, 31, 18, 40, 26],
};
/** The median of a list of seconds; null when empty. */
export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : Math.round((s[m - 1]! + s[m]!) / 2);
}
/** "48 seconds", "2 min 10 s", "1 h 5 min". */
export function durationWords(sec: number | null): string {
  if (sec == null) return "No leads yet";
  if (sec < 60) return `${sec} seconds`;
  if (sec < 3600) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return s ? `${m} min ${s} s` : `${m} min`;
  }
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}
export function modeNote(m: PulseMode): string {
  const label = MODES.find((x) => x.key === m)!.label;
  return `Speed to lead set to ${label} in this example. ${NOTHING_SENT}`;
}

// ---- Seller signals ----
export interface ExampleSignal { id: string; name: string; street: string; signal: string; since: string }
// Plain reasons only; never a home value, never a guess about anyone's private life.
export const EXAMPLE_SIGNALS: ExampleSignal[] = [
  { id: "sg-1", name: "Dale R.", street: "Aspen Ridge Dr", signal: "Owned 14 years, more than twice the area's usual stay.", since: "This week" },
  { id: "sg-2", name: "Priya K.", street: "Larkspur Ln", signal: "Opened your home value page twice this month.", since: "2 days ago" },
  { id: "sg-3", name: "Tom and Ellen W.", street: "Cottonwood Cir", signal: "Asked about smaller homes at your October mixer.", since: "Last week" },
  { id: "sg-4", name: "Marcus J.", street: "Quarry Bend", signal: "A building permit for a remodel closed last month.", since: "3 weeks ago" },
  { id: "sg-5", name: "Rosa M.", street: "Sunflower Way", signal: "Asked you when spring is the best time to list.", since: "Yesterday" },
];
export const callNote = (name: string) => `Call ${name.split(" ")[0]} added to today's list. ${NOTHING_SENT}`;

// ---- Lead inbox ----
export type LeadSource = "Zillow" | "Realtor.com" | "Homes.com" | "Facebook ad" | "Your site";
export type LeadStatus = "New" | "Replied" | "Appointment set";
export interface ExampleLead { id: string; name: string; source: LeadSource; minutesAgo: number; status: LeadStatus; about: string; draft: string }
export const EXAMPLE_LEADS: ExampleLead[] = [
  { id: "ld-1", name: "Hannah P.", source: "Zillow", minutesAgo: 4, status: "New", about: "Asked to see 1482 E Juniper Way this weekend.", draft: "Hi Hannah, thanks for asking about Juniper Way. I can show it Saturday at 10 or 2. Which works better? Sarah" },
  { id: "ld-2", name: "Kevin L.", source: "Realtor.com", minutesAgo: 38, status: "New", about: "Wants a 3-bedroom home near the Draper trail.", draft: "Hi Kevin, I pulled four homes near the Draper trail that fit. Want me to send them, or set up a quick call? Sarah" },
  { id: "ld-3", name: "Amara O.", source: "Homes.com", minutesAgo: 95, status: "Replied", about: "Asked if 220 W Pine St is still available.", draft: "Hi Amara, Pine St is still available. Would you like to see it this week? Sarah" },
  { id: "ld-4", name: "Jacob S.", source: "Facebook ad", minutesAgo: 180, status: "Replied", about: "Downloaded the Willow Creek sales report.", draft: "Hi Jacob, here is the Willow Creek report. Happy to walk you through what it means for your street. Sarah" },
  { id: "ld-5", name: "Lena F.", source: "Your site", minutesAgo: 320, status: "Appointment set", about: "Asked for a market analysis on her Holladay home.", draft: "Hi Lena, I am putting your market analysis together now and will have it to you by Thursday. Sarah" },
  { id: "ld-6", name: "Omar D.", source: "Zillow", minutesAgo: 1440, status: "Appointment set", about: "Tour of three homes in Lehi booked for Friday.", draft: "Hi Omar, confirming Friday at 4 for the three Lehi homes. I will text the addresses that morning. Sarah" },
];
export function agoWords(min: number): string {
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  if (min < 1440) {
    const h = Math.round(min / 60);
    return `${h} h ago`;
  }
  const d = Math.round(min / 1440);
  return d === 1 ? "yesterday" : `${d} days ago`;
}
export const replyNote = (name: string) => `Reply to ${name.split(" ")[0]} marked as sent. ${NOTHING_SENT}`;

// ---- Results ----
export interface SourceResult { source: string; spend: number | null; leads: number }
export const EXAMPLE_MONTH = "October";
export const EXAMPLE_SOURCES: SourceResult[] = [
  { source: "Facebook ad", spend: 780, leads: 18 },
  { source: "Google ad", spend: 460, leads: 9 },
  { source: "Zillow", spend: null, leads: 8 },
  { source: "Realtor.com", spend: null, leads: 5 },
  { source: "Homes.com", spend: null, leads: 3 },
  { source: "Your site", spend: null, leads: 3 },
];
export const EXAMPLE_FUNNEL = { appointments: 9, closings: 1 };
export function monthTotals(rows: SourceResult[], f: { appointments: number; closings: number }) {
  const spend = rows.reduce((t, r) => t + (r.spend ?? 0), 0);
  const leads = rows.reduce((t, r) => t + r.leads, 0);
  return { spend, leads, appointments: f.appointments, closings: f.closings, cpl: costPerLead(spend, leads) };
}
/** Each source's bar as a share of the biggest (0..1). */
export function barShares(rows: SourceResult[]): number[] {
  const max = Math.max(0, ...rows.map((r) => r.leads));
  return rows.map((r) => (max > 0 ? r.leads / max : 0));
}

// ---- Ad requests (team owner or admin) ----
export type RequestStatus = "waiting" | "approved" | "asked" | "published";
export interface ExampleRequest { id: string; agent: string; what: string; area: string; dailyBudget: number; days: number; status: RequestStatus }
export const EXAMPLE_REQUESTS: ExampleRequest[] = [
  { id: "rq-1", agent: "Jordan M.", what: "Open house this Saturday, 1482 E Juniper Way", area: "Draper", dailyBudget: 10, days: 4, status: "waiting" },
  { id: "rq-2", agent: "Kelsey T.", what: "Just listed: 3-bed rambler with a big yard", area: "Sandy", dailyBudget: 15, days: 7, status: "waiting" },
  { id: "rq-3", agent: "Ben A.", what: "Home value offer for Maple Hollow", area: "Holladay", dailyBudget: 8, days: 14, status: "waiting" },
];
export const requestTotal = (r: ExampleRequest) => r.dailyBudget * r.days;
export const approveRequestNote = (r: ExampleRequest) =>
  `Approved ${r.agent.split(" ")[0]}'s ad. It runs only once you or an admin tap Publish; up to ${money(requestTotal(r))} on the team's ad account, at cost. ${NOTHING_PUBLISHED}`;
export const publishRequestNote = (r: ExampleRequest) =>
  `Published ${r.agent.split(" ")[0]}'s ad on the team's ad account; spend is at cost, up to ${money(requestTotal(r))}. ${NOTHING_PUBLISHED}`;
export const TEAM_SPEND_LINE = "Team ad spend is the team's, at cost, on the team's own ad account. Nothing runs or spends until you or an admin tap Publish.";
export const askRequestNote = (r: ExampleRequest) => `Question for ${r.agent.split(" ")[0]} saved on the request. ${NOTHING_SENT}`;

// ---- The one example state both the side panel and the full view work on ----
export interface GrowthExampleState {
  ads: Record<string, AdStatus>;
  mode: PulseMode;
  called: Record<string, boolean>;
  leads: Record<string, LeadStatus>;
  requests: Record<string, RequestStatus>;
  postcards: Record<string, boolean>;
  pagesOff: Record<string, boolean>;
  note: string | null;
}
export function initialGrowthState(): GrowthExampleState {
  return {
    ads: Object.fromEntries(EXAMPLE_ADS.map((a) => [a.id, a.status])),
    mode: "ask",
    called: {},
    leads: Object.fromEntries(EXAMPLE_LEADS.map((l) => [l.id, l.status])),
    requests: Object.fromEntries(EXAMPLE_REQUESTS.map((r) => [r.id, r.status])),
    postcards: {},
    pagesOff: {},
    note: null,
  };
}
export type GrowthExampleAction =
  | { kind: "ad"; id: string; to: AdStatus }
  | { kind: "mode"; mode: PulseMode }
  | { kind: "call"; id: string }
  | { kind: "reply"; id: string }
  | { kind: "request"; id: string; to: "approved" | "asked" | "published" }
  | { kind: "postcard"; id: string }
  | { kind: "page"; id: string; on: boolean }
  | { kind: "clearNote" };

/** Apply one tap to the example. Every note says nothing left ONE. */
export function applyGrowth(s: GrowthExampleState, a: GrowthExampleAction): GrowthExampleState {
  switch (a.kind) {
    case "ad": {
      const from = s.ads[a.id];
      if (!from || !adButtons(from).some((b) => b.to === a.to)) return s; // only the buttons the ad shows
      return { ...s, ads: { ...s.ads, [a.id]: a.to }, note: adNote(a.to) };
    }
    case "mode":
      return { ...s, mode: a.mode, note: modeNote(a.mode) };
    case "call": {
      const p = EXAMPLE_SIGNALS.find((x) => x.id === a.id);
      return p ? { ...s, called: { ...s.called, [a.id]: true }, note: callNote(p.name) } : s;
    }
    case "reply": {
      const l = EXAMPLE_LEADS.find((x) => x.id === a.id);
      if (!l) return s;
      const now = s.leads[a.id] === "New" ? "Replied" : s.leads[a.id]!;
      return { ...s, leads: { ...s.leads, [a.id]: now }, note: replyNote(l.name) };
    }
    case "request": {
      const r = EXAMPLE_REQUESTS.find((x) => x.id === a.id);
      if (!r) return s;
      if (a.to === "published" && s.requests[a.id] !== "approved") return s; // approved first, then its own Publish tap
      const note = a.to === "approved" ? approveRequestNote(r) : a.to === "published" ? publishRequestNote(r) : askRequestNote(r);
      return { ...s, requests: { ...s.requests, [a.id]: a.to }, note };
    }
    case "postcard":
      return EXAMPLE_AREAS.some((x) => x.id === a.id) ? { ...s, postcards: { ...s.postcards, [a.id]: true }, note: POSTCARD_NOTE } : s;
    case "page": {
      const p = EXAMPLE_LANDING.find((x) => x.id === a.id);
      if (!p) return s;
      return { ...s, pagesOff: { ...s.pagesOff, [a.id]: !a.on }, note: `${a.on ? "Turned on" : "Paused"} in this example: ${p.title} ${NOTHING_PUBLISHED}` };
    }
    case "clearNote":
      return { ...s, note: null };
  }
}

/** The one-line count under each panel's title ("3 ads · 1 live"). */
export function pieceLine(k: GrowthKey, s: GrowthExampleState): string {
  if (k === "ads") {
    const live = Object.values(s.ads).filter((x) => x === "live").length;
    const wait = Object.values(s.ads).filter((x) => x === "draft").length;
    return `${EXAMPLE_ADS.length} ads · ${live} live · ${wait} waiting for you`;
  }
  if (k === "areas") return `${EXAMPLE_AREAS.length} farm areas · ${EXAMPLE_AREAS.reduce((t, a) => t + a.homes, 0).toLocaleString("en-US")} homes`;
  if (k === "landing") return `${EXAMPLE_LANDING.length} pages · ${EXAMPLE_LANDING.reduce((t, p) => t + p.leads, 0)} leads this month`;
  if (k === "speed") return `First reply, median: ${durationWords(median(EXAMPLE_REPLY_SECONDS[s.mode]))}`;
  if (k === "signals") return `${EXAMPLE_SIGNALS.length} homeowners worth a call`;
  if (k === "inbox") return `${EXAMPLE_LEADS.length} leads · ${Object.values(s.leads).filter((x) => x === "New").length} new`;
  if (k === "results") {
    const t = monthTotals(EXAMPLE_SOURCES, EXAMPLE_FUNNEL);
    return `${EXAMPLE_MONTH}: ${t.leads} leads · ${t.cpl == null ? "no" : money(t.cpl, true)} per lead`;
  }
  return `${Object.values(s.requests).filter((x) => x === "waiting").length} of ${EXAMPLE_REQUESTS.length} waiting for you`;
}
