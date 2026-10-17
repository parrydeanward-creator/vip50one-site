import { goHref, productLink, type SignInProduct } from "./productSignIn.ts";
import type { NodeStatus, Stat } from "./graph/types.ts";

// VIP-SUMMARY §3ai (v1.80, 17 Oct; Parry, 16 Oct: "marquee, open and showly could go deeper and show more features and
// what each tool actually does"). Opening Marquee, ONE Open or Showly shows its tools as child orbs, each with a filled
// side panel: the product's real data, else its labelled example ("Example"). Pure: no fetching, no secrets.
//
// Every link goes through the one sign-in hop (`/go/<product>?next=<path>`, ENTITLEMENT §6b), never a product's own
// sign-in page. Nothing here names a client beyond a first name (and a last initial for ONE Open visitors): every name
// that arrives is cut down again here, whatever the product sent.

export type ToolProduct = "marquee" | "open" | "showly";

export interface ToolRow {
  id: string;
  label: string;
  sub?: string;
  // Follow the pulse: "action" right now (red), "attention" today (yellow). Never on an example.
  status?: NodeStatus;
  href?: string;
  type?: "property" | "person" | "task" | "feature";
}

export interface ToolOrb {
  id: string; // `<product>-tool-<key>`
  key: string;
  product: ToolProduct;
  label: string;
  sub: string;
  summary: string; // what the tool does, then what it holds now
  stats?: Stat[];
  href: string; // the tool's page, through the hop
  example: boolean; // true: the rows are the product's labelled example, not the agent's
  rows: ToolRow[];
  // vip_summary item kinds whose items sit inside this tool (they keep their own pulse).
  kinds: string[];
}

const HOP: Record<ToolProduct, SignInProduct> = { marquee: "marquee", open: "vip-open", showly: "showly" };

export const toolId = (p: ToolProduct, key: string) => `${p}-tool-${key}`;

/** The hop for a product link that arrives as data: a full https address on the product's host, or a path. */
export function toolHref(p: ToolProduct, url: unknown, fallback = "/"): string {
  if (typeof url === "string" && url.startsWith("/") && !url.startsWith("//")) return goHref(HOP[p], url);
  if (typeof url === "string") {
    const h = productLink(url);
    // only that product's own host goes through; anything else falls back to the tool's own page
    if (typeof h === "string" && h.startsWith(`/go/${HOP[p]}?`)) return h;
  }
  return goHref(HOP[p], fallback);
}

// ---- people's names, cut down ---------------------------------------------

/** A first name only: the first word, never an email, at most 30 characters. */
export function firstOnly(v: unknown): string | null {
  if (typeof v !== "string" || v.includes("@")) return null;
  const w = v.trim().split(/\s+/)[0] ?? "";
  const clean = w.replace(/[^\p{L}'-]/gu, "").slice(0, 30);
  return clean || null;
}

/** "Sam R": a first name and one capital letter, never more (ONE Open visitors only). */
export function firstAndInitial(v: unknown): string | null {
  if (typeof v !== "string" || v.includes("@")) return null;
  const [a, b] = v.trim().split(/\s+/);
  const first = firstOnly(a);
  if (!first) return null;
  const init = (b ?? "").replace(/[^\p{L}]/gu, "").charAt(0).toUpperCase();
  return init ? `${first} ${init}` : first;
}

// ---- small helpers --------------------------------------------------------

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.round(v)) : null);
const str = (v: unknown, max = 120): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const arr = (v: unknown): Record<string, unknown>[] | null => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : null);
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const street = (a: unknown) => str(a)?.split(",")[0].trim() ?? null;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const valid = (iso: unknown): iso is string => typeof iso === "string" && !Number.isNaN(Date.parse(iso));

/** "Sat 18 Oct, 10:00 AM" in Mountain time. */
export function whenWords(iso: string): string {
  const d = new Date(iso);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", ...o }).format(d);
  return `${f({ weekday: "short" })} ${f({ day: "numeric" })} ${f({ month: "short" })}, ${f({ hour: "numeric", minute: "2-digit" })}`;
}
/** "13 Oct" in Mountain time. */
export function dayWords(iso: string): string {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T18:00:00Z` : iso);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", ...o }).format(d);
  return `${f({ day: "numeric" })} ${f({ month: "short" })}`;
}
const ymdOf = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date(iso));

const exampleRows = (p: ToolProduct, key: string, lines: [string, string?][]): ToolRow[] =>
  lines.map(([label, sub], i) => ({ id: `${toolId(p, key)}:example:${i}`, label, sub: sub ? `Example · ${sub}` : "Example", type: "feature" }));

function orb(p: ToolProduct, key: string, label: string, does: string, o: Partial<ToolOrb> & { sub: string; path: string; link?: unknown }): ToolOrb {
  const example = !!o.example;
  const now = o.summary ? ` ${o.summary}` : "";
  return {
    id: toolId(p, key),
    key,
    product: p,
    label,
    sub: example ? `Example · ${o.sub}` : o.sub,
    summary: example ? `${does} Example: what this looks like once you use it.${now}` : `${does}${now}`,
    stats: o.stats,
    href: toolHref(p, o.link, o.path),
    example,
    rows: o.rows ?? [],
    kinds: o.kinds ?? [],
  };
}

// ---- ONE Open (live: vip_open_tools, migration 076) ---------------------------

const PHASE: Record<string, string> = { plan: "Plan", prepare: "Prepare", host: "Host", follow_up: "Follow Up" };
const OPEN_KEYS = ["open_houses", "visitors", "questions", "reports", "scorecard", "safety"] as const;

/** ONE Open's six tools from `vip_open_tools` (`tools` array). `answer` null: not asked or no answer, so every tool
 * shows ONE Open's own labelled example. `now` for "this question is fresh". */
export function openToolOrbs(answer: unknown, now = new Date()): ToolOrb[] {
  const env = obj(answer);
  const list = env?.found === true ? arr(env.tools) ?? [] : [];
  const byKey = new Map(list.map((t) => [String(t.key), t]));
  return OPEN_KEYS.map((key) => openTool(key, byKey.get(key) ?? null, now));
}

function openTool(key: (typeof OPEN_KEYS)[number], t: Record<string, unknown> | null, now: Date): ToolOrb {
  const ex = obj(t?.example);
  const example = !t || !!ex;
  const src = ex ?? t ?? obj(OPEN_EXAMPLE[key])!;
  const link = t?.link;
  const p = "open" as const;
  const items = arr(src.items) ?? [];
  const live = !example;
  if (key === "open_houses") {
    const by = obj(t?.by_phase);
    const count = num(t?.count) ?? 0;
    const rows: ToolRow[] = items.slice(0, 8).flatMap((h, i) => {
      const addr = street(h.address);
      if (!addr) return [];
      const visitors = num(h.visitors);
      const left = num(h.tasks_left);
      const sub = [
        PHASE[String(h.phase)] ?? null,
        valid(h.starts_at) ? whenWords(h.starts_at) : null,
        visitors != null ? plural(visitors, "visitor") : null,
        left ? `${plural(left, "task")} left` : left === 0 ? "No tasks left" : null,
        h.cohosting === true ? "Co-hosting" : null,
      ].filter(Boolean).join(" · ");
      return [{ id: `${toolId(p, key)}:${i}`, label: addr, sub: live ? sub : `Example · ${sub}`, type: "property" as const, href: live ? toolHref(p, h.link, "/app") : undefined }];
    });
    const phases = by ? (["plan", "prepare", "host", "follow_up"] as const).map((k) => ({ label: PHASE[k], value: String(num(by[k]) ?? 0) })) : undefined;
    return orb(p, key, "Open houses", "Every open house through the four phases: Plan, Prepare, Host and Follow Up, with each phase's checklist.", {
      sub: live ? (count ? plural(count, "open house") : "None coming") : "2 open houses",
      stats: live ? phases : undefined,
      rows,
      link,
      path: "/app",
      example,
      kinds: ["open_house", "prep"],
    });
  }
  if (key === "visitors") {
    const count = num(t?.count) ?? 0, can = num(t?.contactable) ?? 0, hot = num(t?.hot) ?? 0;
    const rows: ToolRow[] = items.slice(0, 8).flatMap((v, i) => {
      const name = firstAndInitial(v.name);
      if (!name) return [];
      const rating = num(v.rating);
      const sub = [street(v.address), rating ? `${rating} of 5 stars` : "Not rated", v.hot === true ? "Hot" : null, v.has_agent === true ? "Has an agent" : null].filter(Boolean).join(" · ");
      return [{ id: `${toolId(p, key)}:${i}`, label: name, sub: live ? sub : `Example · ${sub}`, type: "person" as const }];
    });
    return orb(p, key, "Visitors", "Everyone who signed in at your open houses: rate them, mark the hot ones and follow up. They are in ONE MOVE, tagged by open house.", {
      sub: live ? (count ? `${plural(count, "visitor")} in 30 days` : "None in 30 days") : "14 visitors",
      stats: live ? [{ label: "Signed in, 30 days", value: String(count) }, { label: "Can be contacted", value: String(can) }, { label: "Hot", value: String(hot) }] : undefined,
      rows,
      link,
      path: "/app/visitors",
      example,
      kinds: ["visitor_rating"],
    });
  }
  if (key === "questions") {
    const unanswered = num(t?.unanswered) ?? 0;
    const fresh = now.getTime() - 7 * 86400000;
    const sorted = [...items].sort((a, b) => Number(a.answered === true) - Number(b.answered === true));
    const rows: ToolRow[] = sorted.slice(0, 8).flatMap((q, i) => {
      const words = str(q.question, 90);
      if (!words) return [];
      const open = q.answered !== true;
      const sub = [str(q.room, 40), open ? "Not answered yet" : "Answered", valid(q.asked_at) ? `Asked ${dayWords(q.asked_at)}` : null].filter(Boolean).join(" · ");
      // a fresh question waiting on the agent pulses yellow (today)
      const status: NodeStatus | undefined = live && open && valid(q.asked_at) && Date.parse(q.asked_at) >= fresh ? "attention" : undefined;
      return [{ id: `${toolId(p, key)}:${i}`, label: words, sub: live ? sub : `Example · ${sub}`, status, type: "task" as const }];
    });
    return orb(p, key, "Questions", "What buyers asked about the home, room by room, from the sign-in and the room pages. Unanswered first.", {
      sub: live ? (unanswered ? `${unanswered} not answered` : "All answered") : "1 not answered",
      stats: live ? [{ label: "Asked, 30 days", value: String(num(t?.count) ?? 0) }, { label: "Not answered", value: String(unanswered) }] : undefined,
      rows,
      link,
      path: "/app/questions",
      example,
    });
  }
  if (key === "reports") {
    const rows: ToolRow[] = items.slice(0, 8).flatMap((r, i) => {
      const addr = street(r.address);
      if (!addr) return [];
      const buyers = num(r.buyer_reports_sent) ?? 0;
      const sub = [r.seller_report_sent === true ? "Seller report sent" : "Seller report not sent", r.seller_recap_ready === true ? "Seller recap ready" : null, `${plural(buyers, "buyer report")} sent`].filter(Boolean).join(" · ");
      return [{ id: `${toolId(p, key)}:${i}`, label: addr, sub: live ? sub : `Example · ${sub}`, type: "property" as const, href: live ? toolHref(p, r.link, "/app/events") : undefined }];
    });
    const count = num(t?.count) ?? 0;
    return orb(p, key, "Reports", "After each open house: the seller report for the listing agent, the seller recap, and a buyer report for each visitor.", {
      sub: live ? (count ? `${plural(count, "open house")} in 30 days` : "None in 30 days") : "1 open house",
      rows,
      link,
      path: "/app/events",
      example,
    });
  }
  if (key === "scorecard") {
    const n = (k: string) => String(num(src[k]) ?? 0);
    return orb(p, key, "Scorecard", "Your business-building machine over the last 30 days: open houses to sign-ins to contacts to appointments to clients.", {
      sub: live ? `${n("sign_ins")} sign-ins in 30 days` : "23 sign-ins",
      stats: [{ label: "Open houses", value: n("open_houses") }, { label: "Sign-ins", value: n("sign_ins") }, { label: "Contacts", value: n("contacts") }, { label: "Appointments", value: n("appointments") }, { label: "Clients", value: n("clients") }],
      link,
      path: "/app/scorecard",
      example,
    });
  }
  // safety
  const active = src.active === true;
  const panic = live && t?.panic === true;
  const rows: ToolRow[] = [];
  if (live && active) {
    rows.push({
      id: `${toolId(p, key)}:now`,
      label: panic ? "Panic alert sent" : "Check-in running",
      sub: [valid(t?.started_at) ? `Started ${whenWords(t!.started_at as string)}` : null, valid(t?.expected_end_at) ? `Check out by ${whenWords(t!.expected_end_at as string).split(", ")[1]}` : null].filter(Boolean).join(" · ") || undefined,
      status: panic ? "action" : "attention",
      type: "task",
    });
  } else if (example) {
    rows.push(...exampleRows(p, key, [["Check-in running", str(src.buddy) ?? "Your buddy gets a text if you do not check out on time"]]));
  }
  return orb(p, key, "Safety", "Start a check-in when you host: your buddy is told if you do not check out on time, and the panic button alerts them at once.", {
    sub: live ? (panic ? "Panic alert" : active ? "Check-in on now" : "No check-in running") : "Check-in on",
    rows,
    link,
    path: "/app/safety",
    example,
    kinds: ["safety"],
  });
}

// ONE Open's own examples (as vip_open_tools sends them), for when ONE Open did not answer the tools call.
const OPEN_EXAMPLE: Record<(typeof OPEN_KEYS)[number], Record<string, unknown>> = {
  open_houses: { items: [{ address: "123 Example Lane", phase: "prepare", visitors: 0, tasks_left: 6 }, { address: "45 Sample Court", phase: "follow_up", visitors: 14, tasks_left: 2 }] },
  visitors: { items: [{ name: "Sam R", address: "45 Sample Court", rating: 3, hot: true }, { name: "Lee T", address: "45 Sample Court", rating: 2, hot: false }] },
  questions: { items: [{ question: "How old is the roof?", room: "Kitchen", answered: false }] },
  reports: { items: [{ address: "45 Sample Court", seller_report_sent: true, seller_recap_ready: true, buyer_reports_sent: 9 }] },
  scorecard: { open_houses: 2, sign_ins: 23, contacts: 19, appointments: 3, clients: 1 },
  safety: { active: true, buddy: "Your buddy gets a text if you do not check out on time" },
};

// ---- Marquee -----------------------------------------------------------------

// Any product's vip_summary answer (lib/live.ts SummaryEnvelope), read field by field.
type LooseEnv = object;
const field = (env: LooseEnv | null | undefined, k: string): unknown => (env ? (env as Record<string, unknown>)[k] : undefined);
const statOf = (env: LooseEnv | null | undefined, key: string) =>
  (arr(field(env, "stats")) ?? []).find((s) => s.key === key) as { key: string; value?: unknown } | undefined;

const REPORT_STATE: Record<string, string> = { asked: "waiting on your six answers", answered: "answers in, ready to send", sent: "sent", skipped: "skipped" };
const DECK_KIND: Record<string, string> = { appointment: "Listing appointment", marketing: "Marketing packet" };
const DECK_STATE: Record<string, string> = { building: "being built", review: "ready for you to review", approved: "approved" };
const NET: Record<string, string> = { instagram: "Instagram", facebook: "Facebook" };

/** Marquee's six tools from its vip_summary answer (null: the demo, every tool its labelled example). Listings and
 * Posts waiting hold vip_summary's own listing and approval items; the Brain adds those (lib/live.ts). */
export function marqueeToolOrbs(env: LooseEnv | null, today: string): ToolOrb[] {
  const p = "marquee" as const;
  const listings = arr(field(env, "listings"));
  const posts = arr(field(env, "posts"));
  const reports = arr(field(env, "reports"));
  const decks = arr(field(env, "presentations"));
  const rooms = arr(field(env, "room_cards"));
  const waiting = num(statOf(env, "approvals_waiting")?.value);
  const active = num(statOf(env, "active_listings")?.value);

  const listingsOrb = orb(p, "listings", "Listings", "Every listing's marketing in one place: live, under contract and recently closed, each with its campaign.", {
    sub: listings ? (listings.length ? plural(listings.length, "home") : "No listings yet") : "1 home",
    stats: active != null ? [{ label: "Active listings", value: String(active) }] : undefined,
    rows: listings ? [] : exampleRows(p, "listings", [["123 Example Lane", "Live · 5 days on market"]]),
    path: "/",
    example: !listings,
  });

  // Calendar: what posted and what is scheduled, coming first.
  const cal = (posts ?? []).filter((x) => valid(x.at) && (x.state === "sent" || x.state === "scheduled") && street(x.address));
  const upcoming = cal.filter((x) => ymdOf(x.at as string) >= today).sort((a, b) => Date.parse(a.at as string) - Date.parse(b.at as string));
  const past = cal.filter((x) => ymdOf(x.at as string) < today).sort((a, b) => Date.parse(b.at as string) - Date.parse(a.at as string));
  const calRows: ToolRow[] = [...upcoming, ...past].slice(0, 8).map((x, i) => ({
    id: `${toolId(p, "calendar")}:${i}`,
    label: street(x.address)!,
    sub: [NET[String(x.channel)] ?? "Social", dayWords(x.at as string), x.state === "sent" ? "Posted" : "Scheduled"].join(" · "),
    type: "feature",
  }));
  const calendarOrb = orb(p, "calendar", "Calendar", "Every piece's posting day across your listings. Nothing posts unless you approved it and switched on scheduled posting.", {
    sub: posts ? (upcoming.length ? `${upcoming.length} scheduled` : "Nothing scheduled") : "3 scheduled",
    rows: posts ? calRows : exampleRows(p, "calendar", [["123 Example Lane", "Instagram · Thu · Scheduled"], ["123 Example Lane", "Facebook · Fri · Scheduled"], ["123 Example Lane", "Instagram · Sat · Scheduled"]]),
    path: "/",
    example: !posts,
  });

  const postsOrb = orb(p, "posts", "Posts waiting", "The pieces Marquee built that wait for your approval. Nothing posts until you approve it.", {
    sub: waiting != null ? (waiting ? `${waiting} to approve` : "Nothing waiting") : "5 to approve",
    stats: waiting != null ? [{ label: "Waiting for approval", value: String(waiting) }] : undefined,
    rows: waiting != null ? [] : exampleRows(p, "posts", [["5 pieces for 123 Example Lane", "Approve by Wed"]]),
    path: "/",
    example: waiting == null,
    kinds: ["approval"],
  });

  const repRows: ToolRow[] = (reports ?? []).slice(0, 40).flatMap((r, i) => {
    const s = street(r.street);
    if (!s) return [];
    const week = num(r.week);
    const state = String(r.state);
    const words = state === "sent" && valid(r.sent_at) ? `sent ${dayWords(r.sent_at)}` : REPORT_STATE[state] ?? null;
    return [{ id: `${toolId(p, "reports")}:${i}`, label: s, sub: [week != null ? `Week ${week}` : null, words].filter(Boolean).join(" ") || undefined, status: state === "asked" ? ("attention" as const) : undefined, href: toolHref(p, r.url), type: "property" as const }];
  });
  const asked = repRows.filter((r) => r.status).length;
  const reportsOrb = orb(p, "reports", "Seller reports", "Every week: answer six questions, then Marquee sends your seller their report.", {
    sub: reports ? (asked ? `${asked} waiting on you` : reports.length ? "Up to date" : "None yet") : "Week 3 waiting",
    rows: reports ? repRows : exampleRows(p, "reports", [["Week 2", "Sent 13 Oct"], ["Week 3", "Waiting on your six answers"]]),
    path: "/",
    example: !reports,
    kinds: ["report"],
  });

  const deckRows: ToolRow[] = (decks ?? []).slice(0, 20).flatMap((d, i) => {
    const s = street(d.street);
    if (!s) return [];
    const pages = num(d.pages);
    return [{
      id: `${toolId(p, "presentations")}:${i}`,
      label: s,
      sub: [DECK_KIND[String(d.kind)] ?? "Presentation", pages ? `${pages} pages` : null, DECK_STATE[String(d.state)] ?? null].filter(Boolean).join(" · "),
      status: d.state === "review" ? ("attention" as const) : undefined,
      href: toolHref(p, d.url),
      type: "property" as const,
    }];
  });
  const review = deckRows.filter((r) => r.status).length;
  const decksOrb = orb(p, "presentations", "Presentations", "Your listing appointment presentation (8 pages) and the marketing packet (12 pages), built for each home.", {
    sub: decks ? (review ? `${review} to review` : decks.length ? plural(decks.length, "presentation") : "None yet") : "2 presentations",
    rows: decks ? deckRows : exampleRows(p, "presentations", [["Listing appointment", "8 pages · ready"], ["Marketing packet", "12 pages · approved"]]),
    path: "/",
    example: !decks,
  });

  const roomRows: ToolRow[] = (rooms ?? []).slice(0, 20).flatMap((r, i) => {
    const s = street(r.street);
    if (!s) return [];
    const total = num(r.rooms), written = num(r.written);
    return [{ id: `${toolId(p, "room_cards")}:${i}`, label: s, sub: total != null && written != null ? `${written} of ${total} rooms written` : undefined, href: toolHref(p, r.url), type: "property" as const }];
  });
  const roomsOrb = orb(p, "room_cards", "Room cards", "A card for each room of the home, written for the open house and the listing's room pages.", {
    sub: rooms ? (rooms.length ? plural(rooms.length, "home") : "None yet") : "6 of 7 written",
    rows: rooms ? roomRows : exampleRows(p, "room_cards", [["123 Example Lane", "6 of 7 rooms written"]]),
    path: "/",
    example: !rooms,
  });

  return [listingsOrb, calendarOrb, postsOrb, reportsOrb, decksOrb, roomsOrb];
}

// ---- Showly ------------------------------------------------------------------

/** Showly's four tools from its vip_summary answer (null: the demo, every tool its labelled example). Buyer answers
 * and Lender hold vip_summary's own reaction and approval items; the Brain adds those (lib/live.ts). */
export function showlyToolOrbs(env: LooseEnv | null, today: string): ToolOrb[] {
  const p = "showly" as const;
  const tours = arr(field(env, "tours"));
  const recaps = arr(field(env, "recaps"));
  const lender = obj(field(env, "lender"));
  const answers = num(statOf(env, "new_answers")?.value);
  const week = num(statOf(env, "tours_this_week")?.value);
  const back = num(statOf(env, "letters_back")?.value);

  const tourRows: ToolRow[] = (tours ?? []).slice(0, 20).flatMap((t, i) => {
    const who = firstOnly(t.buyer_first) ?? "Your buyer";
    const homes = num(t.homes);
    const when = valid(t.when) ? whenWords(t.when) : null;
    // a tour already shown (today or before) with no recap sent yet: today's job
    const due = t.sent !== true && valid(t.when) && ymdOf(t.when) <= today;
    return [{
      id: `${toolId(p, "tours")}:${i}`,
      label: who,
      sub: [homes != null ? plural(homes, "home") : null, when, t.sent === true ? "Recap sent" : "Recap not sent"].filter(Boolean).join(" · "),
      status: due ? ("attention" as const) : undefined,
      href: toolHref(p, t.link, "/app"),
      type: "person" as const,
    }];
  });
  const toursOrb = orb(p, "tours", "Tours", "One tour per showing day: capture each home with photos and a voice note, then build the recap and send it.", {
    sub: tours ? (tours.length ? plural(tours.length, "tour") + " in 60 days" : "No tours yet") : "1 tour",
    stats: week != null ? [{ label: "Tours this week", value: String(week) }] : undefined,
    rows: tours ? tourRows : exampleRows(p, "tours", [["Dana", "4 homes · Sat 10:00 · recap sent"]]),
    path: "/app",
    example: !tours,
  });

  const answersOrb = orb(p, "answers", "Buyer answers", "Your buyers answer Yes, Maybe or No on each home, with a note, the moment they open the recap.", {
    sub: answers != null ? (answers ? `${plural(answers, "home")} answered, 7 days` : "No new answers") : "2 Yes",
    stats: answers != null ? [{ label: "New answers, 7 days", value: String(answers) }] : undefined,
    rows: answers != null ? [] : exampleRows(p, "answers", [["Dana", "Yes on 2 homes · Maybe on 1"]]),
    path: "/app",
    example: answers == null,
    kinds: ["reaction"],
  });

  const recapRows: ToolRow[] = (recaps ?? []).slice(0, 20).flatMap((r, i) => {
    const who = firstOnly(r.buyer_first) ?? "Your buyer";
    const views = num(r.views), answered = num(r.answered), homes = num(r.homes), yes = num(r.yes);
    return [{
      id: `${toolId(p, "recaps")}:${i}`,
      label: who,
      sub: [valid(r.sent_at) ? `Sent ${dayWords(r.sent_at)}` : null, views != null ? `viewed ${views === 1 ? "once" : `${views} times`}` : null, answered != null && homes != null ? `${answered} of ${homes} homes answered` : null, yes ? `${yes} Yes` : null].filter(Boolean).join(" · "),
      href: toolHref(p, r.link, "/app"),
      type: "person" as const,
    }];
  });
  const recapsOrb = orb(p, "recaps", "Recaps", "The tour recap your buyer opens on their phone: every home, your notes for them, and Yes, Maybe or No.", {
    sub: recaps ? (recaps.length ? plural(recaps.length, "recap") : "None sent yet") : "Viewed 3 times",
    rows: recaps ? recapRows : exampleRows(p, "recaps", [["Dana", "Sent Sat · viewed 3 times · 2 of 4 homes answered"]]),
    path: "/app",
    example: !recaps,
  });

  const connected = lender ? lender.connected === true : null;
  const lo = lender ? str(lender.lo_name, 60) : null;
  const waitingLetters = lender ? num(lender.requests_waiting) : null;
  const lenderOrb = orb(p, "lender", "Lender", "Your loan officer on every recap: ask for a pre-approval letter for any home and see the moment it is ready. They never see your notes.", {
    sub: connected === false ? "Not connected" : connected ? (lo ? `${lo} · connected` : "Connected") : back != null ? (back ? `${plural(back, "letter")} back, 14 days` : "No letters back") : "Not connected",
    stats: [
      back != null ? { label: "Letters back, 14 days", value: String(back) } : null,
      waitingLetters != null ? { label: "Requests waiting", value: String(waitingLetters) } : null,
    ].filter((x): x is Stat => !!x),
    rows: lender || back != null ? (connected === false ? [{ id: `${toolId(p, "lender")}:connect`, label: "Connect your loan officer", sub: "Letters for each home in minutes", type: "feature" }] : []) : exampleRows(p, "lender", [["Connect your loan officer", "Letters for each home in minutes"]]),
    link: lender?.link,
    path: "/app",
    example: !lender && back == null,
    kinds: ["approval"],
  });

  return [toursOrb, answersOrb, recapsOrb, lenderOrb];
}

/** The tool orbs for a product. `openTools`: ONE Open's vip_open_tools answer. */
export function productToolOrbs(p: ToolProduct, env: LooseEnv | null, today: string, openTools?: unknown, now = new Date()): ToolOrb[] {
  if (p === "open") return openToolOrbs(openTools ?? null, now);
  if (p === "marquee") return marqueeToolOrbs(env, today);
  return showlyToolOrbs(env, today);
}

/** Which tool a vip_summary item of this kind sits in, if any. */
export function toolForKind(tools: ToolOrb[], kind: string): ToolOrb | undefined {
  return tools.find((t) => t.kinds.includes(kind));
}
