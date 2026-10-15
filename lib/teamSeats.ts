import { MOVE_URL } from "./host.ts";

// TEAM-ONBOARDING §2 Add seat (vip50-web-crm#259, money: live when Parry merges it). Owner and admins only. A comped
// team sees nothing; a paid team sees its seats and an Add seat button that shows ONE MOVE's own confirm words and
// only then charges. A declined card (402) changes nothing.

export const seatsUrl = `${MOVE_URL}/api/brain/team/seats`;

export interface Seats { seats: number; used: number; free: number; priceWords: string; confirm: string }

/** GET's answer: the paid team's seats; null for a comped team (show nothing); undefined when not usable (hide). */
export function readSeats(ok: boolean, j: unknown): Seats | null | undefined {
  if (!ok || !j || typeof j !== "object") return undefined;
  const r = j as Record<string, unknown>;
  if (r.ok !== true) return undefined;
  if (r.comped === true) return null;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);
  const seats = n(r.seats), used = n(r.used);
  const priceWords = typeof r.price_words === "string" ? r.price_words.trim().slice(0, 80) : "";
  const confirm = typeof r.confirm === "string" ? r.confirm.trim().slice(0, 400) : "";
  if (seats === null || used === null || !priceWords || !confirm) return undefined;
  return { seats, used, free: n(r.free) ?? Math.max(0, seats - used), priceWords, confirm };
}

export function seatsLine(s: Seats): string {
  return `${s.used} of ${s.seats} in use, ${s.free ? `${s.free} free` : "none free"}. Another seat is ${s.priceWords}.`;
}

/** POST's answer in plain words. */
export function addSeatResult(status: number, j: unknown): { ok: boolean; line: string; seats?: number; used?: number } {
  const r = (j && typeof j === "object" ? j : {}) as Record<string, unknown>;
  if (status >= 200 && status < 300 && r.ok === true && typeof r.seats === "number")
    return { ok: true, line: `Seat added. You now have ${r.seats} seats.`, seats: r.seats, used: typeof r.used === "number" ? r.used : undefined };
  const said = typeof r.error === "string" && r.error.trim() ? r.error.trim().slice(0, 200) : null;
  if (status === 402) return { ok: false, line: said ?? "The card was declined. Nothing was changed." };
  return { ok: false, line: said ?? "That didn't go through. Nothing was changed." };
}
