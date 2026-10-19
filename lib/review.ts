import { GROUP_TITLE, groupOf, weekWinsFrom, type Win, type WeekWinsLive } from "./wins.ts";
import { mondayOf } from "./habits.ts";
import { reportLine, unseen, type PulseReport } from "./pulseReport.ts";
import type { GraphEdge, GraphNode } from "./graph/types.ts";
import { MONTH_BOXES } from "./contact.ts";
import { audit } from "./audit.ts";
import { TEXT_MAX, type Commitments, type Draft } from "./commitments.ts";
import type { VipPerson, VipRoster } from "./vips.ts";

// Weekly Review in ONE YOU (PULSE-ROADMAP "ONE YOU"; Parry approved, 6 Oct): the week in one place on the
// desktop. The score against the 100 minimum, the VIP touches falling behind, the VIP-50 not reached this
// month, commitments kept, goal pace, and three things for next week that Pulse writes from those facts.
// Facts only: nothing here is sent to anyone, and Pulse never marks anything done.

export const REVIEW_NODE = "go-review";
export const WEEK_MINIMUM = 100; // Parry, 30 Sep: the weekly standard is 100 (was 150)

export type ReviewKey = "score" | "wins" | "pulse" | "touches" | "untouched" | "commitments" | "goals";
export type Level = "now" | "today" | null;

export interface Goal {
  label: string;
  line: string; // "3 of 12"
  behind: boolean;
  pace?: string | null; // "On pace for this point in the year: 4"
}

export interface ReviewIn {
  today: string; // YYYY-MM-DD, Mountain
  week: { score: number; minimum: number } | null;
  roster: VipRoster | null;
  commitments: Commitments | null;
  goals: Goal[];
  /** Wins (§3t), when ONE MOVE answers; the review shows this week's (PULSE-ROADMAP relationship #8). */
  wins?: Win[] | null;
  /** The year's count from the same Wins list the Wins orb shows (audit 3.4.2: one source for both). */
  winsYear?: number | null;
  /** This week's wins from ONE MOVE (`/api/brain/wins?week=this`), the Scoreboard's source; `wins` is the fallback. */
  weekWins?: WeekWinsLive | null;
  /** "Pulse did this" (LEADS §6.1), when ONE MOVE answers. */
  pulse?: PulseReport | null;
}

export interface Card {
  key: ReviewKey;
  title: string;
  big: string; // what the orb shows
  word: string; // the word inside the orb under the number (audit 3.3.4: words, not symbols)
  tag?: string; // a second short word when the number needs it ("LAST WEEK", "OF 60")
  line: string; // one line under it
  level: Level; // red now / yellow today / still green (null and good) — the pulse rule
  good: boolean;
  rows: Row[]; // the side panel
  /** What the agent does from this card (Parry, 19 Oct: "everything we do must have action available"): never a number alone. */
  action: Action;
}

/** What an action does: open an existing ONE MOVE page or Brain view, work through a list of people, or open one contact. */
export type Do =
  | { kind: "page"; path: string }
  | { kind: "view"; view: "goals" | "commitments" | "wins" }
  | { kind: "queue"; list: string; label: string } // "untouched", or a monthly touch key (call, video_text, ...)
  | { kind: "contact"; id: string; name: string };
export interface Action {
  label: string;
  do: Do;
}

/** A person the review names: the roster's own id (ONE MOVE contact), so the name can open that contact. */
export interface ContactRef {
  id: string;
  name: string;
}

/** One line in a card's side panel. A row about a person carries `contact`, and its name opens that contact. */
export interface Row {
  text: string;
  sub?: string;
  contact?: string;
  /** The person's name, for the contact's heading when `contact` opens. */
  name?: string;
  /** A monthly touch row: its key, and the VIP-50 who still need it this month (oldest touch first). */
  touch?: string;
  people?: ContactRef[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ref = (p: VipPerson): ContactRef => ({ id: p.id, name: p.name });

export interface Review {
  cards: Card[];
  next: string[]; // three things for next week (or the rest of this one), facts only
  nextTitle: string; // "Three things for the rest of this week" Mon-Thu, "... for next week" Fri-Sun
  /** The people each line of `next` names (same order), so the agent can open them and act. */
  nextPeople: ContactRef[][];
}

/** Monday to Thursday the three things are for the rest of this week; Friday to Sunday, for next week (Parry, 16 Oct,
 * audit 3.3.7). */
export function lateInWeek(today: string): boolean {
  const t = Date.parse(`${today}T12:00:00Z`);
  if (!Number.isFinite(t)) return true;
  const d = new Date(t).getUTCDay(); // 0 Sunday
  return d === 0 || d >= 5;
}
export const nextTitle = (today: string) => (lateInWeek(today) ? "Three things for next week" : "Three things for the rest of this week");

const first = (p: VipPerson) => (p.first_name?.trim() || p.name.split(/\s+/)[0] || p.name).slice(0, 30);
const names = (ps: VipPerson[], n = 3) => {
  const shown = ps.slice(0, n).map(first);
  const more = ps.length - shown.length;
  return more > 0 ? `${shown.join(", ")} and ${more} more` : shown.length > 1 ? `${shown.slice(0, -1).join(", ")} and ${shown.at(-1)}` : shown[0] ?? "";
};

/** How far through the month today is, 0..1 (a touch "falls behind" when it trails this). */
export function monthShare(today: string): number {
  const [y, m, d] = today.split("-").map(Number);
  if (!y || !m || !d) return 0;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Math.min(1, d / days);
}

/** Oldest last touch first; never-touched first of all. */
const byOldest = (a: VipPerson, b: VipPerson) => (a.last_touch_on ?? "").localeCompare(b.last_touch_on ?? "");

const ONE_OF: Record<string, string> = { Closings: "Closing", Referrals: "Referral", "Five-star reviews": "Five-star review", "Weeks at 100": "Week at 100", Badges: "Badge", "Goals reached": "Goal reached" };

export function review(i: ReviewIn): Review {
  const cards: Card[] = [];
  const next: string[] = [];
  const nextPeople: ContactRef[][] = [];
  const late = lateInWeek(i.today);

  // The weekly score against the minimum (daily + weekly tracker points; Parry, 30 Sep).
  if (i.week) {
    const { score, minimum } = i.week;
    const gap = Math.max(0, minimum - score);
    cards.push({
      key: "score",
      title: "Weekly score",
      big: String(score),
      word: "Score",
      line: gap ? `${gap} short of ${minimum}` : `Above the ${minimum} minimum`,
      level: gap ? "today" : null,
      good: !gap,
      action: { label: "Open today's tracker", do: { kind: "page", path: "/daily" } },
      rows: [
        { text: `${score} points this week`, sub: `The minimum is ${minimum}: daily tracker points plus the weekly bonus boxes.` },
        gap ? { text: `${gap} to go`, sub: "Each daily box and weekly bonus box counts toward it." } : { text: "Minimum reached", sub: "Everything above it is extra." },
      ],
    });
  }

  // VIP-50 touches this month: the ones falling behind the month, and who has had none at all.
  if (i.roster && i.roster.vip50.length) {
    const a = audit(i.roster);
    const share = monthShare(i.today);
    const month = a.touches.filter((t) => t.kind === "month");
    const behind = month.filter((t) => t.total && t.done / t.total < share).sort((x, y) => x.done / x.total - y.done / y.total);
    // Counts, not a percentage (Parry, 16 Oct, audit 3.3.3: "say it in counts").
    const done = month.reduce((n, t) => n + t.done, 0);
    const possible = month.reduce((n, t) => n + t.total, 0);
    cards.push({
      key: "touches",
      title: "VIP touches",
      big: String(done),
      word: "Touches",
      tag: `OF ${possible}`,
      line: `${done} of ${possible} touches this month${behind.length ? `. Behind the month: ${behind.map((t) => t.label).join(", ")}` : ", every touch keeping pace"}`,
      level: behind.length ? "today" : null,
      good: !behind.length,
      action: behind.length ? { label: `Work through ${behind[0].label.toLowerCase()}`, do: { kind: "queue", list: behind[0].key, label: behind[0].label } } : { label: "Open Touch Audit", do: { kind: "page", path: "/contacts/audit" } },
      rows: month.map((t) => ({
        touch: t.key,
        people: [...t.missing].sort(byOldest).map(ref),
        text: `${t.label}: ${t.done} of ${t.total}`,
        sub: t.total && t.done / t.total < share ? `Behind: ${Math.round(share * 100)}% of the month has gone` : "Keeping pace",
      })),
    });
    const none = i.roster.vip50.filter((p) => !MONTH_BOXES.some(([k]) => p.month?.[k])).sort(byOldest);
    cards.push({
      key: "untouched",
      title: "Not reached",
      big: String(none.length),
      word: "Not reached",
      line: none.length ? `VIP-50 with no touch this month` : "Every VIP-50 touched this month",
      level: none.length && share > 0.5 ? "now" : none.length ? "today" : null,
      good: !none.length,
      action: none.length ? { label: "Work through them", do: { kind: "queue", list: "untouched", label: "Not reached" } } : { label: "Open VIP Management", do: { kind: "page", path: "/contacts/vip" } },
      rows: none.map((p) => ({ text: p.name, contact: p.id, name: p.name, sub: p.last_touch_on ? `Last touch ${p.last_touch_on}` : "No touch on record" })),
    });
    if (none.length) {
      next.push(`Reach the ${none.length} VIP-50 you haven't touched this month, starting with ${names(none)}.`);
      nextPeople[next.length - 1] = none.slice(0, 3).map(ref);
    }
    const weakest = behind[0];
    if (weakest && next.length < 3) {
      const left = weakest.missing.length;
      const sample = [...weakest.missing].sort(byOldest);
      next.push(`${weakest.label}: ${left} of your VIP-50 still need one this month${left ? `, such as ${names(sample, 2)}` : ""}.`);
      nextPeople[next.length - 1] = sample.slice(0, 2).map(ref);
    }
  }

  // Commitments: this week's check-in when there is one, else last week's, always named (Parry, 16 Oct, audit 3.3.2:
  // "100%" was last week's keep rate inside a review of this week). The 8-week keep rate is in the rows.
  if (i.commitments) {
    const c = i.commitments;
    const items = c.week?.items ?? [];
    const checked = items.filter((it) => it.result);
    const tw = checked.length ? { kept: checked.filter((it) => it.result === "kept").length, partly: checked.filter((it) => it.result === "partly").length, missed: checked.filter((it) => it.result === "missed").length } : null;
    const lw = c.lastWeek;
    const shown = tw ?? lw;
    const n = shown ? shown.kept + shown.partly + shown.missed : 0;
    const when = tw ? "This week" : "Last week";
    const rate = c.keepRate8w;
    cards.push({
      key: "commitments",
      title: "Commitments",
      big: n ? `${shown!.kept}/${n}` : "–",
      word: "Kept",
      tag: n ? when.toUpperCase() : undefined,
      line: n ? `${when}: ${shown!.kept} kept, ${shown!.partly} partly, ${shown!.missed} missed` : "No week checked in yet",
      level: shown && shown.missed > shown.kept ? "today" : null,
      good: !!n && shown!.missed === 0,
      action: { label: !items.length ? "Set this week's commitments" : checked.length < items.length ? "Check in" : "Open commitments", do: { kind: "view", view: "commitments" } },
      rows: [
        rate != null ? { text: `You keep ${Math.round(rate * 100)}% of your commitments`, sub: "Over the last 8 weeks." } : { text: "No keep rate yet", sub: "It starts after your first check-in." },
        c.streak ? { text: `${c.streak}-week streak`, sub: "Weeks in a row you checked in." } : { text: "No streak yet" },
        ...items.map((it) => ({ text: it.text, sub: it.result ? `This week: ${it.result}` : "This week: not checked in" })),
      ],
    });
    if (shown && shown.missed && next.length < 3) next.push(`Set commitments you can keep: ${when.toLowerCase()} ${shown.missed} of ${n} were missed.`);
  }

  // Goals: pace for this point in the agent's own goal year.
  if (i.goals.length) {
    const behind = i.goals.filter((g) => g.behind);
    cards.push({
      key: "goals",
      title: "Goals",
      big: behind.length ? String(behind.length) : "On pace",
      word: "Goals",
      tag: behind.length ? "BEHIND PACE" : undefined,
      line: behind.length ? behind.map((g) => g.label).join(", ") : "Every goal is on pace",
      level: behind.length ? "today" : null,
      good: !behind.length,
      action: { label: "Open Goals", do: { kind: "view", view: "goals" } },
      rows: i.goals.map((g) => ({ text: `${g.label}: ${g.line}`, sub: g.pace ?? undefined })),
    });
    if (behind[0] && next.length < 3) next.push(`${behind[0].label} is behind pace (${behind[0].line}).`);
  }

  if (i.week && i.week.score < i.week.minimum && next.length < 3)
    next.push(late ? `Reach ${i.week.minimum} next week: this week is at ${i.week.score}.` : `Reach ${i.week.minimum} by Sunday: ${i.week.minimum - i.week.score} to go from ${i.week.score}.`);
  // This week's wins (§3t): good news only, never a pulse (Parry: "good news never nags").
  const thisWeeks = weekWinsFrom(i.weekWins, i.wins, i.today); // the Scoreboard's "This week's wins", one source
  if (thisWeeks) {
    // Only this week's wins; a review counts in the week it was written, never the week it was imported (Parry, 16 Oct,
    // audit 3.3.1: 35 imported reviews read as "Wins: 35").
    const { mine, imported } = thisWeeks;
    const by = new Map<string, number>();
    for (const w of mine) by.set(GROUP_TITLE[groupOf(w.kind)], (by.get(GROUP_TITLE[groupOf(w.kind)]) ?? 0) + 1);
    const at = cards.findIndex((c) => c.key === "score");
    cards.splice(at + 1, 0, {
      key: "wins",
      title: "Wins",
      big: String(mine.length),
      word: "Wins",
      tag: "THIS WEEK",
      line: mine.length ? `This week: ${[...by].map(([t, n]) => `${n} ${(n === 1 ? ONE_OF[t] ?? t : t).toLowerCase()}`).join(", ")}` : "None this week yet",
      level: null,
      good: mine.length > 0,
      action: { label: "See your Wins", do: { kind: "view", view: "wins" } },
      rows: [
        ...(mine.length ? mine.slice(0, 8).map((w) => ({ text: w.title, sub: w.detail ?? undefined })) : [{ text: "Log a closing or a referral in ONE MOVE and it shows here." }]),
        ...(imported.length
          ? [{ text: `${imported.length} ${imported.length === 1 ? "review" : "reviews"} brought in from other sites`, sub: "Not this week's wins: they count in the week they were written once ONE has that date. They are in your Wins." }]
          : []),
        ...(i.winsYear != null ? [{ text: `${i.winsYear} ${i.winsYear === 1 ? "win" : "wins"} this year`, sub: "From the same list as This week's wins on your Scoreboard." }] : []),
      ],
    });
  }
  // "Pulse did this" (LEADS §6.1): yellow only while a hand-back is unopened; held sends are listed with their reason.
  if (i.pulse) {
    const p = i.pulse;
    const open = unseen(p);
    const first = p.handbacks.find((h) => !h.seen && h.contactId && UUID.test(h.contactId));
    cards.push({
      key: "pulse",
      title: "Pulse did this",
      big: String(p.sent),
      word: "Pulse sent",
      line: reportLine(p),
      level: open ? "today" : null,
      good: !open,
      action: first ? { label: `Answer ${first.contact}`, do: { kind: "contact", id: first.contactId!, name: first.contact } } : { label: "Open Contacts", do: { kind: "page", path: "/contacts" } },
      rows: [
        { text: p.summary },
        ...p.handbacks.slice(0, 5).map((h): Row => ({ text: `Handed back: ${h.contact}, ${h.about.toLowerCase()}`, sub: h.excerpt ? `"${h.excerpt}"` : undefined, ...(h.contactId && UUID.test(h.contactId) ? { contact: h.contactId, name: h.contact } : {}) })),
        ...p.held.map((h) => ({ text: `Held back: ${h.words}`, sub: `${h.count} ${h.count === 1 ? "send" : "sends"}` })),
        ...p.autopilot.slice(0, 5).map((a) => ({ text: `Sent: ${a.contact} (${a.worker})`, sub: a.what ?? undefined })),
        ...(p.touches ? [{ text: p.touches }] : []),
      ],
    });
    if (open && next.length < 3) {
      const unopened = p.handbacks.filter((h) => !h.seen).slice(0, 3);
      next.push(`Answer what Pulse handed back: ${unopened.map((h) => h.contact).join(", ")}.`);
      nextPeople[next.length - 1] = unopened.filter((h) => h.contactId && UUID.test(h.contactId)).map((h) => ({ id: h.contactId!, name: h.contact }));
    }
    if (p.held.some((h) => /brokerage address/i.test(h.words)) && next.length < 3) next.push("Add your brokerage address in My Profile so your marketing emails can go out.");
  }
  if (!next.length) next.push(`Keep the same rhythm ${late ? "next week" : "for the rest of the week"}: every number above is on track.`);
  const shown = next.slice(0, 3);
  return { cards, next: shown, nextTitle: nextTitle(i.today), nextPeople: shown.map((_, k) => nextPeople[k] ?? []) };
}

/** ONE YOU's Weekly Review orb: pulses with the worst level among its cards. */
export function withReviewNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, r: Review | null): G {
  const go = g.nodes.find((n) => n.id === "go");
  const nodes = g.nodes.filter((n) => n.id !== REVIEW_NODE);
  const edges = g.edges.filter((e) => e.target !== REVIEW_NODE);
  if (!go || go.locked || !r || !r.cards.length) return { ...g, nodes, edges };
  const now = r.cards.filter((c) => c.level === "now").length;
  const today = r.cards.filter((c) => c.level === "today").length;
  nodes.push({
    id: REVIEW_NODE,
    type: "feature",
    label: "Weekly Review",
    secondaryLabel: now + today ? `${now + today} ${now + today === 1 ? "thing needs" : "things need"} you` : "Your week is on track",
    parentId: "go",
    product: "go",
    importance: 1.03,
    status: now ? "action" : today ? "attention" : "healthy",
    summary: "Your week in one place: score, VIP touches, who you haven't reached, commitments and goals, and three things for next week.",
  });
  edges.push({ id: `go>${REVIEW_NODE}`, source: "go", target: REVIEW_NODE, relationshipType: "belongs_to", strength: 1 });
  return { ...g, nodes, edges };
}

/** Goals for the review, from ONE YOU's goal orbs (live.ts builds them from vip_summary). */
export function goalsFromGraph(nodes: GraphNode[]): Goal[] {
  return nodes
    .filter((n) => n.parentId === "go-goals" && n.type === "goal" && n.secondaryLabel && n.secondaryLabel !== "No goal set")
    .map((n) => ({ label: n.label, line: n.secondaryLabel!, behind: n.status === "attention", pace: n.pace?.headline ?? null }));
}

/** The demo agent's week, so the sales demo shows a review. */
export function demoRoster(): VipRoster {
  const names = ["Jen Alvarez", "Marcus Lee", "Amy Chen", "Dave Kim", "Sara Ortiz", "Tom Price", "Lena Brooks", "Raj Patel", "Mia Stone", "Cole Hart", "Ana Ruiz", "Ben Fox"];
  const vip50: VipPerson[] = names.map((name, k) => ({
    id: `00000000-0000-4000-8000-${String(k).padStart(12, "0")}`,
    name,
    month: k < 3 ? ({} as Record<string, boolean>) : { call: k % 2 === 0, video_text: k % 3 !== 0, social: true, newsletter: k > 6, mixer: false },
    last_touch_on: k < 3 ? `2026-08-${10 + k}` : `2026-10-0${1 + (k % 5)}`,
  }));
  return { cap: 75, vip50, vip100: [] };
}

/** One of the Weekly Review's "Three things for next week" (Parry, 16 Oct): Pulse's one focus first (from the 8-week
 * read), then the review's own; each carries the commitment it would become on the agent's tap. */
export interface Thing {
  text: string;
  /** People this line names; each opens that contact. */
  people?: ContactRef[];
  why?: string;
  draft: Draft;
  focus: boolean;
}

export function nextThings(r: Review, focus: (Draft & { why: string }) | null): Thing[] {
  const out: Thing[] = [];
  if (focus) out.push({ text: focus.text, why: focus.why, draft: { text: focus.text.slice(0, TEXT_MAX), kind: focus.kind, target: focus.target }, focus: true });
  for (const [k, t] of r.next.entries()) {
    if (out.length >= 3) break;
    // "Keep the same rhythm" is not a commitment to add once there is a focus
    if (focus && /^Keep the same rhythm/.test(t)) continue;
    out.push({ text: t, people: r.nextPeople?.[k] ?? [], draft: { text: t.replace(/\.$/, "").slice(0, TEXT_MAX), kind: "yes_no", target: null }, focus: false });
  }
  return out.slice(0, 3);
}
