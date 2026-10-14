// A closing travels everywhere (CONNECTIONS §5.4, agreed 14 Oct; MASTER closed_homes, vip50-web-crm#236). One
// "Closed: <street>" card per home closed in the last 90 days, read from ONE MOVE's GET /api/brain/closed. Every step
// waits for the agent's tap; the review is a draft the agent sends from their own phone or email, and the Results wall
// shows a sale only with the client's recorded yes. `auto` steps (Move-likely watch, off the for-sale pages) show
// ticked, with no button.

export const closedUrl = "https://move.vip50one.com/api/brain/closed";

export const STEP_KEYS = ["goal", "past_clients", "review", "results_wall", "move_watch", "off_sale"] as const;
export type StepKey = (typeof STEP_KEYS)[number];
export interface ClosedStep { key: StepKey; label: string; done: boolean; auto: boolean; ready: boolean; note: string | null }
export interface ClosedHome {
  id: string;
  title: string;
  address: string | null;
  closedOn: string | null;
  side: string | null;
  price: number | null;
  sources: string[];
  steps: ClosedStep[];
}
export interface ReviewDraft { text: string; email: string | null; phone: string | null }

const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const isKey = (v: unknown): v is StepKey => (STEP_KEYS as readonly unknown[]).includes(v);

function readHome(x: unknown): ClosedHome | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  const id = str(r.id, 60);
  if (!id || !Array.isArray(r.steps)) return null;
  const seen = new Set<StepKey>();
  const steps: ClosedStep[] = [];
  for (const s of r.steps as Record<string, unknown>[]) {
    if (!s || !isKey(s.key) || seen.has(s.key)) continue;
    seen.add(s.key);
    steps.push({ key: s.key, label: str(s.label, 120) ?? s.key, done: s.done === true, auto: s.auto === true, ready: s.ready !== false, note: str(s.note, 160) });
  }
  steps.sort((a, b) => STEP_KEYS.indexOf(a.key) - STEP_KEYS.indexOf(b.key));
  const address = str(r.address, 160);
  const price = typeof r.price === "number" && Number.isFinite(r.price) && r.price > 0 ? r.price : null;
  return {
    id,
    title: str(r.title, 160) ?? (address ? `Closed: ${address.split(",")[0]}` : "Closed"),
    address,
    closedOn: str(r.closed_on, 10),
    side: str(r.side, 20),
    price,
    sources: Array.isArray(r.sources) ? (r.sources as unknown[]).map((s) => str(s, 30)).filter((s): s is string => !!s) : [],
    steps,
  };
}

/** `{homes: [...]}` checked; null when the shape is wrong. */
export function readClosed(j: unknown): ClosedHome[] | null {
  if (!j || typeof j !== "object" || !Array.isArray((j as { homes?: unknown }).homes)) return null;
  return ((j as { homes: unknown[] }).homes).map(readHome).filter((h): h is ClosedHome => !!h);
}

/** The review draft the agent sends themselves; text required. */
export function readReview(j: unknown): ReviewDraft | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  const text = str(r.text, 2000);
  if (!text) return null;
  const email = str(r.email, 200);
  return { text, email: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null, phone: str(r.phone, 40) };
}

/** What a step's button says; null when there is no button (auto, done and not undoable, or not ready). */
export function stepAction(s: ClosedStep): string | null {
  if (s.auto) return null;
  if (s.key === "results_wall") return s.done ? "Take it down" : "My client said yes";
  if (s.done || !s.ready) return null;
  return { goal: "Log it", past_clients: "Mark them", review: "Draft it", move_watch: null, off_sale: null }[s.key] ?? null;
}

/** POST body for a step. GCI only on goal, as a whole number of dollars; ok only on results_wall. */
export function stepBody(id: string, s: ClosedStep, gci?: string): Record<string, unknown> {
  if (s.key === "results_wall") return { id, step: "results_wall", ok: !s.done };
  const body: Record<string, unknown> = { id, step: s.key };
  if (s.key === "goal" && gci) {
    const n = Math.round(Number(gci.replace(/[$,\s]/g, "")));
    if (Number.isFinite(n) && n > 0) body.gci = n;
  }
  return body;
}

export const stepsLeft = (h: ClosedHome) => h.steps.filter((s) => !s.done && !s.auto && s.ready).length;

/** sms: and mailto: links for the agent's own phone or email (texts go from the agent's device, 8 Oct). */
export function reviewLinks(d: ReviewDraft, subject = "A quick favour"): { sms: string | null; mail: string | null } {
  const body = encodeURIComponent(d.text);
  const phone = d.phone ? d.phone.replace(/[^\d+]/g, "") : "";
  return {
    sms: phone ? `sms:${phone}?&body=${body}` : null,
    mail: d.email ? `mailto:${d.email}?subject=${encodeURIComponent(subject)}&body=${body}` : null,
  };
}

export const demoClosed = (): ClosedHome[] =>
  readClosed({
    homes: [
      {
        id: "demo-closed-1",
        title: "Closed: 418 Maple Ridge Dr",
        address: "418 Maple Ridge Dr, Draper, UT",
        closed_on: "2026-10-10",
        side: "seller",
        price: 685000,
        sources: ["marquee"],
        steps: [
          { key: "goal", label: "Log this closing toward your goal", done: false, auto: false, ready: true },
          { key: "past_clients", label: "Seller and buyer become past clients", done: false, auto: false, ready: true },
          { key: "review", label: "Ask for a review", done: false, auto: false, ready: false, note: "After you log it" },
          { key: "results_wall", label: "Add to your Results wall", done: false, auto: false, ready: true },
          { key: "move_watch", label: "On the Move-likely watch", done: true, auto: true, ready: true },
          { key: "off_sale", label: "Off the for-sale pages", done: true, auto: true, ready: true },
        ],
      },
    ],
  }) ?? [];
