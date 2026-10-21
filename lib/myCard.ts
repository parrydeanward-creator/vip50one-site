// My card in My Profile (QR-CARD.md §2.1; ONE MOVE vip50-web-crm#352, #356): the QR a person scans to swap contact info.
// GET /api/brain/card?e=<where> answers {ready, name, photo, brokerage, team, title, url, qr, events[]} or {ready:false, why, set_at}.

const MOVE_URL = "https://move.vip50one.com";
export const cardUrl = (event: string | null = null) => `${MOVE_URL}/api/brain/card${event ? `?e=${encodeURIComponent(event)}` : ""}`;

export type CardState =
  | { ready: true; name: string; photo: string | null; brokerage: string | null; team: string | null; title: string | null; url: string; qr: string; events: string[] }
  | { ready: false; why: string; setAt: string | null };

/** The three always-offered "Where are you?" chips; the agent's own recent tags come first. */
export const CARD_PLACES = ["Open house", "Event", "Other"];

const str = (v: unknown, max = 300) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const mine = (u: string | null) => {
  if (!u) return null;
  try {
    const x = new URL(u);
    return x.protocol === "https:" && x.hostname.endsWith("vip50one.com") ? x.href : null;
  } catch {
    return null;
  }
};
const anyHttps = (u: string | null) => {
  if (!u) return null;
  try {
    return new URL(u).protocol === "https:" ? u : null;
  } catch {
    return null;
  }
};

export function readCard(j: unknown): CardState | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (r.ready === false) return { ready: false, why: str(r.why, 300) ?? "Your card isn't ready yet.", setAt: mine(str(r.set_at, 300)) };
  if (r.ready !== true) return null;
  const name = str(r.name, 120), url = anyHttps(str(r.url, 400)), qr = anyHttps(str(r.qr, 400));
  if (!name || !url || !qr) return null;
  const events: string[] = [];
  for (const e of Array.isArray(r.events) ? r.events : []) {
    const t = str(e, 40);
    if (t && !events.includes(t)) events.push(t);
  }
  return { ready: true, name, photo: anyHttps(str(r.photo, 400)), brokerage: str(r.brokerage, 120), team: str(r.team, 120), title: str(r.title, 120), url, qr, events: events.slice(0, 6) };
}

/** The chips: the agent's own recent places, then Open house, Event and Other (no repeats, any case). */
export function placeChips(events: string[]): string[] {
  const out: string[] = [];
  for (const p of [...events, ...CARD_PLACES]) if (!out.some((o) => o.toLowerCase() === p.toLowerCase())) out.push(p);
  return out;
}
