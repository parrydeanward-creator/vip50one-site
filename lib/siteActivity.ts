import { MOVE_URL } from "./host.ts";

// VIP-SUMMARY §3ar (v1.86, 23 Oct; Parry: "yes build it. looks great"): site activity. Websites sends the events
// (SITE-FEEDS K26) into MASTER; ONE MOVE serves three routes; the Brain draws them: "On your site" and the account box
// on a contact, "Who is on my site" under People, and "Team sites this week" for a team's owner and admins. Only
// signed-in people are named; site numbers stay anonymous. Every reader drops what is not the contract's shape and caps
// its lists, so a bad answer draws nothing rather than invented numbers.

const API = `${MOVE_URL}/api/brain`;

export type Range = "today" | "7d" | "30d";
export const RANGES: { key: Range; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
];
const isRange = (r: unknown): r is Range => r === "today" || r === "7d" || r === "30d";

/** GET one contact's site activity (§3ar). */
export const personSiteUrl = (id: string, days = 30) => `${API}/people/${encodeURIComponent(id)}/site?days=${Math.max(1, Math.min(90, Math.floor(days) || 30))}`;
/** POST: Websites sends the Room invitation again; nothing else goes out. */
export const roomInviteUrl = (id: string) => `${API}/people/${encodeURIComponent(id)}/room-invite`;
/** GET who is on the agent's own site. */
export const siteActivityUrl = (range: Range = "7d") => `${API}/site/activity?range=${isRange(range) ? range : "7d"}`;
/** GET the team's sites (owner and admins). */
export const teamSiteUrl = (range: Range = "7d") => `${API}/team/site?range=${isRange(range) ? range : "7d"}`;

// ---- small readers ---------------------------------------------------------------------------------------------------

const str = (v: unknown, max = 200): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
const numOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
const share = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1 ? v : null);
const ID = /^[0-9a-f-]{36}$/i;
const id = (v: unknown): string | null => (typeof v === "string" && ID.test(v) ? v : null);
const when = (v: unknown): string | null => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : null);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

// ---- one contact ------------------------------------------------------------------------------------------------------

export type Device = "phone" | "computer";
export type TodayKind = "page" | "home" | "search" | "signed_in" | "saved";
export type PulseAction = "call" | "text" | "showing";
export interface SiteHome { key: string; address: string; price: number | null; times: number; seconds: number; saved: boolean; note: string | null }
export interface SiteMoment { at: string; kind: TodayKind; text: string }
export interface SiteAccount {
  website: { signedInAt: string | null } | null;
  app: { platform: string | null; lastAt: string | null } | null;
  room: { invitedAt: string | null; openedAt: string | null } | null;
  emails: { cadence: string | null; openRate: number | null } | null;
}
export interface PersonSite {
  visits7: number;
  visits30: number;
  homes7: number;
  homes30: number;
  seconds30: number;
  secondsPrev30: number;
  lastVisitAt: string | null;
  lastDevice: Device | null;
  perDay: { date: string; visits: number }[];
  homes: SiteHome[];
  today: SiteMoment[];
  account: SiteAccount;
  pulse: { line: string; action: PulseAction | null } | null;
}

export const MAX_HOMES = 10;
export const MAX_TODAY = 30;
export const MAX_PEOPLE = 25;
export const MAX_AGENTS = 60;
export const MAX_ROUTE = 25;
export const MAX_TOP = 10;

const KINDS: TodayKind[] = ["page", "home", "search", "signed_in", "saved"];

/** §3ar `GET people/:id/site`. Null when it is not the contract's shape (the contact then shows no site block). */
export function readPersonSite(j: unknown): PersonSite | null {
  const o = obj(j);
  if (!o || !("visits_30" in o) || !Array.isArray(o.per_day)) return null;
  const perDay = arr(o.per_day)
    .flatMap((d) => {
      const r = obj(d);
      return r && typeof r.date === "string" && DAY.test(r.date) ? [{ date: r.date, visits: num(r.visits) }] : [];
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
  const homes: SiteHome[] = [];
  for (const h of arr(o.homes)) {
    const r = obj(h);
    const address = r ? str(r.address, 120) : null;
    if (!r || !address) continue;
    const key = str(r.property_key, 80) ?? address;
    if (homes.some((x) => x.key === key)) continue;
    homes.push({ key, address, price: numOrNull(r.price), times: num(r.times), seconds: num(r.seconds), saved: r.saved === true, note: str(r.note, 80) });
    if (homes.length >= MAX_HOMES) break;
  }
  const today: SiteMoment[] = [];
  for (const t of arr(o.today)) {
    const r = obj(t);
    const at = r ? when(r.at) : null;
    const text = r ? str(r.text, 200) : null;
    if (!r || !at || !text) continue;
    today.push({ at, kind: KINDS.includes(r.kind as TodayKind) ? (r.kind as TodayKind) : "page", text });
    if (today.length >= MAX_TODAY) break;
  }
  today.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const a = obj(o.account) ?? {};
  const web = obj(a.website);
  const app = obj(a.app);
  const room = obj(a.room);
  const em = obj(a.emails);
  const p = obj(o.pulse);
  const line = p ? str(p.line, 300) : null;
  const visits30 = num(o.visits_30);
  const homes30 = num(o.homes_viewed_30);
  return {
    visits7: Math.min(num(o.visits_7), visits30),
    visits30,
    homes7: Math.min(num(o.homes_viewed_7), homes30),
    homes30,
    seconds30: num(o.seconds_30),
    secondsPrev30: num(o.seconds_prev_30),
    lastVisitAt: when(o.last_visit_at),
    lastDevice: o.last_device === "phone" || o.last_device === "computer" ? o.last_device : null,
    perDay,
    homes,
    today,
    account: {
      website: web ? { signedInAt: when(web.signed_in_at) } : null,
      app: app ? { platform: str(app.platform, 30), lastAt: when(app.last_at) } : null,
      room: room ? { invitedAt: when(room.invited_at), openedAt: when(room.opened_at) } : null,
      emails: em ? { cadence: str(em.cadence, 30), openRate: share(em.open_rate) } : null,
    },
    pulse: line ? { line, action: p!.action === "call" || p!.action === "text" || p!.action === "showing" ? p!.action : null } : null,
  };
}

/** Nothing to show: no visits and no account at all (the block stays away rather than draw zeros). */
export const siteIsEmpty = (s: PersonSite) =>
  !s.visits30 && !s.homes.length && !s.today.length && !s.account.website && !s.account.app && !s.account.room && !s.account.emails;

// ---- who is on my site ------------------------------------------------------------------------------------------------

export type Heat = "hot" | "warm" | "new";
export interface SitePerson { contactId: string; name: string; kind: string | null; heat: Heat | null; line: string; action: "call" | "text" }
export interface SiteActivity {
  signedIn: number;
  visits: number;
  newLeads: number;
  topHome: { address: string; views: number; saves: number } | null;
  topPages: string[];
  topArea: string | null;
  phoneShare: number | null;
  busiest: string | null;
  people: SitePerson[];
}

/** §3ar `GET site/activity`. */
export function readSiteActivity(j: unknown): SiteActivity | null {
  const o = obj(j);
  if (!o || !Array.isArray(o.people)) return null;
  const people: SitePerson[] = [];
  for (const x of o.people) {
    const r = obj(x);
    const contactId = r ? id(r.contact_id) : null;
    const name = r ? str(r.name, 120) : null;
    if (!r || !contactId || !name || people.some((p) => p.contactId === contactId)) continue;
    people.push({
      contactId,
      name,
      kind: str(r.kind, 60),
      heat: r.heat === "hot" || r.heat === "warm" || r.heat === "new" ? r.heat : null,
      line: str(r.line, 200) ?? "",
      action: r.action === "text" ? "text" : "call",
    });
    if (people.length >= MAX_PEOPLE) break;
  }
  const th = obj(o.top_home);
  const thAddr = th ? str(th.address, 120) : null;
  return {
    signedIn: num(o.signed_in),
    visits: num(o.visits),
    newLeads: num(o.new_leads),
    topHome: th && thAddr ? { address: thAddr, views: num(th.views), saves: num(th.saves) } : null,
    topPages: arr(o.top_pages).flatMap((p) => (str(p, 40) ? [str(p, 40)!] : [])).slice(0, 5),
    topArea: str(o.top_area, 60),
    phoneShare: share(o.phone_share),
    busiest: str(o.busiest, 40),
    people,
  };
}

// ---- team sites -------------------------------------------------------------------------------------------------------

export interface TeamSiteAgent { userId: string; name: string; visits: number; signedIn: number; newLeads: number; minutesToReach: number | null }
export interface TeamSite {
  visits: number;
  signedIn: number;
  newLeads: number;
  avgMinutesToReach: number | null;
  agents: TeamSiteAgent[];
  toRoute: { contactId: string; name: string; line: string }[];
  topHomes: { address: string; views: number; saves: number; agent: string | null }[];
}

/** §3ar `GET team/site` (owner and admins; anyone else gets a 403 and sees nothing). */
export function readTeamSite(j: unknown): TeamSite | null {
  const o = obj(j);
  if (!o || !Array.isArray(o.agents)) return null;
  const agents: TeamSiteAgent[] = [];
  for (const x of o.agents) {
    const r = obj(x);
    const userId = r ? str(r.user_id, 64) : null;
    const name = r ? str(r.name, 80) : null;
    if (!r || !userId || !name || agents.some((a) => a.userId === userId)) continue;
    agents.push({ userId, name, visits: num(r.visits), signedIn: num(r.signed_in), newLeads: num(r.new_leads), minutesToReach: numOrNull(r.minutes_to_reach) });
    if (agents.length >= MAX_AGENTS) break;
  }
  agents.sort((a, b) => b.visits - a.visits);
  const toRoute: TeamSite["toRoute"] = [];
  for (const x of arr(o.to_route)) {
    const r = obj(x);
    const contactId = r ? id(r.contact_id) : null;
    const name = r ? str(r.name, 120) : null;
    if (!r || !contactId || !name || toRoute.some((t) => t.contactId === contactId)) continue;
    toRoute.push({ contactId, name, line: str(r.line, 200) ?? "" });
    if (toRoute.length >= MAX_ROUTE) break;
  }
  const topHomes: TeamSite["topHomes"] = [];
  for (const x of arr(o.top_homes)) {
    const r = obj(x);
    const address = r ? str(r.address, 120) : null;
    if (!r || !address) continue;
    topHomes.push({ address, views: num(r.views), saves: num(r.saves), agent: str(r.agent, 80) });
    if (topHomes.length >= MAX_TOP) break;
  }
  return { visits: num(o.visits), signedIn: num(o.signed_in), newLeads: num(o.new_leads), avgMinutesToReach: numOrNull(o.avg_minutes_to_reach), agents, toRoute, topHomes };
}

// ---- words and pictures -----------------------------------------------------------------------------------------------

/** Time on the site: "45s", "11m", "1h 42m". */
export function minutesWords(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
}

/** Time to reach a lead: "4 min", "1 h 10 m", or "none yet" when no lead was reached. */
export function reachWords(minutes: number | null): string {
  if (minutes == null) return "none yet";
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  return m % 60 ? `${Math.floor(m / 60)} h ${m % 60} m` : `${Math.floor(m / 60)} h`;
}

/** The team's goal: reach a new lead inside 15 minutes (VIP-SUMMARY §3ae). Slower, or none reached, earns a Nudge. */
export const REACH_GOAL = 15;
export const slowReach = (a: { minutesToReach: number | null; newLeads: number }) => (a.minutesToReach == null ? a.newLeads > 0 : a.minutesToReach > REACH_GOAL);

/** "up from 38m", "down from 2h", "new this month", or null when there is nothing to compare. */
export function trendWords(now: number, prev: number): string | null {
  if (!now && !prev) return null;
  if (!prev) return "new this month";
  if (Math.round(now / 60) === Math.round(prev / 60)) return "about the same";
  return `${now > prev ? "up" : "down"} from ${minutesWords(prev)}`;
}

/** "Just now", "12 min ago", "2h ago", "Yesterday", "Oct 20". */
export function agoWords(at: string | null, now: number = Date.now()): string {
  if (!at) return "Not yet";
  const t = Date.parse(at);
  if (Number.isNaN(t)) return "Not yet";
  const min = Math.max(0, Math.round((now - t) / 60000));
  if (min < 2) return "Just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  if (h < 48) return "Yesterday";
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "2:14 pm" in the viewer's own time. */
export function clockWords(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase().replace(/\s/g, " ");
}

export const dayWords = (at: string | null) => (at ? new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");

export const priceWords = (n: number | null) => (n == null ? null : `$${Math.round(n).toLocaleString("en-US")}`);

/** 14 days of visits as a sparkline: the line, the filled area under it, and the last point. Flat at the base when 0. */
export function sparkPath(pts: number[], w: number, h: number): { line: string; area: string; last: [number, number] } {
  const vals = pts.length ? pts.map((v) => (Number.isFinite(v) && v > 0 ? v : 0)) : [0];
  const series = vals.length === 1 ? [vals[0], vals[0]] : vals;
  const mx = Math.max(1, ...series);
  const step = w / (series.length - 1);
  const xy = series.map((v, i) => [i * step, h - 6 - (v / mx) * (h - 14)] as [number, number]);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return { line, area: `${line} L${w},${h} L0,${h} Z`, last: xy[xy.length - 1] };
}

/** The interest bar on "Homes they looked at most": each home's share of the most looked-at, 8-100%. */
export function interest(homes: SiteHome[]): number[] {
  const score = (h: SiteHome) => h.times * 60 + h.seconds + (h.saved ? 120 : 0);
  const top = Math.max(1, ...homes.map(score));
  return homes.map((h) => Math.max(8, Math.round((score(h) / top) * 100)));
}

/** The account box, line by line, in plain words. `ok` is green, false is the red "not yet". */
export function accountLines(a: SiteAccount, now: number = Date.now()): { label: string; words: string; ok: boolean; key: "website" | "app" | "room" | "emails" }[] {
  const app = a.app;
  return [
    { key: "website", label: "Website account", words: a.website ? (a.website.signedInAt ? `Signed in · ${agoWords(a.website.signedInAt, now)}` : "Has an account") : "No account yet", ok: !!a.website },
    { key: "app", label: "ONE Home app", words: app ? `Installed${app.platform ? ` · ${app.platform}` : ""}` : "Not installed", ok: !!app },
    { key: "room", label: "Client Room", words: a.room ? (a.room.openedAt ? `Opened ${dayWords(a.room.openedAt)}` : a.room.invitedAt ? `Invited ${dayWords(a.room.invitedAt)} · not opened` : "Not invited") : "Not invited", ok: !!a.room?.openedAt },
    { key: "emails", label: "New match emails", words: a.emails ? `${a.emails.cadence ? a.emails.cadence.replace(/^\w/, (c) => c.toUpperCase()) : "On"}${a.emails.openRate != null ? ` · opens ${Math.round(a.emails.openRate * 100)}%` : ""}` : "Off", ok: !!a.emails },
  ];
}

/** A text the agent sends themselves about one home (a draft only; nothing is sent from ONE). */
export const homeText = (first: string, address: string) => `Hi ${first}, I saw you looking at ${address}. Want to go see it? I can set up a showing.`;
export const siteText = (first: string) => `Hi ${first}, I saw you were looking at homes. Anything I can help with?`;

/** sms: and tel: links (digits only); null when there is no number. */
const digits = (p: string) => p.replace(/[^\d+]/g, "");
export const smsLink = (phone: string | null, body?: string) => (phone && /\d{7,}/.test(phone.replace(/\D/g, "")) ? `sms:${digits(phone)}${body ? `?&body=${encodeURIComponent(body)}` : ""}` : null);
export const mailLink = (email: string | null, subject: string, body: string) => (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : null);

export const HEAT_COLOR: Record<Heat, string> = { hot: "#ff5a5f", warm: "#f5c542", new: "#4aa3ff" };
export const heatWords = (h: Heat | null) => (h === "hot" ? "Hot" : h === "warm" ? "Warm" : h === "new" ? "New" : null);

/** "71% phone". */
export const phoneWords = (s: number | null) => (s == null ? null : `${Math.round(s * 100)}% phone`);

/** "2876 W Oak Hollow Ln, Bountiful" -> "OAK HOLLOW": the street's own name, big on the Top home tile. */
export function streetName(address: string): string {
  const street = address.split(",")[0].trim().replace(/^\d+[A-Za-z]?\s+/, "").replace(/^(W|E|N|S|NE|NW|SE|SW)\.?\s+/i, "").replace(/\s+(Ln|Lane|Dr|Drive|St|Street|Ave|Avenue|Rd|Road|Ct|Court|Way|Cir|Circle|Blvd|Pl|Place|Row)\.?$/i, "");
  return (street || address).toUpperCase();
}
